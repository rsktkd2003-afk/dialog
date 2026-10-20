import { describe, expect, it } from "vitest";
import { pairNearest, pairWithOffset, sumByDate } from "./pairing";

describe("pairing", () => {
  it("最も近い日付で対応付け、範囲外は除外", () => {
    const xs = [{ date: "2026-10-01", value: 70 }, { date: "2026-10-05", value: 71 }];
    const ys = [{ date: "2026-10-04", value: 320 }, { date: "2026-10-20", value: 322 }];
    expect(pairNearest(xs, ys, 3)).toEqual([{ x: 71, y: 320, date: "2026-10-04" }]);
  });
  it("before は過去の記録のみ", () => {
    const xs = [{ date: "2026-10-05", value: 100 }];
    const ys = [{ date: "2026-10-04", value: 320 }];
    expect(pairNearest(xs, ys, 14, "before")).toEqual([]);
  });
  it("翌日の値と対応付け", () => {
    const xs = [{ date: "2026-10-31", value: 800 }];
    const ys = [{ date: "2026-11-01", value: 4 }];
    expect(pairWithOffset(xs, ys, 1)).toEqual([{ x: 800, y: 4, date: "2026-10-31" }]);
  });
  it("日別合計", () => {
    expect(sumByDate([{ date: "2026-10-02", value: 1 }, { date: "2026-10-01", value: 2 }, { date: "2026-10-02", value: 3 }])).toEqual([
      { date: "2026-10-01", value: 2 },
      { date: "2026-10-02", value: 4 },
    ]);
  });
});

describe("maxByDate", () => {
  it("同日の最大値", async () => {
    const { maxByDate } = await import("./pairing");
    expect(maxByDate([{ date: "2026-10-21", value: 315 }, { date: "2026-10-21", value: 318 }, { date: "2026-10-01", value: 310 }])).toEqual([
      { date: "2026-10-01", value: 310 },
      { date: "2026-10-21", value: 318 },
    ]);
  });
});
