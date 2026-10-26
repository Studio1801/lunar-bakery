import pg from "pg";
import { applyOp, type Op } from "@/lib/ops";
import { seed, type State } from "@/lib/store";
import { sheetLoad, sheetSave, sheetVersion, sheetsEnabled } from "./sheets";

/*
 * The shop's shared data, kept as one row in Postgres.
 * Each change locks the row, applies the change and saves, so two devices
 * changing things at the same moment can never overwrite each other.
 * The table is created the first time the site runs.
 */
let pool: pg.Pool | null = null;
let ready: Promise<void> | null = null;

// Neon on Vercel may name the address DATABASE_URL, POSTGRES_URL, or add a prefix such as
// STORAGE_DATABASE_URL. Accept any of them so connecting the database "just works".
function dbUrl(): string | undefined {
  const env = process.env;
  const direct = env["DATABASE_URL"] || env["POSTGRES_URL"];
  if (direct) return direct;
  const key = Object.keys(env).find((k) => /(^|_)(DATABASE_URL|POSTGRES_URL)$/.test(k) && /^postgres(ql)?:\/\//.test(env[k] || ""));
  return key ? env[key] : undefined;
}
const pgEnabled = () => !!dbUrl();
/** The Google Sheet is the database when SHEETS_URL and SHEETS_SECRET are set. Postgres is the fallback. */
export const dbEnabled = () => sheetsEnabled() || pgEnabled();

function getPool() {
  if (!pool) {
    const url = dbUrl()!;
    const local = /localhost|127\.0\.0\.1/.test(url);
    pool = new pg.Pool({ connectionString: url, max: 3, ssl: local || /sslmode=disable/.test(url) ? undefined : { rejectUnauthorized: false } });
  }
  return pool;
}
function setup() {
  if (!ready) ready = (async () => {
    const db = getPool();
    await db.query(`CREATE TABLE IF NOT EXISTS lunar_store (id int PRIMARY KEY, version bigint NOT NULL, state jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`);
    await db.query(`INSERT INTO lunar_store (id, version, state) VALUES (1, 1, $1) ON CONFLICT (id) DO NOTHING`, [JSON.stringify(seed())]);
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

export async function readStore(): Promise<{ state: State; version: number }> {
  if (sheetsEnabled()) return sheetRead();
  await setup();
  const r = await getPool().query(`SELECT version, state FROM lunar_store WHERE id = 1`);
  return { version: Number(r.rows[0].version), state: r.rows[0].state as State };
}
export async function readVersion(): Promise<number> {
  if (sheetsEnabled()) return sheetVersion();
  await setup();
  const r = await getPool().query(`SELECT version FROM lunar_store WHERE id = 1`);
  return Number(r.rows[0].version);
}
/** Lock the shop, apply one change, save. Two devices changing things at once never overwrite each other. */
export async function mutate(fn: (s: State) => { state: State } | { error: string }): Promise<{ state: State; version: number; error?: string }> {
  if (sheetsEnabled()) return sheetMutate(fn);
  await setup();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(`SELECT version, state FROM lunar_store WHERE id = 1 FOR UPDATE`);
    const cur = { version: Number(r.rows[0].version), state: r.rows[0].state as State };
    const res = fn(cur.state);
    if ("error" in res) { await client.query("ROLLBACK"); return { ...cur, error: res.error }; }
    if (res.state === cur.state) { await client.query("ROLLBACK"); return cur; }
    const version = cur.version + 1;
    await client.query(`UPDATE lunar_store SET version = $1, state = $2, updated_at = now() WHERE id = 1`, [version, JSON.stringify(res.state)]);
    await client.query("COMMIT");
    return { state: res.state, version };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
export const writeOp = (op: Op) => mutate((s) => applyOp(s, op));

// ---- Google Sheet backend ----
// Sheets calls take a second or two, and every open page polls. Reads are shared for a moment
// so a busy day does not hammer the sheet; writes always go through a fresh read.
let cache: { at: number; value: { state: State; version: number } } | null = null;
let inflight: Promise<{ state: State; version: number }> | null = null;
const FRESH = 1500;

async function sheetFetch(): Promise<{ state: State; version: number }> {
  const r = await sheetLoad();
  if (r.state && r.version > 0) return { state: r.state, version: r.version };
  // First run: put the starting shop into the sheet.
  const first = seed();
  const w = await sheetSave(0, first);
  if (w.ok) return { state: first, version: w.version };
  return sheetFetch();
}
async function sheetRead() {
  if (cache && Date.now() - cache.at < FRESH) return cache.value;
  inflight ??= sheetFetch().then((v) => { cache = { at: Date.now(), value: v }; return v; }).finally(() => { inflight = null; });
  return inflight;
}
async function sheetMutate(fn: (s: State) => { state: State } | { error: string }): Promise<{ state: State; version: number; error?: string }> {
  for (let tries = 0; tries < 5; tries++) {
    const cur = await sheetFetch();
    const res = fn(cur.state);
    if ("error" in res) return { ...cur, error: res.error };
    if (res.state === cur.state) return cur;
    const w = await sheetSave(cur.version, res.state);
    if (w.ok) { const value = { state: res.state, version: w.version }; cache = { at: Date.now(), value }; return value; }
    cache = null; // someone else saved first; read again and redo this change on top of theirs
  }
  throw new Error("The sheet stayed busy. Try again.");
}
