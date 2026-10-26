/*
 * Talks to the Google Sheet through the Apps Script in /apps-script/Code.gs.
 * The sheet keeps the whole shop as one versioned document (the State tab) and
 * rebuilds readable Orders, Products, Menu, Closed, Days and Messages tabs on each save.
 */
import type { State } from "@/lib/store";

const url = () => process.env["SHEETS_URL"];
const secret = () => process.env["SHEETS_SECRET"];
export const sheetsEnabled = () => !!(url() && secret());

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url()!, {
    method: "POST",
    headers: { "content-type": "text/plain" }, // plain text avoids a CORS preflight style rejection
    body: JSON.stringify({ key: secret(), ...body }),
    redirect: "follow",
  });
  const text = await res.text();
  let data: T & { error?: string };
  try { data = JSON.parse(text); } catch { throw new Error(`Sheet answered with something unreadable (${res.status})`); }
  if (data.error) throw new Error(`Sheet: ${data.error}`);
  return data;
}

export const sheetLoad = () => call<{ version: number; state: State | null }>({ action: "load" });
export const sheetVersion = async () => (await call<{ version: number }>({ action: "version" })).version;
export const sheetSave = (expected: number, state: State) =>
  call<{ ok?: boolean; conflict?: boolean; version: number }>({ action: "save", expected, state });
