import React from "react";
import { AttendanceStats } from "@/types/attendance";
import { StatCard } from "@/components/ui/StatCard";
import { Users, UserCheck, UserX, Percent } from "lucide-react";

export interface AttendanceSummaryProps {
  stats: AttendanceStats;
}

export const AttendanceSummary: React.FC<AttendanceSummaryProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Active Students"
        value={stats.totalStudents}
        subtitle="Enrolled student roster"
        icon={<Users className="w-5 h-5" />}
        variant="indigo"
      />

      <StatCard
        title="Present Today"
        value={stats.presentCount}
        subtitle="Confirmed via QR/Manual"
        icon={<UserCheck className="w-5 h-5" />}
        variant="emerald"
      />

      <StatCard
        title="Absent Today"
        value={stats.absentCount}
        subtitle="Unrecorded active students"
        icon={<UserX className="w-5 h-5" />}
        variant="rose"
      />

      <StatCard
        title="Attendance Rate"
        value={`${stats.attendanceRate}%`}
        subtitle="Present ÷ Total Students"
        icon={<Percent className="w-5 h-5" />}
        variant="amber"
      />
    </div>
  );
};
