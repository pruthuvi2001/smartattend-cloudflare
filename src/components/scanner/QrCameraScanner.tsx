"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  RefreshCw,
  Volume2,
  VolumeX,
  AlertCircle,
  Keyboard,
  ShieldAlert,
  Sparkles,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { playSuccessBeep, playDuplicateBeep, playErrorBeep } from "@/lib/utils/soundEffects";
import { parseStudentQrPayload } from "@/lib/utils/qrUtils";

export interface QrCameraScannerProps {
  onScan: (qrData: string) => Promise<void>;
  isProcessing: boolean;
}

export const QrCameraScanner: React.FC<QrCameraScannerProps> = ({ onScan, isProcessing }) => {
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [manualModalOpen, setManualModalOpen] = useState<boolean>(false);
  const [manualInput, setManualInput] = useState<string>("");

  const scannerRef = useRef<any>(null);
  const isScanningRef = useRef<boolean>(false);
  const lastScannedQr = useRef<{ text: string; time: number }>({ text: "", time: 0 });

  // Initialize Html5Qrcode
  const startCamera = useCallback(async (cameraId?: string) => {
    try {
      setCameraError(null);
      setPermissionDenied(false);

      const { Html5Qrcode } = await import("html5-qrcode");

      if (scannerRef.current) {
        try {
          if (isScanningRef.current) {
            await scannerRef.current.stop();
            isScanningRef.current = false;
          }
        } catch (e) {
          console.debug("Stopping previous scanner instance:", e);
        }
      }

      // Check available cameras
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError("No video input camera found on this device.");
        return;
      }

      setCameras(devices.map((d) => ({ id: d.id, label: d.label || `Camera ${d.id}` })));

      const targetCameraId = cameraId || devices[devices.length - 1].id; // Prefer rear/back camera
      setSelectedCameraId(targetCameraId);

      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        targetCameraId,
        config,
        async (decodedText: string) => {
          // Debounce same QR within 5 seconds to prevent spamming
          const now = Date.now();
          if (
            lastScannedQr.current.text === decodedText &&
            now - lastScannedQr.current.time < 5000
          ) {
            return;
          }

          lastScannedQr.current = { text: decodedText, time: now };
          const studentId = parseStudentQrPayload(decodedText);
          await onScan(studentId);
        },
        () => {
          // Frame callback - quiet
        }
      );

      isScanningRef.current = true;
    } catch (err: any) {
      console.error("Camera start error:", err);
      const errMsg = err?.message || String(err);
      if (errMsg.includes("NotAllowedError") || errMsg.includes("Permission denied")) {
        setPermissionDenied(true);
        setCameraError("Camera permission was denied. Please allow camera access in your browser settings.");
      } else {
        setCameraError("Could not access device camera. Please verify camera permissions and connection.");
      }
    }
  }, [onScan]);

  useEffect(() => {
    startCamera();

    return () => {
      if (scannerRef.current && isScanningRef.current) {
        scannerRef.current
          .stop()
          .catch((e: any) => console.debug("Scanner cleanup error:", e));
        isScanningRef.current = false;
      }
    };
  }, [startCamera]);

  const handleCameraSwitch = async (newCameraId: string) => {
    setSelectedCameraId(newCameraId);
    await startCamera(newCameraId);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setManualModalOpen(false);
    const val = parseStudentQrPayload(manualInput.trim());
    setManualInput("");
    await onScan(val);
  };

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-800 relative overflow-hidden">
      {/* Scanner Top Toolbar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-bold text-sm text-slate-100 tracking-wide flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-indigo-400" /> Live QR Viewfinder
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Sound enabled" : "Sound muted"}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

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
      </div>

      {/* Viewport Area */}
      <div className="relative my-4 aspect-square max-w-md mx-auto rounded-2xl overflow-hidden bg-black flex items-center justify-center border-2 border-slate-800 shadow-inner">
        {/* Html5Qrcode video target container */}
        <div id="reader" className="w-full h-full scanner-container" />

        {/* Viewfinder Target Box Overlay */}
        {!cameraError && !permissionDenied && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
            <div className="relative w-64 h-64 border-2 border-indigo-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />

              {/* Animated Laser Scanning Line */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_8px_#818cf8] animate-scan" />
            </div>
          </div>
        )}

        {/* Processing Spinner Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
            <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
            <p className="text-sm font-bold text-white tracking-wide">Looking up student record...</p>
          </div>
        )}

        {/* Camera Error / Permission Fallback */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-950 p-6 flex flex-col items-center justify-center text-center gap-3 z-10">
            <ShieldAlert className="w-12 h-12 text-rose-500" />
            <h4 className="font-bold text-base text-white">Camera Access Required</h4>
            <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>

            <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => startCamera(selectedCameraId)}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Retry Camera
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-800 border-slate-700 text-slate-200"
                onClick={() => setManualModalOpen(true)}
                leftIcon={<Keyboard className="w-3.5 h-3.5" />}
              >
                Enter Student ID Manually
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Scanner Footer: Camera Selection & Instruction */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400 border-t border-slate-800">
        <p className="text-center sm:text-left">
          Align the student ID QR code inside the viewfinder area.
        </p>

        {cameras.length > 1 && (
          <div className="flex items-center gap-2">
            <span>Camera:</span>
            <select
              value={selectedCameraId}
              onChange={(e) => handleCameraSwitch(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs rounded-lg border border-slate-700 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Manual Input Modal */}
      <Modal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        title="Manual Student ID Lookup"
        description="Type or paste the student ID (e.g. STU001) if camera scanning is unavailable."
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setManualModalOpen(false)}
            >
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