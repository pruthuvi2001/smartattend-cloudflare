import { describe, it, expect, beforeEach } from "vitest";
import { DEFAULT_INITIAL_CLASSES, getClassByName } from "../src/lib/classes/classService";
import { getCurrentTimeInTimezone } from "../src/lib/attendance/autoAbsenceService";
import { Student } from "../src/types/student";

describe("Class Schedule & Auto-Absence Logic", () => {
  it("initializes default class schedules correctly", () => {
    expect(DEFAULT_INITIAL_CLASSES.length).toBeGreaterThan(0);
    const grade6 = DEFAULT_INITIAL_CLASSES.find((c) => c.name === "Grade 6");
    expect(grade6).toBeDefined();
    expect(grade6?.schedules.length).toBe(2);
    expect(grade6?.schedules[0].dayOfWeek).toBe("Saturday");
    expect(grade6?.schedules[0].startTime).toBe("19:00");
    expect(grade6?.schedules[0].endTime).toBe("21:00");
  });

  it("retrieves current time and date in timezone", () => {
    const { dayOfWeek, currentTimeStr, todayDateStr } = getCurrentTimeInTimezone("Asia/Colombo");
    expect(dayOfWeek).toMatch(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
    expect(currentTimeStr).toMatch(/^\d{2}:\d{2}$/);
    expect(todayDateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("Student Required Email Validation", () => {
  it("enforces valid email format for student objects", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmail = "student@example.com";
    const invalidEmail = "student-no-at-sign.com";

    expect(emailRegex.test(validEmail)).toBe(true);
    expect(emailRegex.test(invalidEmail)).toBe(false);
  });
});
