export interface SystemSettings {
  schoolName: string;
  logoUrl?: string;
  timezone: string;           // e.g. "Asia/Colombo"
  attendanceCutoffTime?: string; // e.g. "08:30"
  qrPrefixFilter?: string;
  defaultMonthlyFee: number;  // Default: 5000
  currencySymbol: string;     // Default: "Rs."
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  schoolName: "SmartAttend Academy",
  logoUrl: "",
  timezone: "Asia/Colombo",
  attendanceCutoffTime: "08:30",
  qrPrefixFilter: "",
  defaultMonthlyFee: 5000,
  currencySymbol: "Rs.",
  updatedAt: new Date().toISOString(),
  updatedBy: "system"
};
