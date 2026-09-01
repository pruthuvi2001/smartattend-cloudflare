import { describe, it, expect } from "vitest";
import { getNormalizedDate, formatDisplayDate, format12HourTime } from "../src/lib/utils/dateUtils";

describe("Date & Timezone Utilities", () => {
  it("should normalize dates to YYYY-MM-DD in Asia/Colombo timezone", () => {
    // 2026-09-01T03:00:00Z -> in Asia/Colombo (UTC+5:30) is 2026-09-01
    const testDate = new Date("2026-09-01T03:00:00Z");
    const normalized = getNormalizedDate(testDate, "Asia/Colombo");
    expect(normalized).toBe("2026-09-01");
  });

  it("should format display dates into readable string", () => {
    const formatted = formatDisplayDate("2026-09-01", "Asia/Colombo");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("Sep");
  });

  it("should format 12-hour time with AM/PM indicator", () => {
    const morningDate = new Date("2026-09-01T03:02:00Z"); // 08:32 AM in Colombo
    const formatted = format12HourTime(morningDate, "Asia/Colombo");
    expect(formatted).toMatch(/(AM|PM)/);
  });
});
