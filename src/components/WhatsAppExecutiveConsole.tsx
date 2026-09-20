import React, { useState, useEffect, useMemo } from "react";
import { 
  ShieldCheck, UserCheck, ShieldAlert, Key, Camera, Mic, FileText, 
  Download, Plus, RefreshCw, UserX, AlertTriangle, CheckCircle2, 
  Clock, Smartphone, Shield, Eye, Lock, Zap, Search, Filter, BookOpen,
  ChevronRight, ArrowRight, UserPlus, Users
} from "lucide-react";
import { toast } from "sonner";
import { generateBotUserManualPDF } from "../lib/botManualPdfGenerator";

interface WhatsAppExecutiveConsoleProps {
  staffList?: any[];
  studentsList?: any[];
  globalSettings?: any;
}

interface DelegatedAdmin {
  id: string;
  staffId?: string;
  name: string;
  phone: string;
  cnic?: string;
  rolePermissions: string[];
  pinLast4?: string;
  passwordLast4?: string;
  faceSnapshotUrl?: string;
  status: "pending_otp" | "pending_security" | "active" | "suspended";
  requiresFaceReauth?: boolean;
  delegatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuditLogItem {
  id: string;
  senderPhone: string;
  senderName?: string;
  senderRole: string;
  messageType: "text" | "voice" | "image" | "document";
  actionType: string;
  transcript?: string;
  mediaUrl?: string;
  details?: any;
  status: "success" | "pending_pin" | "challenged" | "rejected" | "failed";
  verificationLevel: "none" | "student_verified" | "pin_verified" | "face_verified";
  createdAt: string;
}

export default function WhatsAppExecutiveConsole({
  staffList = [],
  studentsList = [],
  globalSettings = {},
}: WhatsAppExecutiveConsoleProps) {
  const [delegatedAdmins, setDelegatedAdmins] = useState<DelegatedAdmin[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Active view tab
  const [activeSubTab, setActiveSubTab] = useState<"staff_roster" | "audit_trail" | "interactive_manual">("staff_roster");

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [auditFilterType, setAuditFilterType] = useState<"all" | "voice" | "image" | "text">("all");

  // Modal State for New Staff Delegation
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [isSubmittingDelegation, setIsSubmittingDelegation] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [delegationForm, setDelegationForm] = useState({
    name: "",
    phone: "",
    cnic: "",
    permissions: ["admissions"] as string[],
  });

  // Face Photo Preview Modal
  const [previewFaceUrl, setPreviewFaceUrl] = useState<{ isOpen: boolean; name: string; url: string }>({
    isOpen: false,
    name: "",
    url: "",
  });

  // Fetch Delegated Admins
  const fetchDelegatedAdmins = async () => {
    setIsLoadingAdmins(true);
    try {
      const res = await fetch("/api/whatsapp/delegated-admins");
      const data = await res.json();
      if (data.success && Array.isArray(data.admins)) {
        setDelegatedAdmins(data.admins);
      }
    } catch (err) {
      console.warn("Could not fetch delegated admins:", err);
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch("/api/whatsapp/audit-logs?limit=150");
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.warn("Could not fetch audit logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchDelegatedAdmins();
    fetchAuditLogs();
    const interval = setInterval(() => {
      fetchDelegatedAdmins();
      fetchAuditLogs();
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Handle staff dropdown selection
  const handleSelectStaff = (stId: string) => {
    setSelectedStaffId(stId);
    if (!stId) return;
    const found = staffList.find((s) => s.id === stId);
    if (found) {
      setDelegationForm((prev) => ({
        ...prev,
        name: found.fullName || found.name || "",
        phone: found.contact || found.phone || "",
        cnic: found.cnic || "",
      }));
    }
  };

  // Toggle permission in form
  const togglePermission = (perm: string) => {
    setDelegationForm((prev) => {
      const exists = prev.permissions.includes(perm);
      return {
        ...prev,
        permissions: exists ? prev.permissions.filter((p) => p !== perm) : [...prev.permissions, perm],
      };
    });
  };

  // Submit Delegation
  const handleSubmitDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegationForm.name.trim() || !delegationForm.phone.trim()) {
      toast.error("Staff member ka naam aur WhatsApp number darj karein.");
      return;
    }
    if (delegationForm.permissions.length === 0) {
      toast.error("Kam az kam 1 module permission muntakhib karein.");
      return;
    }

    setIsSubmittingDelegation(true);
    try {
      const res = await fetch("/api/whatsapp/delegate-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedStaffId || undefined,
          name: delegationForm.name.trim(),
          phone: delegationForm.phone.trim(),
          cnic: delegationForm.cnic.trim() || undefined,
          rolePermissions: delegationForm.permissions,
          delegatedBy: globalSettings?.principalName || "Principal",
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Access delegated for ${delegationForm.name}. WhatsApp invitation sent.`);
        setIsDelegateModalOpen(false);
        setDelegationForm({ name: "", phone: "", cnic: "", permissions: ["admissions"] });
        setSelectedStaffId("");
        fetchDelegatedAdmins();
      } else {
        toast.error(data.error || "Delegation fail ho gayi.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Server se rabta nahi ho saka.");
    } finally {
      setIsSubmittingDelegation(false);
    }
  };

  // Revoke Access
  const handleRevokeAccess = async (phone: string, name: string) => {
    if (!confirm(`Kya aap waqai ${name} ki WhatsApp Bot access suspend karna chahte hain?`)) return;
    try {
      const res = await fetch("/api/whatsapp/revoke-delegation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${name} ki access suspend kar di gayi hai.`);
        fetchDelegatedAdmins();
      } else {
        toast.error(data.error || "Failed to suspend access.");
      }
    } catch {
      toast.error("Network error.");
    }
  };

  // Trigger Face Re-Auth Challenge
  const handleTriggerFaceChallenge = async (phone: string, name: string) => {
    try {
      const res = await fetch("/api/whatsapp/trigger-face-reauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Biometric Face challenge sent to ${name}. Next action will require selfie.`);
        fetchDelegatedAdmins();
      }
    } catch {
      toast.error("Network error.");
    }
  };

  // Filtered Admins
  const filteredAdmins = useMemo(() => {
    return delegatedAdmins.filter((a) => {
      const matchSearch =
        (a.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.phone || "").includes(searchQuery) ||
        (a.cnic || "").includes(searchQuery);
      const matchRole =
        filterRole === "all" ||
        (filterRole === "active" && a.status === "active") ||
        (filterRole === "pending" && (a.status === "pending_otp" || a.status === "pending_security")) ||
        (filterRole === "suspended" && a.status === "suspended");
      return matchSearch && matchRole;
    });
  }, [delegatedAdmins, searchQuery, filterRole]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (auditFilterType === "all") return true;
      if (auditFilterType === "voice") return log.messageType === "voice";
      if (auditFilterType === "image") return log.messageType === "image" || log.messageType === "document";
      if (auditFilterType === "text") return log.messageType === "text";
      return true;
    });
  }, [auditLogs, auditFilterType]);

  // Executive Metric Counts
  const stats = useMemo(() => {
    const total = delegatedAdmins.length;
    const active = delegatedAdmins.filter((a) => a.status === "active").length;
    const pending = delegatedAdmins.filter((a) => a.status === "pending_otp" || a.status === "pending_security").length;
    const faceEnrolled = delegatedAdmins.filter((a) => Boolean(a.faceSnapshotUrl)).length;
    const voiceCount = auditLogs.filter((l) => l.messageType === "voice").length;
    return { total, active, pending, faceEnrolled, voiceCount };
  }, [delegatedAdmins, auditLogs]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#085a4e] via-[#0b6e60] to-[#043d34] rounded-2xl p-6 text-white shadow-lg border border-teal-600/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-white/10 rounded-xl backdrop-blur-xs text-amber-300">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <h2 className="text-xl font-bold tracking-tight">AI Executive Agent & Staff Delegation Console</h2>
          </div>
          <p className="text-teal-100 text-sm max-w-2xl">
            Principal Control Center: Delegate admissions, fee collection & attendance to staff via WhatsApp with multi-factor OTP, 5-digit PIN, and Biometric Face Verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => generateBotUserManualPDF()}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-900" />
            <span>Download Official Manual (PDF)</span>
          </button>

          <button
            onClick={() => setIsDelegateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#085a4e] hover:bg-teal-50 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#085a4e]" />
            <span>Delegate New Staff</span>
          </button>

          <button
            onClick={() => {
              fetchDelegatedAdmins();
              fetchAuditLogs();
              toast.info("Refreshed status and audit logs.");
            }}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Delegated Staff</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-1">Authorized operators</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Active Operators</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
          <div className="text-[11px] text-emerald-700 mt-1">Fully onboarded & verified</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Pending Onboarding</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          <div className="text-[11px] text-amber-700 mt-1">Awaiting OTP or Face ID</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Face Biometrics</span>
            <Camera className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{stats.faceEnrolled}</div>
          <div className="text-[11px] text-blue-700 mt-1">Biometric face anchors stored</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Voice Notes Handled</span>
            <Mic className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600">{stats.voiceCount}</div>
          <div className="text-[11px] text-purple-700 mt-1">Urdu/English audio queries</div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab("staff_roster")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeSubTab === "staff_roster"
                ? "border-[#085a4e] text-[#085a4e]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Delegated Staff & Permissions ({delegatedAdmins.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("audit_trail")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeSubTab === "audit_trail"
                ? "border-[#085a4e] text-[#085a4e]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Live Audit Trail ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("interactive_manual")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeSubTab === "interactive_manual"
                ? "border-[#085a4e] text-[#085a4e]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Operations Manual & Commands Guide</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: DELEGATED STAFF ROSTER */}
      {activeSubTab === "staff_roster" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff name, phone, CNIC..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-600 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="pending">Pending Onboarding</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Staff Cards Grid */}
          {filteredAdmins.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
              <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center mx-auto text-teal-600 mb-3">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Koi Delegated Staff Record Nahi Mila</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Staff members ko WhatsApp par admissions ya fee collection ki access delegate karne ke liye upar diye gaye button par click karein.
              </p>
              <button
                onClick={() => setIsDelegateModalOpen(true)}
                className="mt-4 px-4 py-2 bg-[#085a4e] text-white rounded-xl text-xs font-bold hover:bg-teal-700 cursor-pointer inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Delegate First Staff Member</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAdmins.map((admin) => (
                <div
                  key={admin.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-teal-500/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Biometric Face Snapshot Avatar */}
                      <div className="relative">
                        {admin.faceSnapshotUrl ? (
                          <img
                            src={admin.faceSnapshotUrl}
                            alt={admin.name}
                            onClick={() =>
                              setPreviewFaceUrl({
                                isOpen: true,
                                name: admin.name,
                                url: admin.faceSnapshotUrl!,
                              })
                            }
                            className="w-12 h-12 rounded-full object-cover object-[center_top] border-2 border-teal-500 shadow-xs cursor-pointer hover:scale-105 transition-transform"
                            title="Click to view biometric face snapshot"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm border-2 border-slate-300">
                            {admin.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {admin.faceSnapshotUrl && (
                          <span
                            className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5"
                            title="Biometric Face Enrolled"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{admin.name}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <Smartphone className="w-3 h-3 text-slate-400" />
                          <span>{admin.phone}</span>
                        </div>
                        {admin.cnic && (
                          <div className="text-[11px] text-slate-400 font-mono">CNIC: {admin.cnic}</div>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {admin.status === "active" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          Active
                        </span>
                      ) : admin.status === "pending_otp" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Pending OTP
                        </span>
                      ) : admin.status === "pending_security" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          Pending Face ID
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          Suspended
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Permissions & Security details */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block mb-1">Delegated Permissions:</span>
                      <div className="flex flex-wrap gap-1">
                        {(admin.rolePermissions || []).map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200/60 rounded-md text-[10px] font-bold capitalize"
                          >
                            {p.replace("_", " ")}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Key className="w-3.5 h-3.5 text-slate-400" />
                        <span>PIN: {admin.pinLast4 ? `••••${admin.pinLast4}` : "Not set"}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5 text-slate-400" />
                        <span>Face Biometrics: {admin.faceSnapshotUrl ? "Enrolled" : "Pending"}</span>
                      </span>
                    </div>
                  </div>

                  {/* Operator Actions */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleTriggerFaceChallenge(admin.phone, admin.name)}
                      className="px-2.5 py-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                      title="Force live selfie verification on next transaction"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Challenge Face ID</span>
                    </button>

                    {admin.status !== "suspended" ? (
                      <button
                        onClick={() => handleRevokeAccess(admin.phone, admin.name)}
                        className="px-2.5 py-1.5 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                      >
                        <UserX className="w-3 h-3" />
                        <span>Suspend</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setDelegationForm({
                            name: admin.name,
                            phone: admin.phone,
                            cnic: admin.cnic || "",
                            permissions: admin.rolePermissions || ["admissions"],
                          });
                          setIsDelegateModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all cursor-pointer"
                      >
                        Re-activate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: LIVE MULTIMODAL AUDIT TRAIL */}
      {activeSubTab === "audit_trail" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Filter Input Mode:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setAuditFilterType("all")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    auditFilterType === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({auditLogs.length})
                </button>
                <button
                  onClick={() => setAuditFilterType("voice")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    auditFilterType === "voice" ? "bg-white text-purple-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Mic className="w-3 h-3" />
                  <span>Voice Notes</span>
                </button>
                <button
                  onClick={() => setAuditFilterType("image")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    auditFilterType === "image" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Camera className="w-3 h-3" />
                  <span>Photos & Slips</span>
                </button>
                <button
                  onClick={() => setAuditFilterType("text")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    auditFilterType === "text" ? "bg-white text-teal-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Text</span>
                </button>
              </div>
            </div>

            <button
              onClick={fetchAuditLogs}
              className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Log Trail</span>
            </button>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Operator / Sender</th>
                    <th className="px-4 py-3">Input Mode</th>
                    <th className="px-4 py-3">Action Type</th>
                    <th className="px-4 py-3">Transcript / Details</th>
                    <th className="px-4 py-3">Security Level</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Koi audit log records mojood nahi hain.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{log.senderName || "Unknown"}</div>
                          <div className="text-[10px] text-slate-400">{log.senderPhone}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {log.messageType === "voice" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">
                              <Mic className="w-3 h-3" /> Voice
                            </span>
                          ) : log.messageType === "image" || log.messageType === "document" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                              <Camera className="w-3 h-3" /> Photo/Doc
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                              Text
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 capitalize whitespace-nowrap">
                          {log.actionType.replace("_", " ")}
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-slate-600" title={log.transcript || ""}>
                          {log.transcript || "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {log.verificationLevel === "face_verified" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Face Verified
                            </span>
                          ) : log.verificationLevel === "pin_verified" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800">
                              <Key className="w-3 h-3" /> PIN Verified
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Standard</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {log.status === "success" ? (
                            <span className="text-emerald-600 font-bold text-[11px]">Success</span>
                          ) : log.status === "pending_pin" ? (
                            <span className="text-amber-600 font-bold text-[11px]">Pending PIN</span>
                          ) : log.status === "failed" || log.status === "rejected" ? (
                            <span className="text-red-600 font-bold text-[11px]">Blocked</span>
                          ) : (
                            <span className="text-slate-500 font-bold text-[11px]">{log.status}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: INTERACTIVE OPERATIONS MANUAL & COMMANDS GUIDE */}
      {activeSubTab === "interactive_manual" && (
        <div className="space-y-6 bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Superior College WhatsApp Bot Operations Manual</h3>
              <p className="text-xs text-slate-500">Official Executive Directive & Step-by-Step Operator Instructions</p>
            </div>
            <button
              onClick={() => generateBotUserManualPDF()}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#085a4e] text-white hover:bg-teal-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Printable PDF</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Guide Card 1: AI Models Stack */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold text-sm">
                <Mic className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>1. Enterprise AI Neural Stack (Autonomous Engine)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Powered directly by SCJ Institutional Multimodal Neural Architecture:
              </p>
              <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                <li><strong>SCJ Autonomous Voice STT:</strong> Native transcription of spoken Urdu, Roman Urdu & English voice notes.</li>
                <li><strong>SCJ Deep Vision OCR:</strong> Deep document computer vision for handwritten paper forms & slips.</li>
                <li><strong>SCJ Landmark Biometrics:</strong> Multi-point facial geometry comparison (&gt;=65% match).</li>
              </ul>
            </div>

            {/* Guide Card 2: Attendance Module */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>2. Attendance & Parent Absent Alerts</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Automated parental notification & voice checks:
              </p>
              <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                <li><strong>Auto Absent SMS/WhatsApp:</strong> Parents receive instant alert when student is marked absent with monthly total count.</li>
                <li><strong>Voice Query:</strong> "Sir aaj kitne students absent hain?" or "Ahmad ki is mahine kitni chuttiyan hain?"</li>
                <li><strong>Faculty Punctuality:</strong> Daily staff arrival logs & payroll absent deductions.</li>
              </ul>
            </div>

            {/* Guide Card 3: Admissions & Paper OCR */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold text-sm">
                <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>3. Paper Admission OCR (SCJ Deep Vision Engine)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Enroll new candidates in under 30 seconds straight from camera:
              </p>
              <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                <li><strong>Snap Slip Photo:</strong> Send photo of paper form to WhatsApp bot.</li>
                <li><strong>OCR Extraction:</strong> Deep Document Vision parses Name, Phone, Marks, Program, Section & Fee.</li>
                <li><strong>5-Digit PIN Commit:</strong> Reply <code>CONFIRM [PIN]</code> to write into LMS (Session 2026-28 normalized).</li>
              </ul>
            </div>

            {/* Guide Card 4: Fee Collection */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold text-sm">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>4. Fee Collection & Instant WhatsApp Receipts</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Seamless financial ledger updates via voice or text:
              </p>
              <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                <li><strong>Voice / Text Command:</strong> "Roll 102 fee 15000 jama ho gayi receipt 402 PIN 12345".</li>
                <li><strong>Ledger Adjustment:</strong> Automatically updates <code>fee_received</code> & creates income record.</li>
                <li><strong>Parent Receipt:</strong> Official fee deposit acknowledgement instantly dispatched to parent.</li>
              </ul>
            </div>

            {/* Guide Card 5: Academics & Timetable */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold text-sm">
                <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>5. Academic Results & Timetables</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Dynamic exam cards and schedules on demand:
              </p>
              <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                <li><strong>Exam Marks:</strong> Voice query: "Ahmad Raza s/o Muhammad Akram ka result dikhao" outputs full test breakdown.</li>
                <li><strong>Class Timetable:</strong> Faculty/Students can check: "Mera aaj ka timetable kya hai?" for periods & room numbers.</li>
              </ul>
            </div>

            {/* Guide Card 6: Zero-Trust Security & Delegation */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>6. Multi-Factor Security & Biometric Face ID</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Zero-trust administrative authorization lifecycle:
              </p>
              <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                <li><strong>OTP Handshake:</strong> Principal delegates rights &rarr; 6-digit OTP sent to staff WhatsApp.</li>
                <li><strong>Password & PIN:</strong> Staff sets 8+ char password & 5-digit PIN (e.g. <code>SETUP Pass@123 PIN 48291</code>).</li>
                <li><strong>Face Biometrics:</strong> Camera selfie enrolled in DB; challenged during doubted/suspicious transactions.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELEGATE NEW STAFF MEMBER */}
      {isDelegateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-[#085a4e] to-[#043d34] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <UserPlus className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Delegate Staff WhatsApp Access</h3>
                  <p className="text-xs text-teal-100">Principal Authorization Gateway</p>
                </div>
              </div>
              <button
                onClick={() => setIsDelegateModalOpen(false)}
                className="text-white/80 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDelegation} className="p-6 space-y-4">
              {/* Select Existing Faculty */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Registered Faculty / Staff (Optional Quick-Fill):
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => handleSelectStaff(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                >
                  <option value="">-- Choose from Staff Roster --</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.fullName || st.name} ({st.role || "Faculty"}) — {st.contact || "No phone"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Staff Full Name *</label>
                  <input
                    type="text"
                    required
                    value={delegationForm.name}
                    onChange={(e) => setDelegationForm({ ...delegationForm, name: e.target.value })}
                    placeholder="e.g. Ahmad Khan"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={delegationForm.phone}
                    onChange={(e) => setDelegationForm({ ...delegationForm, phone: e.target.value })}
                    placeholder="03001234567"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">National ID / CNIC (Optional)</label>
                <input
                  type="text"
                  value={delegationForm.cnic}
                  onChange={(e) => setDelegationForm({ ...delegationForm, cnic: e.target.value })}
                  placeholder="36302-XXXXXXX-X"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                />
              </div>

              {/* Checkbox Permissions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Delegated Module Permissions *</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={delegationForm.permissions.includes("admissions")}
                      onChange={() => togglePermission("admissions")}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Admissions</span>
                      <span className="text-[10px] text-slate-400">Scan slips & create admissions</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={delegationForm.permissions.includes("fee_collection")}
                      onChange={() => togglePermission("fee_collection")}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Fee Collection</span>
                      <span className="text-[10px] text-slate-400">Record fee & send receipts</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={delegationForm.permissions.includes("attendance")}
                      onChange={() => togglePermission("attendance")}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Attendance</span>
                      <span className="text-[10px] text-slate-400">Daily attendance notices</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={delegationForm.permissions.includes("timetable")}
                      onChange={() => togglePermission("timetable")}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Timetables</span>
                      <span className="text-[10px] text-slate-400">Faculty lecture schedules</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDelegateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDelegation}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#085a4e] hover:bg-teal-700 rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDelegation ? "Sending WhatsApp Invitation..." : "Send Delegation Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BIOMETRIC FACE SNAPSHOT PREVIEW */}
      {previewFaceUrl.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full text-center shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-xs font-bold text-slate-800">Biometric Face Snapshot</span>
              <button
                onClick={() => setPreviewFaceUrl({ isOpen: false, name: "", url: "" })}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-teal-500 shadow-md mb-3">
              <img
                src={previewFaceUrl.url}
                alt={previewFaceUrl.name}
                className="w-full h-full object-cover object-[center_top]"
              />
            </div>
            <h4 className="text-sm font-bold text-slate-900">{previewFaceUrl.name}</h4>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Official Biometric Identity Anchor</p>
          </div>
        </div>
      )}
    </div>
  );
}
