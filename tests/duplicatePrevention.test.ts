import { describe, it, expect } from "vitest";

describe("Atomic Duplicate Attendance Prevention Strategy", () => {
  it("should construct deterministic unique document IDs per student per date", () => {
    const studentId = "STU001";
    const date = "2026-09-01";
    const docId = `${studentId.toUpperCase()}_${date}`;

    expect(docId).toBe("STU001_2026-09-01");

    // Repeating scan on same date produces exact same key
    const repeatedDocId = `${studentId.toUpperCase()}_${date}`;
    expect(repeatedDocId).toBe(docId);
  });
});
