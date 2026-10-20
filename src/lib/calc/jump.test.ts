import { describe, expect, it } from "vitest";
import { jumpHeightFromReach, type ReachRecord } from "./jump";

const standing: ReachRecord = { date: "2026-09-01", valueCm: 230, measurementType: "measured", footwear: "shoes" };

describe("jumpHeightFromReach", () => {
  it("両方実測・同条件なら差を算出", () => {
    const r = jumpHeightFromReach({ date: "2026-10-01", valueCm: 300, measurementType: "measured", footwear: "shoes" }, [standing]);
    expect(r).toEqual({ ok: true, heightCm: 70, standingReachDate: "2026-09-01", warnings: [] });
  });
  it("自己申告の最高到達点からは算出しない", () => {
    const r = jumpHeightFromReach({ date: "2026-10-01", valueCm: 300, measurementType: "self_reported", footwear: "shoes" }, [standing]);
    expect(r.ok).toBe(false);
  });
  it("実測の立位指高がなければ算出しない", () => {
    const r = jumpHeightFromReach({ date: "2026-10-01", valueCm: 300, measurementType: "measured", footwear: "shoes" }, [
      { ...standing, measurementType: "estimated" },
    ]);
    expect(r.ok).toBe(false);
  });
  it("後日の立位指高は使わない", () => {
    const r = jumpHeightFromReach({ date: "2026-08-01", valueCm: 300, measurementType: "measured", footwear: "shoes" }, [standing]);
    expect(r.ok).toBe(false);
  });
  it("靴の条件が異なる場合は警告", () => {
    const r = jumpHeightFromReach({ date: "2026-10-01", valueCm: 300, measurementType: "measured", footwear: "barefoot" }, [standing]);
    expect(r.ok && r.warnings.map((w) => w.code)).toEqual(["footwear_mismatch"]);
  });
  it("立位指高が古い場合は警告", () => {
    const r = jumpHeightFromReach({ date: "2027-04-01", valueCm: 300, measurementType: "measured", footwear: "shoes" }, [standing]);
    expect(r.ok && r.warnings.map((w) => w.code)).toEqual(["standing_reach_old"]);
  });
  it("最高到達点が立位指高以下なら算出しない", () => {
    const r = jumpHeightFromReach({ date: "2026-10-01", valueCm: 230, measurementType: "measured", footwear: "shoes" }, [standing]);
    expect(r.ok).toBe(false);
  });
});
