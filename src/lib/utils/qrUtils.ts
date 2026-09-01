/**
 * Sanitizes and extracts the primary student identifier from arbitrary QR string payloads.
 * Supports:
 * - Plain IDs: "STU001", "STU-001", "2026-STU-01"
 * - URL parameters: "https://school.edu/student?id=STU001", "https://school.edu/verify/STU001"
 * - Key-value strings: "studentId=STU001", "id=STU001", "qr=STU001"
 * - JSON strings: '{"studentId":"STU001"}'
 */
export function parseStudentQrPayload(rawQrData: string): string {
  if (!rawQrData || typeof rawQrData !== 'string') {
    return '';
  }

  let cleaned = rawQrData.trim();

  // 1. Check if JSON
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.STD_ID) return String(parsed.STD_ID).trim();
      if (parsed.std_ID) return String(parsed.std_ID).trim(); 
      if (parsed.studentId) return String(parsed.studentId).trim();
      if (parsed.id) return String(parsed.id).trim();
      if (parsed.qrCodeValue) return String(parsed.qrCodeValue).trim();
    } catch {
      // Continue to regex patterns
    }
  }

  // 2. Check if full URL
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      const url = new URL(cleaned);
      // Check query params
      const paramId = url.searchParams.get('studentId') || url.searchParams.get('id') || url.searchParams.get('qr');
      if (paramId) return paramId.trim();

      // Check last path segment: e.g. /student/STU001 -> STU001
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        if (lastSegment && lastSegment.length <= 40) {
          return decodeURIComponent(lastSegment).trim();
        }
      }
    } catch {
      // Continue
    }
  }

  // 3. Check key-value formats e.g. "studentId=STU001" or "id:STU001"
  const kvMatch = cleaned.match(/(?:studentId|id|qr|student)[=:]\s*([a-zA-Z0-9_-]+)/i);
  if (kvMatch && kvMatch[1]) {
    return kvMatch[1].trim();
  }

  // 4. Fallback: direct string stripped of trailing punctuation
  return cleaned.replace(/[;\s]+$/, '');
}

/**
 * Validates whether the QR payload string looks well-formed.
 */
export function validateQrPayload(payload: string): { valid: boolean; error?: string } {
  if (!payload || payload.length === 0) {
    return { valid: false, error: 'Empty QR code' };
  }
  if (payload.length > 150) {
    return { valid: false, error: 'QR payload exceeds maximum length' };
  }
  return { valid: true };
}
