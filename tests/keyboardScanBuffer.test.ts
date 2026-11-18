import { describe, it, expect } from "vitest";
import { createKeyboardScanBuffer } from "../src/lib/utils/keyboardScanBuffer";

/** Feed keys to the buffer the way a USB scanner does. */
function typeKeys(buffer: ReturnType<typeof createKeyboardScanBuffer>, keys: string[]) {
  return keys.map((key) => buffer.handleKey(key));
}

const chars = (s: string) => s.split("");

describe("Keyboard (USB) QR scanner buffer", () => {
  it("returns the full code when the scanner presses Enter", () => {
    const buffer = createKeyboardScanBuffer();
    const results = typeKeys(buffer, [...chars("STU001"), "Enter"]);
    expect(results.at(-1)).toEqual({ type: "submit", value: "STU001" });
    expect(buffer.value).toBe("");
  });

  it("also accepts Tab as the end-of-scan key", () => {
    const buffer = createKeyboardScanBuffer();
    const results = typeKeys(buffer, [...chars("STU002"), "Tab"]);
    expect(results.at(-1)).toEqual({ type: "submit", value: "STU002" });
  });

  it("keeps uppercase letters and symbols, ignoring the Shift key itself", () => {
    const buffer = createKeyboardScanBuffer();
    const results = typeKeys(buffer, ["Shift", "{", "\"", "i", "d", "\"", ":", "\"", "Shift", "S", "1", "\"", "}", "Enter"]);
    expect(results[0]).toEqual({ type: "ignored" });
    expect(results.at(-1)).toEqual({ type: "submit", value: '{"id":"S1"}' });
  });

  it("reads several cards in a row, including the same card twice", () => {
    const buffer = createKeyboardScanBuffer();
    const first = typeKeys(buffer, [...chars("STU001"), "Enter"]);
    const second = typeKeys(buffer, [...chars("STU002"), "Enter"]);
    const repeat = typeKeys(buffer, [...chars("STU002"), "Enter"]);
    expect(first.at(-1)).toEqual({ type: "submit", value: "STU001" });
    expect(second.at(-1)).toEqual({ type: "submit", value: "STU002" });
    expect(repeat.at(-1)).toEqual({ type: "submit", value: "STU002" });
  });

  it("has no time limit: input is kept until Enter, however long it takes", () => {
    const buffer = createKeyboardScanBuffer();
    typeKeys(buffer, chars("STU"));
    // Nothing time-based exists, so a long pause cannot drop "STU".
    typeKeys(buffer, chars("004"));
    expect(buffer.handleKey("Enter")).toEqual({ type: "submit", value: "STU004" });
  });

  it("leaves Enter and Tab alone when nothing was scanned", () => {
    const buffer = createKeyboardScanBuffer();
    expect(buffer.handleKey("Enter")).toEqual({ type: "ignored" });
    expect(buffer.handleKey("Tab")).toEqual({ type: "ignored" });
  });

  it("ignores a leading space (someone pressing Space on the page)", () => {
    const buffer = createKeyboardScanBuffer();
    expect(buffer.handleKey(" ")).toEqual({ type: "ignored" });
    expect(buffer.value).toBe("");
  });

  it("supports Backspace, Escape and reset to fix or clear input", () => {
    const buffer = createKeyboardScanBuffer();
    typeKeys(buffer, [...chars("STU0099"), "Backspace"]);
    expect(buffer.value).toBe("STU009");
    buffer.handleKey("Escape");
    expect(buffer.value).toBe("");
    expect(buffer.handleKey("Backspace")).toEqual({ type: "ignored" });
    typeKeys(buffer, chars("XX"));
    buffer.reset();
    expect(buffer.value).toBe("");
  });

  it("caps the buffer length to guard against a stuck key", () => {
    const buffer = createKeyboardScanBuffer({ maxLength: 5 });
    typeKeys(buffer, chars("ABCDEFGHIJ"));
    expect(buffer.value).toBe("ABCDE");
  });
});
