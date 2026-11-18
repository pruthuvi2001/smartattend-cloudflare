/**
 * Collects keystrokes from a USB / Bluetooth QR scanner that works as a keyboard
 * ("keyboard wedge" / HID mode). The scanner types the QR text very quickly and
 * finishes with Enter (some models use Tab). This buffer gathers those characters
 * and hands back the full code once the terminating key arrives.
 *
 * It is kept free of React and DOM code so it can be unit tested.
 */

export interface KeyboardScanBufferOptions {
  /** Drop half-typed input if no key arrives within this many milliseconds. */
  idleResetMs?: number;
  /** Upper limit on buffered characters (guards against a stuck key). */
  maxLength?: number;
}

export type KeyboardScanResult =
  /** The key is not part of a scan; let the browser handle it normally. */
  | { type: "ignored" }
  /** The key was taken into the buffer; `value` is what has been read so far. */
  | { type: "buffered"; value: string }
  /** A terminating key arrived; `value` is the complete scanned code. */
  | { type: "submit"; value: string };

export interface KeyboardScanBuffer {
  handleKey(key: string, timestampMs: number): KeyboardScanResult;
  reset(): void;
  readonly value: string;
}

export const DEFAULT_SCAN_IDLE_RESET_MS = 1500;
export const DEFAULT_SCAN_MAX_LENGTH = 200;

export function createKeyboardScanBuffer(
  options: KeyboardScanBufferOptions = {}
): KeyboardScanBuffer {
  const idleResetMs = options.idleResetMs ?? DEFAULT_SCAN_IDLE_RESET_MS;
  const maxLength = options.maxLength ?? DEFAULT_SCAN_MAX_LENGTH;

  let buffer = "";
  let lastKeyAt = 0;

  return {
    handleKey(key: string, timestampMs: number): KeyboardScanResult {
      if (buffer && timestampMs - lastKeyAt > idleResetMs) {
        buffer = "";
      }
      lastKeyAt = timestampMs;

      if (key === "Enter" || key === "Tab") {
        const value = buffer.trim();
        buffer = "";
        // With nothing read, leave Enter/Tab to the page (buttons, focus moves).
        return value ? { type: "submit", value } : { type: "ignored" };
      }

      if (key === "Backspace") {
        if (!buffer) return { type: "ignored" };
        buffer = buffer.slice(0, -1);
        return { type: "buffered", value: buffer };
      }

      if (key === "Escape") {
        if (!buffer) return { type: "ignored" };
        buffer = "";
        return { type: "buffered", value: buffer };
      }

      // Shift, arrows, F-keys and other named keys are not characters.
      if (key.length !== 1) {
        return { type: "ignored" };
      }

      // A leading space is someone pressing Space on the page, not a scan.
      if (key === " " && !buffer) {
        return { type: "ignored" };
      }

      if (buffer.length < maxLength) {
        buffer += key;
      }
      return { type: "buffered", value: buffer };
    },

    reset() {
      buffer = "";
      lastKeyAt = 0;
    },

    get value() {
      return buffer;
    },
  };
}
