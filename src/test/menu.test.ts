import { describe, expect, it } from "vitest";
import { applyOp, isOp } from "@/lib/ops";
import { DEFAULT_MENU, seed } from "@/lib/store";
import { publicView } from "@/lib/shop";

describe("seasonal menu", () => {
  it("shows the default menu until the bakery changes it", () => {
    const v = publicView(seed());
    expect(v.season).toBe("summer");
    expect(v.menu.summer[0]?.name).toBe("Pastel de Nata");
  });
  it("saves a changed season and reaches the public view", () => {
    const menu = { ...DEFAULT_MENU, fall: [{ id: "a", name: "Pumpkin Kouign", price: "$9" }] };
    const op = { t: "menu" as const, menu, season: "fall" as const };
    expect(isOp(op)).toBe(true);
    const r = applyOp(seed(), op);
    if ("error" in r) throw new Error(r.error);
    const v = publicView(r.state);
    expect(v.season).toBe("fall");
    expect(v.menu.fall).toHaveLength(1);
    expect(v.menu.summer).toHaveLength(4);
  });
  it("rejects a malformed menu", () => {
    expect(isOp({ t: "menu", menu: { spring: [] }, season: "fall" })).toBe(false);
    expect(isOp({ t: "menu", menu: DEFAULT_MENU, season: "monsoon" })).toBe(false);
  });
});
