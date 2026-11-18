"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScanQrCode, Keyboard, RefreshCw, MousePointerClick, PauseCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { parseStudentQrPayload } from "@/lib/utils/qrUtils";
import { createKeyboardScanBuffer } from "@/lib/utils/keyboardScanBuffer";

export interface UsbQrScannerProps {
  /** Called with the parsed student ID for every completed scan. */
  onScan: (qrData: string) => void;
  /** True while earlier scans are still being saved. Scans are still accepted. */
  isProcessing: boolean;
  /** Set to false while another dialog on the page needs the keyboard. */
  enabled?: boolean;
}

const NON_TEXT_INPUT_TYPES = [
  "button",
  "submit",
  "reset",
  "checkbox",
  "radio",
  "file",
  "image",
  "range",
  "color",
];

function isTextEntryElement(el: EventTarget | Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  if (el.tagName === "INPUT") {
    return !NON_TEXT_INPUT_TYPES.includes((el as HTMLInputElement).type);
  }
  return false;
}

type ScannerStatus = "ready" | "processing" | "window-unfocused" | "text-field" | "paused";

/**
 * Attendance input for a USB / Bluetooth QR scanner that types like a keyboard.
 * It listens to the whole page, so staff never need to click a box before scanning:
 * the scanner types the code, presses Enter, and attendance is recorded.
 */
export const UsbQrScanner: React.FC<UsbQrScannerProps> = ({
  onScan,
  isProcessing,
  enabled = true,
}) => {
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [liveInput, setLiveInput] = useState("");
  const [windowFocused, setWindowFocused] = useState(true);
  const [textFieldFocused, setTextFieldFocused] = useState(false);

  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const bufferRef = useRef(createKeyboardScanBuffer());

  const listening = enabled && !manualModalOpen;

  // Every completed scan is sent on; repeats are handled by the attendance
  // service, which reports "already marked" without writing a second record.
  const submitScannedCode = useCallback((raw: string) => {
    const studentId = parseStudentQrPayload(raw);
    if (studentId) onScanRef.current(studentId);
  }, []);

  const clearLiveInput = useCallback(() => {
    bufferRef.current.reset();
    setLiveInput("");
  }, []);

  // Page-wide keyboard listener that collects the scanner's keystrokes.
  // No timeout: input is kept until Enter/Tab submits it or Escape clears it.
  useEffect(() => {
    const buffer = bufferRef.current;

    if (!listening) {
      clearLiveInput();
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if ((e.ctrlKey || e.metaKey || e.altKey) && !e.getModifierState("AltGraph")) return;
      // Someone is typing into a real text box: leave it alone.
      if (isTextEntryElement(e.target)) return;

      const result = buffer.handleKey(e.key);
      if (result.type === "ignored") return;

      // Stop Enter/Space from also pressing whichever button has focus.
      e.preventDefault();

      if (result.type === "submit") {
        setLiveInput("");
        submitScannedCode(result.value);
      } else {
        setLiveInput(result.value);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [listening, submitScannedCode, clearLiveInput]);

  // Track whether keystrokes can reach this page at all.
  useEffect(() => {
    const update = () => {
      setWindowFocused(document.hasFocus());
      setTextFieldFocused(isTextEntryElement(document.activeElement));
    };
    const updateAfterFocusMoves = () => setTimeout(update, 0);

    update();
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", updateAfterFocusMoves);
    return () => {
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", updateAfterFocusMoves);
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setManualModalOpen(false);
    const val = parseStudentQrPayload(manualInput.trim());
    setManualInput("");
    if (val) onScanRef.current(val);
  };

  const activateScanner = () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && isTextEntryElement(active)) {
      active.blur();
    }
    window.focus();
  };

  let status: ScannerStatus;
  if (!listening) status = "paused";
  else if (!windowFocused) status = "window-unfocused";
  else if (textFieldFocused) status = "text-field";
  else if (isProcessing) status = "processing";
  else status = "ready";

  const statusView: Record<
    ScannerStatus,
    { dot: string; ring: string; icon: React.ReactNode; title: string; detail: string }
  > = {
    ready: {
      dot: "bg-emerald-500 animate-pulse",
      ring: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
      icon: <ScanQrCode className="w-14 h-14" />,
      title: "Ready to scan",
      detail: "Scan a student ID card with the QR scanner. Attendance is saved automatically.",
    },
    processing: {
      dot: "bg-indigo-400 animate-pulse",
      ring: "border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
      icon: <RefreshCw className="w-14 h-14 animate-spin" />,
      title: "Saving attendance...",
      detail: "You can keep scanning. The next cards are queued.",
    },
    "window-unfocused": {
      dot: "bg-amber-400",
      ring: "border-amber-500/40 bg-amber-500/10 text-amber-300",
      icon: <MousePointerClick className="w-14 h-14" />,
      title: "Click this page to start scanning",
      detail: "The scanner types into whichever window is active. Click anywhere here first.",
    },
    "text-field": {
      dot: "bg-amber-400",
      ring: "border-amber-500/40 bg-amber-500/10 text-amber-300",
      icon: <MousePointerClick className="w-14 h-14" />,
      title: "A text box is selected",
      detail: "Scans would go into that box. Click here to send scans to attendance instead.",
    },
    paused: {
      dot: "bg-slate-500",
      ring: "border-slate-600 bg-slate-800 text-slate-400",
      icon: <PauseCircle className="w-14 h-14" />,
      title: "Scanner paused",
      detail: "Close the open dialog to resume scanning.",
    },
  };
  const view = statusView[status];
  const needsClick = status === "window-unfocused" || status === "text-field";

  return (
    <div className="glass-dark bg-slate-900 text-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-800 relative overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${view.dot}`} />
          <h3 className="font-bold text-sm text-slate-100 tracking-wide flex items-center gap-1.5">
            <ScanQrCode className="w-4 h-4 text-indigo-400" /> QR Scanner
          </h3>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setManualModalOpen(true)}
          className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs py-1 px-2.5 h-8"
          leftIcon={<Keyboard className="w-3.5 h-3.5" />}
        >
          Manual ID
        </Button>
      </div>

      {/* Status area */}
      <div
        className={`my-4 rounded-2xl border-2 border-slate-800 bg-black/40 px-6 py-10 flex flex-col items-center justify-center text-center gap-4 ${
          needsClick ? "cursor-pointer hover:border-amber-500/40" : ""
        }`}
        onClick={needsClick ? activateScanner : undefined}
        role={needsClick ? "button" : undefined}
        aria-live="polite"
      >
        <div
          className={`w-28 h-28 rounded-full border-2 flex items-center justify-center ${view.ring}`}
        >
          {view.icon}
        </div>
        <div className="space-y-1.5">
          <h4 className="font-bold text-lg text-white">{view.title}</h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">{view.detail}</p>
        </div>

        <div className="w-full max-w-xs flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-left min-h-[2.25rem]">
          {liveInput ? (
            <>
              <span className="flex-1 truncate text-indigo-300">{liveInput}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearLiveInput();
                }}
                title="Clear (Esc)"
                className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <span className="text-slate-600">Waiting for scan...</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2 text-xs text-slate-400 border-t border-slate-800">
        <p className="text-center sm:text-left">
          No need to click anything between students. If the scanner fails, use Manual ID.
        </p>
      </div>

      {/* Manual Input Modal */}
      <Modal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        title="Manual Student ID Lookup"
        description="Type or paste the student ID (e.g. STU001) if the QR code will not scan."
      >
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <Input
            label="Student ID or QR Code String"
            placeholder="e.g. STU001"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            autoFocus
            required
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setManualModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Record Attendance
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
