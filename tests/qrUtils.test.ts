import { describe, it, expect } from "vitest";
import { parseStudentQrPayload, validateQrPayload } from "../src/lib/utils/qrUtils";

describe("QR Code Parser Utility", () => {
  it("should extract raw alphanumeric student IDs correctly", () => {
    expect(parseStudentQrPayload("STU001")).toBe("STU001");
    expect(parseStudentQrPayload("STU-0001")).toBe("STU-0001");
    expect(parseStudentQrPayload("  STU999  ")).toBe("STU999");
  });

  it("should extract studentId from key-value strings", () => {
    expect(parseStudentQrPayload("studentId=STU001")).toBe("STU001");
    expect(parseStudentQrPayload("id:STU002")).toBe("STU002");
    expect(parseStudentQrPayload("qr=STU003")).toBe("STU003");
  });

  it("should extract student ID from URLs and query parameters", () => {
    expect(parseStudentQrPayload("https://school.edu/verify?studentId=STU005")).toBe("STU005");
    expect(parseStudentQrPayload("https://smartattend.edu/student/STU006")).toBe("STU006");
  });

  it("should parse JSON payload formats", () => {
    expect(parseStudentQrPayload('{"studentId":"STU007"}')).toBe("STU007");
    expect(parseStudentQrPayload('{"id":"STU008"}')).toBe("STU008");
  });

  it("should validate payloads properly", () => {
    expect(validateQrPayload("").valid).toBe(false);
    expect(validateQrPayload("STU001").valid).toBe(true);
  });
});
