import React, { useState, useMemo } from "react";
import {
  X,
  Sparkles,
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck2,
  Send,
  Smartphone,
  CheckCheck,
  RotateCw,
  Search,
  Eye,
  Check,
  ShieldCheck,
  PhoneCall,
  UserCheck
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import WhatsAppReportModal, { ReportRecipientItem } from "./WhatsAppReportModal";
import {
  DailyAttendanceSummaryData,
  buildDailyPrincipalAttendanceSummary,
  sendDailyPrincipalAttendanceSummary,
  sendStaffAbsentNotice,
  dispatchBulkStaffAbsentNotices,
  dispatchBulkStudentAbsentNotices,
  sendAutoDailyAttendanceNotice,
  formatWhatsAppPhone,
  buildDailyAttendanceMessage,
  buildStaffAbsentMessage
} from "../lib/whatsappAutomation";

interface DailyAttendanceCloseoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  students: any[];
  studentAttendance: any[];
  staff: any[];
  staffAttendance: any[];
  settings: any;
  onRefreshData?: () => void;
}

export default function DailyAttendanceCloseoutModal({
  isOpen,
  onClose,
  selectedDate,
  students,
  studentAttendance,
  staff,
  staffAttendance,
  settings,
  onRefreshData
}: DailyAttendanceCloseoutModalProps) {
  const [activeTab, setActiveTab] = useState<"students_absent" | "staff_absent" | "late_arrivals" | "preview_report">("students_absent");
  const [searchFilter, setSearchFilter] = useState("");

  // Principal send state
  const [isSendingPrincipal, setIsSendingPrincipal] = useState(false);
  const [customPrincipalPhone, setCustomPrincipalPhone] = useState("");
  const [showPhoneEditor, setShowPhoneEditor] = useState(false);

  // Bulk dispatch states
  const [isBulkSendingStudents, setIsBulkSendingStudents] = useState(false);
  const [bulkStudentProgress, setBulkStudentProgress] = useState({ done: 0, total: 0 });

  const [isBulkSendingStaff, setIsBulkSendingStaff] = useState(false);
  const [bulkStaffProgress, setBulkStaffProgress] = useState({ done: 0, total: 0 });

  // Universal WhatsApp Report Modal State
  const [isBulkReportModalOpen, setIsBulkReportModalOpen] = useState(false);
  const [bulkReportModalProps, setBulkReportModalProps] = useState<{
    title: string;
    subtitle: string;
    category: "daily_attendance" | "staff_absent";
    items: ReportRecipientItem[];
  }>({
    title: "",
    subtitle: "",
    category: "daily_attendance",
    items: [],
  });

  // 1. Process Students Attendance for selectedDate
  const studentAnalysis = useMemo(() => {
    const totalEnrolled = students.length;
    const attMap = new Map<string, any>();

    studentAttendance.forEach((rec) => {
      if (rec.date === selectedDate) {
        attMap.set(String(rec.studentId || rec.student_id), rec);
      }
    });

    const presents: any[] = [];
    const lates: any[] = [];
    const leaves: any[] = [];
    const absents: any[] = [];

    students.forEach((stu) => {
      const sid = String(stu.id || stu.studentId || stu.collegeNo);
      const rec = attMap.get(sid) || attMap.get(String(stu.collegeNo)) || attMap.get(String(stu.id));

      if (rec) {
        if (rec.status === "Present") presents.push({ ...stu, attRecord: rec });
        else if (rec.status === "Late") lates.push({ ...stu, attRecord: rec });
        else if (rec.status === "Leave") leaves.push({ ...stu, attRecord: rec });
        else absents.push({ ...stu, attRecord: rec });
      } else {
        // No record recorded today => Absent / Missing at gate
        absents.push({ ...stu, attRecord: null });
      }
    });

    const presentCount = presents.length;
    const lateCount = lates.length;
    const leaveCount = leaves.length;
    const absentCount = absents.length;
    const presentPct = totalEnrolled > 0 ? Math.round(((presentCount + lateCount) / totalEnrolled) * 100) : 0;

    return {
      total: totalEnrolled,
      presentCount,
      lateCount,
      leaveCount,
      absentCount,
      presentPct,
      presents,
      lates,
      leaves,
      absents
    };
  }, [students, studentAttendance, selectedDate]);

  // 2. Process Staff Attendance for selectedDate
  const staffAnalysis = useMemo(() => {
    const activeStaff = staff.filter((s) => s.status !== "Inactive");
    const totalFaculty = activeStaff.length;
    const attMap = new Map<string, any>();

    staffAttendance.forEach((rec) => {
      if (rec.date === selectedDate) {
        attMap.set(String(rec.staffId || rec.staff_id), rec);
      }
    });

    const presents: any[] = [];
    const lates: any[] = [];
    const leaves: any[] = [];
    const absents: any[] = [];

    activeStaff.forEach((st) => {
      const stid = String(st.id);
      const rec = attMap.get(stid);

      if (rec) {
        if (rec.status === "Present") presents.push({ ...st, attRecord: rec });
        else if (rec.status === "Late") lates.push({ ...st, attRecord: rec });
        else if (rec.status === "Leave") leaves.push({ ...st, attRecord: rec });
        else absents.push({ ...st, attRecord: rec });
      } else {
        absents.push({ ...st, attRecord: null });
      }
    });

    const presentCount = presents.length;
    const lateCount = lates.length;
    const leaveCount = leaves.length;
    const absentCount = absents.length;
    const presentPct = totalFaculty > 0 ? Math.round(((presentCount + lateCount) / totalFaculty) * 100) : 0;

    return {
      total: totalFaculty,
      presentCount,
      lateCount,
      leaveCount,
      absentCount,
      presentPct,
      presents,
      lates,
      leaves,
      absents
    };
  }, [staff, staffAttendance, selectedDate]);

  // 3. Prepare summary data object for Principal
  const summaryData: DailyAttendanceSummaryData = useMemo(() => {
    return {
      date: selectedDate,
      totalStudents: studentAnalysis.total,
      presentStudents: studentAnalysis.presentCount,
      lateStudents: studentAnalysis.lateCount,
      absentStudents: studentAnalysis.absentCount,
      leaveStudents: studentAnalysis.leaveCount,
      totalStaff: staffAnalysis.total,
      presentStaff: staffAnalysis.presentCount,
      lateStaff: staffAnalysis.lateCount,
      absentStaff: staffAnalysis.absentCount,
      leaveStaff: staffAnalysis.leaveCount,
      absentStudentNames: studentAnalysis.absents.map(
        (s) => `${s.fullName || "Student"} (${s.collegeNo || s.studentId || "Roll N/A"} - ${s.group || s.currentClass || "Inter"})`
      ),
      absentStaffNames: staffAnalysis.absents.map(
        (st) => `${st.fullName || "Faculty"} (${st.role || "Teacher"})`
      ),
      lateStudentNames: studentAnalysis.lates.map(
        (s) => `${s.fullName} (${s.attRecord?.checkInTime || s.attRecord?.check_in_time || "Late"})`
      ),
    };
  }, [studentAnalysis, staffAnalysis, selectedDate]);

  const reportPreviewText = useMemo(() => {
    return buildDailyPrincipalAttendanceSummary(summaryData, settings);
  }, [summaryData, settings]);

  if (!isOpen) return null;

  // Action: 1-Click Send Flash Summary to Principal
  const handleSendToPrincipal = async () => {
    setIsSendingPrincipal(true);
    const targetPhone = customPrincipalPhone.trim() || undefined;
    const ok = await sendDailyPrincipalAttendanceSummary(summaryData, settings, { targetPhone });
    setIsSendingPrincipal(false);
    if (ok) {
      toast.success("Executive Attendance Snapshot dispatched to Principal successfully!");
    }
  };

  // Action: 1-Click Send to ALL Absent Students with Live Progress & Audit Hub
  const handleBulkSendAbsentStudents = () => {
    if (studentAnalysis.absents.length === 0) {
      toast.info("No absent students today!");
      return;
    }
    const items: ReportRecipientItem[] = studentAnalysis.absents.map((stu: any) => {
      const rollNo = stu.collegeNo || stu.studentId || stu.id || "N/A";
      const msg = buildDailyAttendanceMessage(
        stu,
        { date: selectedDate, status: "Absent" },
        settings
      );
      return {
        id: stu.id,
        student: stu,
        name: stu.fullName || "Student",
        phone: stu.contact || stu.fatherContact || stu.phone || stu.mobile || "",
        rollNo,
        className: `${stu.section || ""} • ${stu.groupName || stu.currentClass || ""}`,
        message: msg,
        statusBadge: "Absent",
        isAbsent: true,
      };
    });

    setBulkReportModalProps({
      title: "Broadcast Daily Absent Notices (Students)",
      subtitle: `${items.length} Absent Students • Date: ${selectedDate}`,
      category: "daily_attendance",
      items,
    });
    setIsBulkReportModalOpen(true);
  };

  // Action: 1-Click Send to ALL Absent Staff with Live Progress & Audit Hub
  const handleBulkSendAbsentStaff = () => {
    if (staffAnalysis.absents.length === 0) {
      toast.info("No absent faculty members today!");
      return;
    }
    const items: ReportRecipientItem[] = staffAnalysis.absents.map((st: any) => {
      const msg = buildStaffAbsentMessage(st, selectedDate, settings);
      return {
        id: st.id,
        student: st,
        name: st.fullName || st.full_name || "Faculty Member",
        phone: st.contact || st.phone || "",
        rollNo: st.id || "Staff",
        className: st.role || "Faculty Member",
        message: msg,
        statusBadge: "Absent",
        isAbsent: true,
      };
    });

    setBulkReportModalProps({
      title: "Broadcast Faculty Absent Notices",
      subtitle: `${items.length} Absent Faculty Members • Date: ${selectedDate}`,
      category: "staff_absent",
      items,
    });
    setIsBulkReportModalOpen(true);
  };

  // Action: Quick Mark Student as Leave (Excused)
  const handleQuickMarkStudentLeave = async (student: any) => {
    try {
      const payload = {
        student_id: student.id,
        date: selectedDate,
        status: "Leave",
        notes: "Approved Leave by Admin during daily attendance closeout",
      };
      await supabase.from("student_attendance").upsert(payload, { onConflict: "student_id,date" });
      toast.success(`Marked leave for ${student.fullName || "Student"}`);
      onRefreshData?.();
    } catch (e: any) {
      toast.error("Failed to mark leave: " + (e?.message || "Error"));
    }
  };

  // Action: Quick Mark Staff as Leave (Excused)
  const handleQuickMarkStaffLeave = async (staffMember: any) => {
    try {
      const payload = {
        staff_id: staffMember.id,
        date: selectedDate,
        status: "Leave",
        notes: "Approved Leave by Admin during daily attendance closeout",
      };
      await supabase.from("staff_attendance").upsert(payload, { onConflict: "staff_id,date" });
      toast.success(`Marked leave for ${staffMember.fullName || "Faculty"}`);
      onRefreshData?.();
    } catch (e: any) {
      toast.error("Failed to mark leave: " + (e?.message || "Error"));
    }
  };

  // Filtered lists for tabs
  const filteredAbsentStudents = studentAnalysis.absents.filter((s) => {
    const q = searchFilter.toLowerCase();
    return (
      (s.fullName || "").toLowerCase().includes(q) ||
      (s.fatherName || "").toLowerCase().includes(q) ||
      (s.collegeNo || "").toLowerCase().includes(q) ||
      (s.group || s.currentClass || "").toLowerCase().includes(q)
    );
  });

  const filteredAbsentStaff = staffAnalysis.absents.filter((st) => {
    const q = searchFilter.toLowerCase();
    return (
      (st.fullName || "").toLowerCase().includes(q) ||
      (st.role || "").toLowerCase().includes(q) ||
      (st.id || "").toLowerCase().includes(q)
    );
  });

  const allLateArrivals = [
    ...studentAnalysis.lates.map((s) => ({
      ...s,
      type: "student" as const,
      time: s.attRecord?.checkInTime || s.attRecord?.check_in_time || "Morning",
    })),
    ...staffAnalysis.lates.map((st) => ({
      ...st,
      type: "staff" as const,
      time: st.attRecord?.checkIn || st.attRecord?.check_in_time || "Morning",
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Daily Attendance Flash & Closeout
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {selectedDate}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official Gate Biometric Closeout • Student & Faculty Attendance Roster & Alerts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Infographics Overview Bento Grid */}
        <div className="p-4 sm:p-6 border-b border-slate-800/80 bg-slate-950/40 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Bento Card 1: Students Attendance */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Students Attendance</h3>
                  <span className="text-[11px] text-slate-400">Total Enrolled: {studentAnalysis.total}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {studentAnalysis.presentPct}%
                </span>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">Attendance Ratio</span>
              </div>
            </div>

            {/* Metric Tiles */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2">
                <span className="block text-[10px] font-bold text-emerald-400 uppercase">Present</span>
                <strong className="text-base font-bold text-emerald-300 font-mono">{studentAnalysis.presentCount}</strong>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2">
                <span className="block text-[10px] font-bold text-amber-400 uppercase">Late</span>
                <strong className="text-base font-bold text-amber-300 font-mono">{studentAnalysis.lateCount}</strong>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2">
                <span className="block text-[10px] font-bold text-rose-400 uppercase">Absent</span>
                <strong className="text-base font-bold text-rose-300 font-mono">{studentAnalysis.absentCount}</strong>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2">
                <span className="block text-[10px] font-bold text-blue-400 uppercase">Leave</span>
                <strong className="text-base font-bold text-blue-300 font-mono">{studentAnalysis.leaveCount}</strong>
              </div>
            </div>
          </div>

          {/* Bento Card 2: Faculty / Staff Attendance */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Faculty & Staff</h3>
                  <span className="text-[11px] text-slate-400">Active Teachers: {staffAnalysis.total}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black text-amber-400 font-mono">
                  {staffAnalysis.presentPct}%
                </span>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">Attendance Ratio</span>
              </div>
            </div>

            {/* Metric Tiles */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2">
                <span className="block text-[10px] font-bold text-emerald-400 uppercase">Present</span>
                <strong className="text-base font-bold text-emerald-300 font-mono">{staffAnalysis.presentCount}</strong>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2">
                <span className="block text-[10px] font-bold text-amber-400 uppercase">Late</span>
                <strong className="text-base font-bold text-amber-300 font-mono">{staffAnalysis.lateCount}</strong>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2">
                <span className="block text-[10px] font-bold text-rose-400 uppercase">Absent</span>
                <strong className="text-base font-bold text-rose-300 font-mono">{staffAnalysis.absentCount}</strong>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2">
                <span className="block text-[10px] font-bold text-blue-400 uppercase">Leave</span>
                <strong className="text-base font-bold text-blue-300 font-mono">{staffAnalysis.leaveCount}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Master 1-Click Action Hub */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-indigo-400" />
              1-Click Closeout Dispatches:
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 1-Click to Absent Students */}
            <button
              onClick={handleBulkSendAbsentStudents}
              disabled={isBulkSendingStudents || studentAnalysis.absentCount === 0}
              className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-rose-400" />
              <span>
                {isBulkSendingStudents
                  ? `Sending (${bulkStudentProgress.done}/${bulkStudentProgress.total})...`
                  : `Alert ${studentAnalysis.absentCount} Absent Students (WhatsApp)`}
              </span>
            </button>

            {/* 1-Click to Absent Staff */}
            <button
              onClick={handleBulkSendAbsentStaff}
              disabled={isBulkSendingStaff || staffAnalysis.absentCount === 0}
              className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {isBulkSendingStaff
                  ? `Sending (${bulkStaffProgress.done}/${bulkStaffProgress.total})...`
                  : `Alert ${staffAnalysis.absentCount} Absent Faculty (WhatsApp)`}
              </span>
            </button>

            {/* 1-Click Flash Snapshot to Principal */}
            <button
              onClick={handleSendToPrincipal}
              disabled={isSendingPrincipal}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSendingPrincipal ? "Dispatching..." : "Send Flash Summary to Principal"}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation & Search Filter */}
        <div className="px-4 sm:px-6 pt-3 pb-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("students_absent")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "students_absent"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white bg-slate-800/40"
              }`}
            >
              <span>Absent Students</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950/60 text-[10px] font-mono">
                {studentAnalysis.absentCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("staff_absent")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "staff_absent"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white bg-slate-800/40"
              }`}
            >
              <span>Absent Faculty</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950/60 text-[10px] font-mono">
                {staffAnalysis.absentCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("late_arrivals")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "late_arrivals"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white bg-slate-800/40"
              }`}
            >
              <span>Late Arrivals</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950/60 text-[10px] font-mono">
                {studentAnalysis.lateCount + staffAnalysis.lateCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("preview_report")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "preview_report"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white bg-slate-800/40"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Principal Report Preview</span>
            </button>
          </div>

          {activeTab !== "preview_report" && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name, roll, role..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-[300px]">
          
          {/* TAB 1: Absent Students */}
          {activeTab === "students_absent" && (
            <div>
              {filteredAbsentStudents.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <h4 className="text-sm font-bold text-white">No Absent Students</h4>
                  <p className="text-xs text-slate-400 mt-1">All enrolled students checked-in or on leave today!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAbsentStudents.map((s) => {
                    const phone = s.fatherContact || s.contact || s.phone || "";
                    return (
                      <div
                        key={s.id}
                        className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {s.photo ? (
                            <img src={s.photo} alt={s.fullName} className="w-10 h-10 rounded-xl object-cover border border-slate-700" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs">
                              {s.fullName?.charAt(0) || "S"}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-white">{s.fullName}</h4>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Roll: {s.collegeNo || s.studentId || s.id}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Father: {s.fatherName || "N/A"} • Class: {s.group || s.currentClass || "Inter"} {s.section ? `(Sec ${s.section})` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button
                            onClick={() => handleQuickMarkStudentLeave(s)}
                            className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            title="Mark as Approved Leave"
                          >
                            <FileCheck2 className="w-3 h-3" />
                            <span>Mark Leave</span>
                          </button>

                          <button
                            onClick={() => sendAutoDailyAttendanceNotice(s, { date: selectedDate, status: "Absent" }, settings)}
                            className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            title="Send Absent WhatsApp Notice to Parents"
                          >
                            <Smartphone className="w-3 h-3" />
                            <span>WhatsApp Alert</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Absent Faculty */}
          {activeTab === "staff_absent" && (
            <div>
              {filteredAbsentStaff.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <h4 className="text-sm font-bold text-white">Full Faculty Attendance!</h4>
                  <p className="text-xs text-slate-400 mt-1">All active teachers and staff members are present today.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAbsentStaff.map((st) => (
                    <div
                      key={st.id}
                      className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {st.photo ? (
                          <img src={st.photo} alt={st.fullName} className="w-10 h-10 rounded-xl object-cover border border-slate-700" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs">
                            {st.fullName?.charAt(0) || "T"}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white">{st.fullName}</h4>
                            <span className="text-[10px] text-amber-400 font-medium">
                              {st.role || "Faculty Member"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Staff ID: {st.id} • Phone: {st.contact || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => handleQuickMarkStaffLeave(st)}
                          className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Mark staff as On Leave"
                        >
                          <FileCheck2 className="w-3 h-3" />
                          <span>Mark Leave</span>
                        </button>

                        <button
                          onClick={() => sendStaffAbsentNotice(st, selectedDate, settings)}
                          className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Send Absent Alert to Staff WhatsApp"
                        >
                          <Smartphone className="w-3 h-3" />
                          <span>WhatsApp Notice</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Late Arrivals */}
          {activeTab === "late_arrivals" && (
            <div>
              {allLateArrivals.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <h4 className="text-sm font-bold text-white">Zero Late Arrivals!</h4>
                  <p className="text-xs text-slate-400 mt-1">Everyone checked in before the official bell.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allLateArrivals.map((person: any, idx) => (
                    <div
                      key={person.id + idx}
                      className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        {person.photo ? (
                          <img src={person.photo} alt={person.fullName} className="w-10 h-10 rounded-xl object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs">
                            {person.fullName?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white">{person.fullName}</h4>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              person.type === "staff" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            }`}>
                              {person.type === "staff" ? "Faculty" : "Student"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {person.type === "staff" ? `ID: ${person.id} • ${person.role}` : `Roll: ${person.collegeNo || person.id} • ${person.group || "Inter"}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl font-mono font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{person.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Principal Flash Summary Preview */}
          {activeTab === "preview_report" && (
            <div className="flex flex-col gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed shadow-inner">
                {reportPreviewText}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-800/40 rounded-2xl border border-slate-700/60">
                <div className="text-xs text-slate-300 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>
                    Destination: <strong className="text-white font-mono">{customPrincipalPhone || settings?.principalPhone || settings?.contactNumber || "Principal Phone in Settings"}</strong>
                  </span>
                  <button
                    onClick={() => setShowPhoneEditor(!showPhoneEditor)}
                    className="text-[11px] text-indigo-400 hover:underline cursor-pointer ml-1"
                  >
                    Change
                  </button>
                </div>

                <button
                  onClick={handleSendToPrincipal}
                  disabled={isSendingPrincipal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingPrincipal ? "Dispatching..." : "Send Now to Principal"}</span>
                </button>
              </div>

              {showPhoneEditor && (
                <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter Pakistani WhatsApp Number: 03XXXXXXXXX"
                    value={customPrincipalPhone}
                    onChange={(e) => setCustomPrincipalPhone(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono"
                  />
                  <button
                    onClick={() => setShowPhoneEditor(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Set
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 border-t border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Biometric Closeout Verified by College ERP System</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Close Dashboard
          </button>
        </div>
      </div>

      {/* Universal Bulk WhatsApp Dispatch & Audit Hub Modal */}
      <WhatsAppReportModal
        open={isBulkReportModalOpen}
        onOpenChange={setIsBulkReportModalOpen}
        title={bulkReportModalProps.title}
        subtitle={bulkReportModalProps.subtitle}
        category={bulkReportModalProps.category}
        items={bulkReportModalProps.items}
        settings={settings}
        onFinished={() => {
          onRefreshData?.();
        }}
      />
    </div>
  );
}
