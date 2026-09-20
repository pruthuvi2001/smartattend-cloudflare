export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export interface ClassScheduleEntry {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // "19:00" (24-hour HH:mm)
  endTime: string;   // "21:00" (24-hour HH:mm)
}

export interface ClassEntity {
  id: string;          // e.g. "grade-6"
  name: string;        // e.g. "Grade 6"
  monthlyFee?: number; // Optional custom monthly fee for this class
  schedules: ClassScheduleEntry[];
  createdAt: string;
  updatedAt: string;
}
