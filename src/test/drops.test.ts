import { describe, expect, it } from "vitest";
import { cleanDrops, seed } from "@/lib/store";
import { applyOp, isOp } from "@/lib/ops";
import { publicView } from "@/lib/shop";

describe("drops", () => {
  const d = (id: string, date: string, extra = {}) => ({ id, date, place: " Ferry Building ", ...extra });
  it("sorts, trims and drops junk", () => {
    const out = cleanDrops([d("b", "2026-11-02"), d("a", "2026-10-30"), d("a", "2026-12-01"), { id: "x", date: "nope", place: "" }]);
    expect(out.map((x) => x.id)).toEqual(["a", "b"]);
    expect(out[0]!.place).toBe("Ferry Building");
  });
  it("drops an inverted time window", () => {
    expect(cleanDrops([d("a", "2026-10-30", { from: 900, to: 600 })])[0]!.from).toBeUndefined();
  });
  it("applies, validates and reaches the public view", () => {
    const op = { t: "drops" as const, drops: [d("a", "2026-10-30")] };
    expect(isOp(op)).toBe(true);
    expect(isOp({ t: "drops", drops: "x" })).toBe(false);
    const r = applyOp(seed(true), op);
    if ("error" in r) throw new Error(r.error);
    expect(publicView(r.state).drops).toHaveLength(1);
  });
});
