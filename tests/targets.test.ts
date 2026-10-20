import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../src/lib/db/types";
import { addBodyMeasurement } from "../src/lib/repo/body";
import { addPractice } from "../src/lib/repo/practice";
import { upsertProfile } from "../src/lib/repo/profile";
import { getTargetsForDate } from "../src/lib/services/targets";
import { createTestDb, createTestUser } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(async () => close());

const m = { weightKg: null, bodyFatPct: null, bodyFatMethod: null, waistCm: null, neckCm: null, chestCm: null, hipCm: null, thighCm: null, calfCm: null, note: null };

describe("getTargetsForDate", () => {
  it("体重がなければ算出せず、不足項目を返す", async () => {
    const u = await createTestUser(db, "t1");
    await upsertProfile(db, u.id, { heightCm: 175, birthDate: "2006-01-01", sex: "male" });
    const r = await getTargetsForDate(db, u.id, "2026-10-20");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("体重");
  });

  it("予定の練習日（曜日）と記録された練習を区別", async () => {
    const u = await createTestUser(db, "t2");
    // 2026-10-20 は火曜日(2)
    await upsertProfile(db, u.id, {
      heightCm: 175, birthDate: "2006-01-01", sex: "male", dailyActivity: "normal",
      practiceDays: [2], practiceMinutes: 120, practiceIntensity: "moderate",
    });
    await addBodyMeasurement(db, u.id, { ...m, date: "2026-10-19", weightKg: 70 });
    const planned = await getTargetsForDate(db, u.id, "2026-10-20");
    expect(planned.ok && planned.plan.basis).toBe("planned");
    const rest = await getTargetsForDate(db, u.id, "2026-10-21");
    expect(rest.ok && rest.plan.basis).toBe("rest");
    if (planned.ok && rest.ok) expect(planned.targets.energyKcal.min).toBeGreaterThan(rest.targets.energyKcal.min);

    await addPractice(db, u.id, {
      date: "2026-10-20", startTime: null, durationMin: 180, intensity: "high", rpe: 8, jumpCount: null,
      spikeCount: null, performance: null, fatigue: null, note: null,
    });
    const logged = await getTargetsForDate(db, u.id, "2026-10-20");
    expect(logged.ok && logged.plan.basis).toBe("logged");
    expect(logged.ok && logged.plan.blocks).toEqual([{ kind: "volleyball", intensity: "high", minutes: 180 }]);
  });

  it("90日以内に計測した体脂肪率があれば除脂肪量ベース、古ければ使わない", async () => {
    const u = await createTestUser(db, "t3");
    await upsertProfile(db, u.id, { heightCm: 175, birthDate: "2000-01-01" });
    await addBodyMeasurement(db, u.id, { ...m, date: "2026-10-01", weightKg: 70, bodyFatPct: 15, bodyFatMethod: "bia_scale" });
    const r = await getTargetsForDate(db, u.id, "2026-10-20");
    expect(r.ok && r.bmr.method).toBe("jiss_ffm");
    const later = await getTargetsForDate(db, u.id, "2027-03-01");
    expect(later.ok && later.bmr.method).toBe("mifflin");
    expect(later.ok && later.warnings.map((w) => w.code)).toContain("bodyfat_old");
  });
});
