import { describe, it, expect } from "vitest";
import { createKeyboardScanBuffer } from "../src/lib/utils/keyboardScanBuffer";

/** Feed keys to the buffer the way a USB scanner does: a few ms apart. */
function typeKeys(
  buffer: ReturnType<typeof createKeyboardScanBuffer>,
  keys: string[],
  startMs = 1000,
  gapMs = 5
) {
  return keys.map((key, i) => buffer.handleKey(key, startMs + i * gapMs));
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

  it("reads several cards in a row", () => {
    const buffer = createKeyboardScanBuffer();
    const first = typeKeys(buffer, [...chars("STU001"), "Enter"], 1000);
    const second = typeKeys(buffer, [...chars("STU002"), "Enter"], 1200);
    expect(first.at(-1)).toEqual({ type: "submit", value: "STU001" });
    expect(second.at(-1)).toEqual({ type: "submit", value: "STU002" });
  });

  it("leaves Enter and Tab alone when nothing was scanned", () => {
    const buffer = createKeyboardScanBuffer();
    expect(buffer.handleKey("Enter", 1000)).toEqual({ type: "ignored" });
    expect(buffer.handleKey("Tab", 1010)).toEqual({ type: "ignored" });
  });

  it("ignores a leading space (someone pressing Space on the page)", () => {
    const buffer = createKeyboardScanBuffer();
    expect(buffer.handleKey(" ", 1000)).toEqual({ type: "ignored" });
    expect(buffer.value).toBe("");
  });

  it("drops a half-read code after the idle timeout", () => {
    const buffer = createKeyboardScanBuffer({ idleResetMs: 500 });
    typeKeys(buffer, chars("XX"), 1000);
    const results = typeKeys(buffer, [...chars("STU003"), "Enter"], 3000);
    expect(results.at(-1)).toEqual({ type: "submit", value: "STU003" });
  });

  it("supports Backspace and Escape for hand typing", () => {
    const buffer = createKeyboardScanBuffer();
    typeKeys(buffer, [...chars("STU0099"), "Backspace"]);
    expect(buffer.value).toBe("STU009");
    buffer.handleKey("Escape", 1100);
    expect(buffer.value).toBe("");
    expect(buffer.handleKey("Backspace", 1110)).toEqual({ type: "ignored" });
  });

  it("caps the buffer length to guard against a stuck key", () => {
    const buffer = createKeyboardScanBuffer({ maxLength: 5 });
    typeKeys(buffer, chars("ABCDEFGHIJ"));
    expect(buffer.value).toBe("ABCDE");
  });
});
