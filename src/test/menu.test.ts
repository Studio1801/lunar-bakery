import { describe, expect, it } from "vitest";
import { applyOp, isOp } from "@/lib/ops";
import { fromLine, inSeason, seasonNow, seed } from "@/lib/store";

describe("products by season", () => {
  it("offers a product all year until seasons are set", () => {
    const p = seed(true).products[0]!;
    expect(inSeason(p, "winter")).toBe(true);
    expect(fromLine(p)).toBe("6 for $30");
  });
  it("saves seasons and filters", () => {
    const s = seed(true);
    const products = s.products.map((p, i) => (i === 0 ? { ...p, seasons: ["fall" as const] } : p));
    const op = { t: "products" as const, products };
    expect(isOp(op)).toBe(true);
    const r = applyOp(s, op);
    if ("error" in r) throw new Error(r.error);
    expect(inSeason(r.state.products[0]!, "fall")).toBe(true);
    expect(inSeason(r.state.products[0]!, "summer")).toBe(false);
  });
  it("starts the real shop with no made-up orders", () => {
    expect(seed(true).orders).toHaveLength(0);
    expect(seasonNow(new Date(2026, 9, 26))).toBe("fall");
  });
});
