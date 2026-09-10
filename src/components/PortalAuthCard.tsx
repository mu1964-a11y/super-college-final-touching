import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UserCheck,
  Phone,
  Lock,
  Mail,
  Briefcase,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  KeyRound,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Sparkles,
  Shield,
  Clock,
  PhoneCall,
  Info,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Student, Staff } from "../types";
import {
  findPortalAccount,
  verifyPortalAccountPassword,
  savePortalAccount,
  resetPortalAccountPassword,
} from "../services/portalAuthService";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export type PortalType = "student" | "staff" | "admin";
export type AuthCardTab = "signin" | "signup" | "reset" | "help";

interface PortalAuthCardProps {
  loginPortal: PortalType;
  currentPortalConfig: {
    badge: string;
    welcomeRole: string;
    welcomeGreeting: string;
    welcomeDesc: string;
  };
  brandingSettings: {
    name: string;
    logo?: string | null;
  };
  students: Student[];
  staffList: Staff[];
  authLoading: boolean;
  setAuthLoading: (loading: boolean) => void;
  onLoginSuccessStudent: (student: Student) => void;
  onLoginSuccessStaff: (staff: Staff) => void;
  onAdminLogin: (e: React.FormEvent) => void;
  adminEmail: string;
  setAdminEmail: (email: string) => void;
  adminPassword: string;
  setAdminPassword: (password: string) => void;
  rememberMe: boolean;
  setRememberMe: (val: boolean) => void;
  onBackToGateway: () => void;
}

export default function PortalAuthCard({
  loginPortal,
  currentPortalConfig,
  brandingSettings,
  students,
  staffList,
  authLoading,
  setAuthLoading,
  onLoginSuccessStudent,
  onLoginSuccessStaff,
  onAdminLogin,
  adminEmail,
  setAdminEmail,
  adminPassword,
  setAdminPassword,
  rememberMe,
  setRememberMe,
  onBackToGateway,
}: PortalAuthCardProps) {
  const [activeTab, setActiveTab] = useState<AuthCardTab>("signin");
  const [loginError, setLoginError] = useState<string>("");

  // Sign in state
  const [studentIdInput, setStudentIdInput] = useState("");
  const [studentCredInput, setStudentCredInput] = useState("");
  const [staffIdInput, setStaffIdInput] = useState("");
  const [staffCredInput, setStaffCredInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sign up (Create Account) state
  const [regIdentifier, setRegIdentifier] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regNewPassword, setRegNewPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [verifiedRecord, setVerifiedRecord] = useState<{
    id: string;
    fullName: string;
    fatherName?: string;
    groupOrRole?: string;
    contact?: string;
    rollNo?: string;
    raw: any;
  } | null>(null);
  const [verifyingSignup, setVerifyingSignup] = useState(false);

  // Reset Password state
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetPhone, setResetPhone] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [verifiedResetRecord, setVerifiedResetRecord] = useState<{
    id: string;
    fullName: string;
    fatherName?: string;
    groupOrRole?: string;
    contact?: string;
    rollNo?: string;
    raw: any;
  } | null>(null);
  const [verifyingReset, setVerifyingReset] = useState(false);

  // Help section active sub-tab
  const [helpSubTab, setHelpSubTab] = useState<"signin" | "signup" | "reset" | "contact">("signin");

  // Helper to switch tabs cleanly
  const switchTab = (tab: AuthCardTab) => {
    setActiveTab(tab);
    setLoginError("");
  };

  // ==========================================
  // 1. SIGN IN SUBMISSION LOGIC
  // ==========================================
  const handleStudentSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setLoginError("");

    const rawId = studentIdInput.trim().toLowerCase();
    const rawCred = studentCredInput.trim();
    const rawCredClean = rawCred.toLowerCase().replace(/[\s-]/g, "");

    if (!rawId || !rawCred) {
      setLoginError("Please enter your Roll No / B-Form and Password or Registered Mobile Number.");
      setAuthLoading(false);
      return;
    }

    try {
      // Step A: Find the student record in memory
      let matchedStudent = (students || []).find((s) => {
        const sId = (s.id || "").toLowerCase();
        const sRoll = (s.rollNo || "").toLowerCase();
        const sCollegeNo = (s.collegeNo || "").toLowerCase();
        const sBForm = (s.bayFormNo || "").replace(/\D/g, "");
        const sBoard = (s.boardRollNo || "").toLowerCase();
        const sName = (s.fullName || "").toLowerCase();

        return (
          sId === rawId ||
          sRoll === rawId ||
          sCollegeNo === rawId ||
          sBForm === rawId.replace(/\D/g, "") ||
          sBoard === rawId ||
          sName === rawId
        );
      });

      // Query Supabase directly if not found in memory
      if (!matchedStudent && isSupabaseConfigured) {
        const { data: dbStudents } = await supabase.from("students").select("*");
        if (dbStudents && dbStudents.length > 0) {
          const found = dbStudents.find((s: any) => {
            const sId = (s.id || "").toLowerCase();
            const sRoll = (s.roll_no || "").toLowerCase();
            const sCollegeNo = (s.college_no || "").toLowerCase();
            const sBForm = (s.bay_form_no || "").replace(/\D/g, "");
            const sBoard = (s.board_roll_no || "").toLowerCase();
            const sName = (s.full_name || "").toLowerCase();
            return (
              sId === rawId ||
              sRoll === rawId ||
              sCollegeNo === rawId ||
              sBForm === rawId.replace(/\D/g, "") ||
              sBoard === rawId ||
              sName === rawId
            );
          });
          if (found) {
            matchedStudent = {
              ...found,
              fullName: found.full_name,
              fatherName: found.father_name,
              rollNo: found.roll_no,
              collegeNo: found.college_no,
              bayFormNo: found.bay_form_no,
              boardRollNo: found.board_roll_no,
              contact: found.contact,
              fatherContact: found.father_contact,
              secondaryContact: found.secondary_contact,
              academicPart: found.academic_part || "Part-1",
              session: found.session,
            };
          }
        }
      }

      if (!matchedStudent) {
        setLoginError("❌ Student Record Not Found.\nApka Roll No ya B-Form college record se match nahi ho raha. Baraye meharbani sahi Roll No darj karein.");
        setAuthLoading(false);
        return;
      }

      // Step B: Verify Credentials
      // Method 1: Check if registered custom password matches
      const isCustomPasswordMatch = verifyPortalAccountPassword(
        matchedStudent.id || matchedStudent.rollNo || "",
        "student",
        rawCred
      );

      // Method 2: Check registered phone / father contact / DOB / first name
      const contacts = [
        (matchedStudent.contact || "").replace(/[\s-]/g, "").toLowerCase(),
        (matchedStudent.fatherContact || "").replace(/[\s-]/g, "").toLowerCase(),
        (matchedStudent.secondaryContact || "").replace(/[\s-]/g, "").toLowerCase(),
      ].filter(Boolean);

      const isContactMatch = contacts.some(
        (c) => c.includes(rawCredClean) || rawCredClean.includes(c) || (rawCredClean.length >= 4 && c.endsWith(rawCredClean))
      );
      const isDobMatch = (matchedStudent.dob || "").replace(/[\s-]/g, "").toLowerCase() === rawCredClean;

      if (isCustomPasswordMatch || isContactMatch || isDobMatch) {
        onLoginSuccessStudent(matchedStudent);
        return;
      }

      setLoginError(
        "❌ Credential Mismatch.\nAapka Password ya Mobile number galat hai.\nAgar aap password bhool gaye hain to 'Forgot Password?' par click karein."
      );
      setAuthLoading(false);
    } catch (err: any) {
      setLoginError(`❌ Verification error: ${err?.message || "Server connection error"}`);
      setAuthLoading(false);
    }
  };

  const handleStaffSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setLoginError("");

    const rawId = staffIdInput.trim().toLowerCase();
    const rawCred = staffCredInput.trim();
    const rawCredClean = rawCred.toLowerCase().replace(/[\s-]/g, "");

    if (!rawId || !rawCred) {
      setLoginError("Please enter your Staff ID / Name and Password or CNIC / Mobile Number.");
      setAuthLoading(false);
      return;
    }

    try {
      // Find staff in memory
      let matchedStaff = (staffList || []).find((st) => {
        const stId = (st.id || "").toLowerCase();
        const stName = (st.fullName || "").toLowerCase();
        return stId === rawId || stName.includes(rawId) || rawId.includes(stName);
      });

      // Query Supabase fallback
      if (!matchedStaff && isSupabaseConfigured) {
        const { data: dbStaff } = await supabase.from("staff").select("*");
        if (dbStaff && dbStaff.length > 0) {
          const found = dbStaff.find((st: any) => {
            const stId = (st.id || "").toLowerCase();
            const stName = (st.full_name || "").toLowerCase();
            return stId === rawId || stName.includes(rawId) || rawId.includes(stName);
          });
          if (found) {
            matchedStaff = {
              ...found,
              fullName: found.full_name,
              contact: found.contact,
              cnic: found.cnic,
              role: found.role,
            };
          }
        }
      }

      if (!matchedStaff) {
        setLoginError("❌ Staff Profile Not Found.\nStaff ID ya Naam college record se match nahi hua.");
        setAuthLoading(false);
        return;
      }

      // Check credentials: custom password OR CNIC/Phone
      const isCustomPasswordMatch = verifyPortalAccountPassword(
        matchedStaff.id,
        "staff",
        rawCred
      );

      const stCnic = (matchedStaff.cnic || "").replace(/[\s-]/g, "").toLowerCase();
      const stPhone = (matchedStaff.contact || "").replace(/[\s-]/g, "").toLowerCase();
      const isCnicOrPhoneMatch =
        (stCnic && (stCnic.includes(rawCredClean) || rawCredClean.includes(stCnic) || (rawCredClean.length >= 4 && stCnic.endsWith(rawCredClean)))) ||
        (stPhone && (stPhone.includes(rawCredClean) || rawCredClean.includes(stPhone) || (rawCredClean.length >= 4 && stPhone.endsWith(rawCredClean))));

      if (isCustomPasswordMatch || isCnicOrPhoneMatch) {
        onLoginSuccessStaff(matchedStaff);
        return;
      }

      setLoginError(
        "❌ Security Match Failed.\nAapka Password ya CNIC/Phone number galat hai.\nPassword reset karne ke liye 'Forgot Password?' use karein."
      );
      setAuthLoading(false);
    } catch (err: any) {
      setLoginError(`❌ Verification error: ${err?.message || "Server connection error"}`);
      setAuthLoading(false);
    }
  };

  // ==========================================
  // 2. CREATE ACCOUNT (SIGN UP) LOGIC
  // ==========================================
  const handleVerifyForSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingSignup(true);
    setLoginError("");
    setVerifiedRecord(null);

    const rawId = regIdentifier.trim().toLowerCase();
    const rawPhone = regPhone.trim().toLowerCase().replace(/[\s-]/g, "");

    if (!rawId || !rawPhone) {
      setLoginError("Baraye meharbani apna Roll No / Staff ID aur registered phone number darj karein.");
      setVerifyingSignup(false);
      return;
    }

    try {
      if (loginPortal === "student") {
        let matched = (students || []).find((s) => {
          const sId = (s.id || "").toLowerCase();
          const sRoll = (s.rollNo || "").toLowerCase();
          const sCollegeNo = (s.collegeNo || "").toLowerCase();
          const sBForm = (s.bayFormNo || "").replace(/\D/g, "");
          const sBoard = (s.boardRollNo || "").toLowerCase();
          const idMatch = sId === rawId || sRoll === rawId || sCollegeNo === rawId || sBForm === rawId.replace(/\D/g, "") || sBoard === rawId;
          if (!idMatch) return false;

          const contacts = [
            (s.contact || "").replace(/[\s-]/g, "").toLowerCase(),
            (s.fatherContact || "").replace(/[\s-]/g, "").toLowerCase(),
            (s.secondaryContact || "").replace(/[\s-]/g, "").toLowerCase(),
          ].filter(Boolean);

          return contacts.some(c => c.includes(rawPhone) || rawPhone.includes(c) || (rawPhone.length >= 4 && c.endsWith(rawPhone)));
        });

        // Query Supabase fallback
        if (!matched && isSupabaseConfigured) {
          const { data: dbStudents } = await supabase.from("students").select("*");
          if (dbStudents && dbStudents.length > 0) {
            const found = dbStudents.find((s: any) => {
              const sId = (s.id || "").toLowerCase();
              const sRoll = (s.roll_no || "").toLowerCase();
              const sCollegeNo = (s.college_no || "").toLowerCase();
              const sBForm = (s.bay_form_no || "").replace(/\D/g, "");
              const idMatch = sId === rawId || sRoll === rawId || sCollegeNo === rawId || sBForm === rawId.replace(/\D/g, "");
              if (!idMatch) return false;

              const contacts = [
                (s.contact || s.contact_number || "").replace(/[\s-]/g, "").toLowerCase(),
                (s.father_contact || "").replace(/[\s-]/g, "").toLowerCase(),
                (s.secondary_contact || "").replace(/[\s-]/g, "").toLowerCase(),
              ].filter(Boolean);

              return contacts.some(c => c.includes(rawPhone) || rawPhone.includes(c) || (rawPhone.length >= 4 && c.endsWith(rawPhone)));
            });

            if (found) {
              matched = {
                ...found,
                fullName: found.full_name,
                fatherName: found.father_name,
                rollNo: found.roll_no,
                collegeNo: found.college_no,
                category: found.category,
                group: found.group,
                contact: found.contact || found.contact_number,
              };
            }
          }
        }

        if (!matched) {
          setLoginError(
            "❌ College Record Not Found.\nSystem mein ye Roll No aur phone number match nahi hua.\nKripya confirm karein ke wahi phone number darj kiya hai jo admission form par diya gaya tha."
          );
          setVerifyingSignup(false);
          return;
        }

        setVerifiedRecord({
          id: matched.id,
          fullName: matched.fullName,
          fatherName: matched.fatherName,
          groupOrRole: `${matched.group || ""} • ${matched.category || ""}`,
          contact: matched.contact,
          rollNo: matched.rollNo || matched.collegeNo || matched.id,
          raw: matched,
        });
        toast.success(`Identity Verified: ${matched.fullName}`);
      } else if (loginPortal === "staff") {
        let matched = (staffList || []).find((st) => {
          const stId = (st.id || "").toLowerCase();
          const stCnic = (st.cnic || "").replace(/[\s-]/g, "").toLowerCase();
          const idMatch = stId === rawId || stCnic === rawId.replace(/[\s-]/g, "");
          if (!idMatch) return false;

          const stPhone = (st.contact || "").replace(/[\s-]/g, "").toLowerCase();
          return stPhone.includes(rawPhone) || rawPhone.includes(stPhone) || (rawPhone.length >= 4 && stPhone.endsWith(rawPhone));
        });

        if (!matched && isSupabaseConfigured) {
          const { data: dbStaff } = await supabase.from("staff").select("*");
          if (dbStaff && dbStaff.length > 0) {
            const found = dbStaff.find((st: any) => {
              const stId = (st.id || "").toLowerCase();
              const stCnic = (st.cnic || "").replace(/[\s-]/g, "").toLowerCase();
              const idMatch = stId === rawId || stCnic === rawId.replace(/[\s-]/g, "");
              if (!idMatch) return false;

              const stPhone = (st.contact || "").replace(/[\s-]/g, "").toLowerCase();
              return stPhone.includes(rawPhone) || rawPhone.includes(stPhone) || (rawPhone.length >= 4 && stPhone.endsWith(rawPhone));
            });

            if (found) {
              matched = {
                ...found,
                fullName: found.full_name,
                fatherName: found.father_name,
                role: found.role,
                contact: found.contact,
                cnic: found.cnic,
              };
            }
          }
        }

        if (!matched) {
          setLoginError(
            "❌ Faculty Profile Not Found.\nStaff ID / CNIC aur mobile number match nahi ho raha.\nCoordinator office se rabta karein."
          );
          setVerifyingSignup(false);
          return;
        }

        setVerifiedRecord({
          id: matched.id,
          fullName: matched.fullName,
          fatherName: matched.fatherName,
          groupOrRole: matched.role || "Faculty Member",
          contact: matched.contact,
          rollNo: matched.id,
          raw: matched,
        });
        toast.success(`Identity Verified: Professor ${matched.fullName}`);
      }
    } catch (err: any) {
      setLoginError(`Verification error: ${err?.message || "Check connection"}`);
    } finally {
      setVerifyingSignup(false);
    }
  };

  const handleCompleteAccountCreation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedRecord) return;

    if (!regNewPassword || regNewPassword.length < 6) {
      setLoginError("Password kam az kam 6 characters ka hona chahiye.");
      return;
    }

    if (regNewPassword !== regConfirmPassword) {
      setLoginError("Dono passwords aapas mein match nahi kar rahay. Kripya check karein.");
      return;
    }

    try {
      savePortalAccount({
        id: verifiedRecord.id,
        type: loginPortal as "student" | "staff",
        identifier: verifiedRecord.rollNo || verifiedRecord.id,
        fullName: verifiedRecord.fullName,
        contact: verifiedRecord.contact || "",
        passwordHash: regNewPassword.trim(),
      });

      toast.success("🎉 Account Created Successfully! You are now logging in...");

      // Automatically sign the user in!
      if (loginPortal === "student") {
        onLoginSuccessStudent(verifiedRecord.raw);
      } else if (loginPortal === "staff") {
        onLoginSuccessStaff(verifiedRecord.raw);
      }
    } catch (err: any) {
      setLoginError(`Account creation failed: ${err?.message}`);
    }
  };

  // ==========================================
  // 3. RESET PASSWORD LOGIC
  // ==========================================
  const handleVerifyForReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingReset(true);
    setLoginError("");
    setVerifiedResetRecord(null);

    const rawId = resetIdentifier.trim().toLowerCase();
    const rawPhone = resetPhone.trim().toLowerCase().replace(/[\s-]/g, "");

    if (!rawId || !rawPhone) {
      setLoginError("Baraye meharbani Roll No / Staff ID aur registered phone number darj karein.");
      setVerifyingReset(false);
      return;
    }

    try {
      if (loginPortal === "student") {
        let matched = (students || []).find((s) => {
          const sId = (s.id || "").toLowerCase();
          const sRoll = (s.rollNo || "").toLowerCase();
          const sCollegeNo = (s.collegeNo || "").toLowerCase();
          const sBForm = (s.bayFormNo || "").replace(/\D/g, "");
          const idMatch = sId === rawId || sRoll === rawId || sCollegeNo === rawId || sBForm === rawId.replace(/\D/g, "");
          if (!idMatch) return false;

          const contacts = [
            (s.contact || "").replace(/[\s-]/g, "").toLowerCase(),
            (s.fatherContact || "").replace(/[\s-]/g, "").toLowerCase(),
            (s.secondaryContact || "").replace(/[\s-]/g, "").toLowerCase(),
          ].filter(Boolean);

          return contacts.some(c => c.includes(rawPhone) || rawPhone.includes(c) || (rawPhone.length >= 4 && c.endsWith(rawPhone)));
        });

        if (!matched && isSupabaseConfigured) {
          const { data: dbStudents } = await supabase.from("students").select("*");
          if (dbStudents) {
            matched = dbStudents.find((s: any) => {
              const sRoll = (s.roll_no || "").toLowerCase();
              const sId = (s.id || "").toLowerCase();
              const idMatch = sId === rawId || sRoll === rawId;
              if (!idMatch) return false;
              const contacts = [(s.contact || "").replace(/[\s-]/g, "").toLowerCase(), (s.father_contact || "").replace(/[\s-]/g, "").toLowerCase()];
              return contacts.some((c: string) => c.includes(rawPhone) || rawPhone.includes(c));
            });
            if (matched) {
              matched = { ...matched, fullName: matched.full_name, fatherName: matched.father_name, rollNo: matched.roll_no };
            }
          }
        }

        if (!matched) {
          setLoginError("❌ Student Record Match Nahi Hua. Baraye meharbani apna Roll No aur college mein diya gaya mobile number check karein.");
          setVerifyingReset(false);
          return;
        }

        setVerifiedResetRecord({
          id: matched.id,
          fullName: matched.fullName,
          fatherName: matched.fatherName,
          groupOrRole: matched.group || "Student",
          contact: matched.contact,
          rollNo: matched.rollNo || matched.id,
          raw: matched,
        });
        toast.success(`Identity Verified: ${matched.fullName}`);
      } else if (loginPortal === "staff") {
        let matched = (staffList || []).find((st) => {
          const stId = (st.id || "").toLowerCase();
          const stCnic = (st.cnic || "").replace(/[\s-]/g, "").toLowerCase();
          const idMatch = stId === rawId || stCnic === rawId.replace(/[\s-]/g, "");
          if (!idMatch) return false;

          const stPhone = (st.contact || "").replace(/[\s-]/g, "").toLowerCase();
          return stPhone.includes(rawPhone) || rawPhone.includes(stPhone);
        });

        if (!matched) {
          setLoginError("❌ Faculty Profile Match Nahi Hua. Staff ID aur phone number check karein.");
          setVerifyingReset(false);
          return;
        }

        setVerifiedResetRecord({
          id: matched.id,
          fullName: matched.fullName,
          fatherName: matched.fatherName,
          groupOrRole: matched.role || "Faculty",
          contact: matched.contact,
          rollNo: matched.id,
          raw: matched,
        });
        toast.success(`Identity Verified: ${matched.fullName}`);
      }
    } catch (err: any) {
      setLoginError(`Reset verification error: ${err?.message}`);
    } finally {
      setVerifyingReset(false);
    }
  };

  const handleCompletePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedResetRecord) return;

    if (!resetNewPassword || resetNewPassword.length < 6) {
      setLoginError("Naya Password kam az kam 6 characters ka hona zaroori hai.");
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setLoginError("Confirm Password match nahi kar raha. Kripya dobara check karein.");
      return;
    }

    try {
      // If already registered, update; otherwise save new record
      const updated = resetPortalAccountPassword(
        verifiedResetRecord.id,
        loginPortal as "student" | "staff",
        resetNewPassword.trim()
      );

      if (!updated) {
        savePortalAccount({
          id: verifiedResetRecord.id,
          type: loginPortal as "student" | "staff",
          identifier: verifiedResetRecord.rollNo || verifiedResetRecord.id,
          fullName: verifiedResetRecord.fullName,
          contact: verifiedResetRecord.contact || "",
          passwordHash: resetNewPassword.trim(),
        });
      }

      toast.success("✅ Password Reset Successfully! Aapka naya password save ho gaya hai.");

      // Prefill signin inputs and switch to signin tab
      if (loginPortal === "student") {
        setStudentIdInput(verifiedResetRecord.rollNo || verifiedResetRecord.id);
        setStudentCredInput(resetNewPassword.trim());
      } else if (loginPortal === "staff") {
        setStaffIdInput(verifiedResetRecord.rollNo || verifiedResetRecord.id);
        setStaffCredInput(resetNewPassword.trim());
      }

      switchTab("signin");
    } catch (err: any) {
      setLoginError(`Password update error: ${err?.message}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 25 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 20, delay: 0.1 }}
      className="w-full max-w-md rounded-3xl bg-white/85 border border-slate-200/90 p-6 sm:p-8 shadow-[0_15px_45px_rgba(8,90,78,0.08),inset_0_1px_1px_rgba(255,255,255,1)] backdrop-blur-2xl relative overflow-hidden text-slate-800"
    >
      {/* Glossy Diagonal Reflection Sheen */}
      <div className="absolute top-0 -left-[100%] w-[200%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent transform -skew-x-12 pointer-events-none" />

      {/* Header Bar - (Create Account & Reset removed from top as requested) */}
      {activeTab === "signin" ? (
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5 relative z-10">
          <div className="text-left">
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {loginPortal === "student"
                ? "Student Sign In"
                : loginPortal === "staff"
                ? "Faculty Sign In"
                : "Admin Console Sign In"}
            </h3>
            <p className="text-[11px] text-slate-500">
              {loginPortal === "student"
                ? "Enter your Roll Number & Password / Phone"
                : loginPortal === "staff"
                ? "Enter your Staff ID & Password / CNIC"
                : "Master Administrator Access Terminal"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => switchTab("help")}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-xs font-bold text-slate-500 hover:text-[#086a5b] transition-colors cursor-pointer"
          >
            <HelpCircle size={14} className="text-[#086a5b]" />
            <span>Help</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5 relative z-10">
          <button
            type="button"
            onClick={() => switchTab("signin")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#086a5b] hover:text-[#064e43] transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} className="stroke-[2.5]" />
            <span>Back to Sign In</span>
          </button>

          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
            {activeTab === "signup"
              ? "Create Account"
              : activeTab === "reset"
              ? "Reset Password"
              : "Help & Support"}
          </span>
        </div>
      )}

      {/* Error Alert */}
      {loginError && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 text-red-700 text-xs font-semibold p-3.5 rounded-xl border border-red-200 flex items-start gap-2.5 whitespace-pre-line text-left leading-relaxed mb-4"
        >
          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-500" />
          <span className="flex-1">{loginError}</span>
        </motion.div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: SIGN IN FORM */}
      {/* ======================================================== */}
      {activeTab === "signin" && (
        <div className="space-y-4">
          {/* STUDENT SIGN IN */}
          {loginPortal === "student" && (
            <form onSubmit={handleStudentSignIn} className="space-y-4">
              <div className="space-y-3.5">
                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Roll No / B-Form
                  </label>
                  <div className="relative">
                    <UserCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="e.g. 1045, SGC-24-001, or B-Form"
                      type="text"
                      required
                      value={studentIdInput}
                      onChange={(e) => setStudentIdInput(e.target.value)}
                      className="pl-10 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl text-sm font-medium w-full focus:border-[#086a5b] focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Password or Mobile Number
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-slate-400 hover:text-slate-700 font-bold flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{showPassword ? "Hide" : "Show"}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Enter Password or Registered Mobile"
                      type={showPassword ? "text" : "password"}
                      required
                      value={studentCredInput}
                      onChange={(e) => setStudentCredInput(e.target.value)}
                      className="pl-10 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl text-sm font-medium w-full focus:border-[#086a5b] focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-[#086a5b] focus:ring-emerald-500 h-3.5 w-3.5"
                  />
                  <span>Remember me</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={authLoading}
                className="w-full mt-2 h-12 rounded-xl bg-gradient-to-r from-[#086a5b] to-[#0b8a76] hover:from-[#0a7a69] hover:to-[#0d9b85] text-white font-black text-xs uppercase tracking-[0.18em] shadow-[0_10px_25px_rgba(8,106,91,0.35)] hover:shadow-[0_15px_35px_rgba(8,106,91,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-80 active:scale-[0.98]"
              >
                {authLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 rounded-full border-2 border-white border-t-transparent shrink-0"
                    />
                    <span>VERIFYING STUDENT...</span>
                  </>
                ) : (
                  <>
                    <span>ENTER STUDENT PORTAL</span>
                    <GraduationCap size={15} className="stroke-[2.5]" />
                  </>
                )}
              </Button>

              {/* Consolidated Single-Location Account Options */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => switchTab("signup")}
                  className="font-bold text-[#086a5b] hover:text-[#064e43] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>New Student?</span>
                  <span className="font-black">Create Account &rarr;</span>
                </button>

                <span className="text-slate-300">•</span>

                <button
                  type="button"
                  onClick={() => switchTab("reset")}
                  className="font-bold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                >
                  Forgot Password? Reset
                </button>
              </div>

              <div className="text-center pt-1">
                <span className="text-[11px] text-slate-400">
                  ⚡ Instant check for <span className="text-slate-700 font-bold">Bank Fee Challans</span> & <span className="text-slate-700 font-bold">Results</span>
                </span>
              </div>
            </form>
          )}

          {/* STAFF SIGN IN */}
          {loginPortal === "staff" && (
            <form onSubmit={handleStaffSignIn} className="space-y-4">
              <div className="space-y-3.5">
                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Staff ID / Full Name
                  </label>
                  <div className="relative">
                    <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="e.g. STF-001 or Professor Name"
                      type="text"
                      required
                      value={staffIdInput}
                      onChange={(e) => setStaffIdInput(e.target.value)}
                      className="pl-10 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl text-sm font-medium w-full focus:border-[#086a5b] focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Password or CNIC / Mobile
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-slate-400 hover:text-slate-700 font-bold flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{showPassword ? "Hide" : "Show"}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Password, CNIC or Registered Mobile"
                      type={showPassword ? "text" : "password"}
                      required
                      value={staffCredInput}
                      onChange={(e) => setStaffCredInput(e.target.value)}
                      className="pl-10 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl text-sm font-medium w-full focus:border-[#086a5b] focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-[#086a5b] focus:ring-emerald-500 h-3.5 w-3.5"
                  />
                  <span>Remember me</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={authLoading}
                className="w-full mt-2 h-12 rounded-xl bg-gradient-to-r from-[#086a5b] to-[#0b8a76] hover:from-[#0a7a69] hover:to-[#0d9b85] text-white font-black text-xs uppercase tracking-[0.18em] shadow-[0_10px_25px_rgba(8,106,91,0.35)] hover:shadow-[0_15px_35px_rgba(8,106,91,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-80 active:scale-[0.98]"
              >
                {authLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 rounded-full border-2 border-white border-t-transparent shrink-0"
                    />
                    <span>VERIFYING FACULTY...</span>
                  </>
                ) : (
                  <>
                    <span>ENTER FACULTY PORTAL</span>
                    <Briefcase size={15} className="stroke-[2.5]" />
                  </>
                )}
              </Button>

              {/* Consolidated Single-Location Account Options */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => switchTab("signup")}
                  className="font-bold text-[#086a5b] hover:text-[#064e43] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>New Faculty?</span>
                  <span className="font-black">Create Account &rarr;</span>
                </button>

                <span className="text-slate-300">•</span>

                <button
                  type="button"
                  onClick={() => switchTab("reset")}
                  className="font-bold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                >
                  Forgot Password? Reset
                </button>
              </div>

              <div className="text-center pt-1">
                <span className="text-[11px] text-slate-400">
                  💼 Access <span className="text-slate-700 font-bold">Lecture Rosters</span> & <span className="text-slate-700 font-bold">Monthly Payslips</span>
                </span>
              </div>
            </form>
          )}

          {/* ADMIN SIGN IN */}
          {loginPortal === "admin" && (
            <form onSubmit={onAdminLogin} className="space-y-4">
              <div className="space-y-3.5">
                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Admin Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="admin@superior.edu"
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="pl-10 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl text-sm font-medium w-full focus:border-[#086a5b] focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Master Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Enter Master Password"
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="pl-10 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl text-sm font-medium w-full focus:border-[#086a5b] focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-[#086a5b] focus:ring-emerald-500 h-3.5 w-3.5"
                  />
                  <span>Remember me</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={authLoading}
                className="w-full mt-3 h-12 rounded-xl bg-gradient-to-r from-[#086a5b] to-[#0b8a76] hover:from-[#0a7a69] hover:to-[#0d9b85] text-white font-black text-xs uppercase tracking-[0.18em] shadow-[0_10px_25px_rgba(8,106,91,0.35)] hover:shadow-[0_15px_35px_rgba(8,106,91,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-80 active:scale-[0.98]"
              >
                {authLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 rounded-full border-2 border-white border-t-transparent shrink-0"
                    />
                    <span>AUTHENTICATING COMMAND...</span>
                  </>
                ) : (
                  <>
                    <span>LAUNCH COMMAND CENTER</span>
                    <Shield size={15} className="stroke-[2.5]" />
                  </>
                )}
              </Button>

              {/* Consolidated Bottom Option */}
              <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => toast.info("Super Admin access recovery requires master database credentials.")}
                  className="font-bold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                >
                  Forgot Master Password? Recovery Support
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CREATE ACCOUNT (REGISTRATION WITH VERIFICATION) */}
      {/* ======================================================== */}
      {activeTab === "signup" && (
        <div className="space-y-4">
          <div className="text-left mb-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#086a5b] text-[10px] font-black uppercase tracking-wider mb-1">
              <UserPlus size={11} />
              <span>New Account Registration</span>
            </div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Create Your {loginPortal === "student" ? "Student" : "Faculty"} Account
            </h3>
            <p className="text-[11px] text-slate-500 leading-tight">
              Pehle college records se verification zaroori hai taake security confirm ho sake.
            </p>
          </div>

          {/* STEP 1: VERIFICATION FORM (If not verified yet) */}
          {!verifiedRecord ? (
            <form onSubmit={handleVerifyForSignup} className="space-y-3.5">
              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  {loginPortal === "student" ? "Roll No / B-Form / College No" : "Staff ID / CNIC"}
                </label>
                <div className="relative">
                  <UserCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder={loginPortal === "student" ? "e.g. 1045 or SGC-24-001" : "e.g. STF-001 or 36302-XXXXXXX-X"}
                    type="text"
                    required
                    value={regIdentifier}
                    onChange={(e) => setRegIdentifier(e.target.value)}
                    className="pl-10 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl text-sm font-medium w-full focus:border-[#086a5b] focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Registered Mobile Number
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="College record mein diya gaya phone number"
                    type="text"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="pl-10 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl text-sm font-medium w-full focus:border-[#086a5b] focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-xs"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  {loginPortal === "student" ? "Student ya Walid ka registered mobile number darj karein." : "Faculty profile mein darj contact number darj karein."}
                </p>
              </div>

              <Button
                type="submit"
                disabled={verifyingSignup}
                className="w-full mt-2 h-11 rounded-xl bg-gradient-to-r from-[#086a5b] to-[#0b8a76] hover:from-[#0a7a69] hover:to-[#0d9b85] text-white font-black text-xs uppercase tracking-[0.16em] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {verifyingSignup ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 rounded-full border-2 border-white border-t-transparent shrink-0"
                    />
                    <span>VERIFYING SYSTEM DETAILS...</span>
                  </>
                ) : (
                  <>
                    <span>VERIFY MY DETAILS</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </Button>
            </form>
          ) : (
            /* STEP 2: VERIFIED RECORD CARD + SET PASSWORD */
            <form onSubmit={handleCompleteAccountCreation} className="space-y-3.5">
              {/* Verified Identity Badge Card */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex items-start gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                      Record Verified & Match OK
                    </span>
                    <button
                      type="button"
                      onClick={() => setVerifiedRecord(null)}
                      className="text-[10px] text-emerald-700 underline font-bold"
                    >
                      Change
                    </button>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 truncate">
                    {verifiedRecord.fullName}
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium">
                    {verifiedRecord.fatherName ? `S/O ${verifiedRecord.fatherName}` : ""} • {verifiedRecord.groupOrRole}
                  </p>
                  <p className="text-[10px] font-mono text-emerald-700 font-bold mt-0.5">
                    ID: {verifiedRecord.rollNo}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Create New Password (Min 6 chars)
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Apna secret password banayein"
                    type="password"
                    required
                    value={regNewPassword}
                    onChange={(e) => setRegNewPassword(e.target.value)}
                    className="pl-10 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl text-sm font-medium w-full focus:border-[#086a5b] focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Dobara wahi password darj karein"
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="pl-10 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl text-sm font-medium w-full focus:border-[#086a5b] focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-2 h-11 rounded-xl bg-gradient-to-r from-[#086a5b] to-[#0b8a76] hover:from-[#0a7a69] hover:to-[#0d9b85] text-white font-black text-xs uppercase tracking-[0.16em] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={14} />
                <span>SAVE PASSWORD & ACTIVATE</span>
              </Button>
            </form>
          )}

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => switchTab("signin")}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold inline-flex items-center gap-1"
            >
              <ArrowLeft size={13} />
              <span>Already have password? Back to Sign In</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: RESET PASSWORD */}
      {/* ======================================================== */}
      {activeTab === "reset" && (
        <div className="space-y-4">
          <div className="text-left mb-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-black uppercase tracking-wider mb-1 border border-amber-200">
              <RefreshCw size={11} />
              <span>Password Recovery & Reset</span>
            </div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Reset Your Forgotten Password
            </h3>
            <p className="text-[11px] text-slate-500 leading-tight">
              Apni pehchan verify karwa kar naya password set karein.
            </p>
          </div>

          {!verifiedResetRecord ? (
            <form onSubmit={handleVerifyForReset} className="space-y-3.5">
              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  {loginPortal === "student" ? "Roll No / B-Form / College No" : "Staff ID / CNIC"}
                </label>
                <div className="relative">
                  <UserCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder={loginPortal === "student" ? "e.g. 1045 or SGC-24-001" : "e.g. STF-001"}
                    type="text"
                    required
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    className="pl-10 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl text-sm font-medium w-full focus:border-[#086a5b] focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Registered Mobile Number
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="College record ka phone number"
                    type="text"
                    required
                    value={resetPhone}
                    onChange={(e) => setResetPhone(e.target.value)}
                    className="pl-10 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl text-sm font-medium w-full focus:border-[#086a5b] focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={verifyingReset}
                className="w-full mt-2 h-11 rounded-xl bg-gradient-to-r from-[#086a5b] to-[#0b8a76] hover:from-[#0a7a69] hover:to-[#0d9b85] text-white font-black text-xs uppercase tracking-[0.16em] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {verifyingReset ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 rounded-full border-2 border-white border-t-transparent shrink-0"
                    />
                    <span>VERIFYING PROFILE...</span>
                  </>
                ) : (
                  <>
                    <span>VERIFY IDENTITY TO RESET</span>
                    <KeyRound size={14} />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCompletePasswordReset} className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex items-start gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                    Identity Verified
                  </span>
                  <h4 className="text-sm font-black text-slate-900 truncate">
                    {verifiedResetRecord.fullName}
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium">
                    {verifiedResetRecord.groupOrRole} • ID: {verifiedResetRecord.rollNo}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Naya Password (Min 6 chars)
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Enter new password"
                    type="password"
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="pl-10 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl text-sm font-medium w-full focus:border-[#086a5b] focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Confirm Naya Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Re-enter new password"
                    type="password"
                    required
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    className="pl-10 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl text-sm font-medium w-full focus:border-[#086a5b] focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-2 h-11 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black text-xs uppercase tracking-[0.16em] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>SAVE NEW PASSWORD</span>
              </Button>
            </form>
          )}

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => switchTab("signin")}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold inline-flex items-center gap-1"
            >
              <ArrowLeft size={13} />
              <span>Back to Sign In</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: HELP & DETAILED INSTRUCTIONS GUIDE */}
      {/* ======================================================== */}
      {activeTab === "help" && (
        <div className="space-y-3.5 text-left">
          {/* Guide Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#086a5b] flex items-center justify-center">
                <Info size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Authentication & Portal Guide
                </h4>
                <p className="text-[10px] text-slate-500">
                  Superior College Jahanian Portal Madad
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => switchTab("signin")}
              className="text-[11px] font-bold text-[#086a5b] hover:underline flex items-center gap-1"
            >
              <ArrowLeft size={12} />
              <span>Sign In</span>
            </button>
          </div>

          {/* Sub-Tabs for Guide */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/90 rounded-xl text-[10px] font-bold text-center">
            <button
              type="button"
              onClick={() => setHelpSubTab("signin")}
              className={`py-1.5 rounded-lg transition-all ${
                helpSubTab === "signin" ? "bg-white text-slate-950 font-black shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setHelpSubTab("signup")}
              className={`py-1.5 rounded-lg transition-all ${
                helpSubTab === "signup" ? "bg-white text-slate-950 font-black shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => setHelpSubTab("reset")}
              className={`py-1.5 rounded-lg transition-all ${
                helpSubTab === "reset" ? "bg-white text-slate-950 font-black shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setHelpSubTab("contact")}
              className={`py-1.5 rounded-lg transition-all ${
                helpSubTab === "contact" ? "bg-white text-slate-950 font-black shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Support
            </button>
          </div>

          {/* Sub-Tab 1: How to Sign In */}
          {helpSubTab === "signin" && (
            <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/70 leading-relaxed">
              <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                <GraduationCap size={15} className="text-[#086a5b]" />
                <span>1. Login Ka Tarika (How to Sign In)</span>
              </div>
              <ul className="space-y-2 pl-1 list-none text-[11px]">
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-[#086a5b] font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">A</span>
                  <span><strong>Student Portal:</strong> Apna Roll No (maslan <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono">1045</code> ya <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono">SGC-24-001</code>) aur registered mobile number darj karein. Agar aap ne password banaya hai to apna password bhi darj kar sakte hain.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-[#086a5b] font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">B</span>
                  <span><strong>Faculty Portal:</strong> Apna Staff ID (e.g. <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono">STF-001</code>) aur CNIC ya contact number likhein.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-[#086a5b] font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">C</span>
                  <span><strong>Admin Console:</strong> Official authorized email address aur master administrative password darj karein.</span>
                </li>
              </ul>
            </div>
          )}

          {/* Sub-Tab 2: How to Create Account */}
          {helpSubTab === "signup" && (
            <div className="space-y-2.5 text-xs text-slate-700 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200/70 leading-relaxed">
              <div className="flex items-center gap-1.5 text-emerald-950 font-bold">
                <UserPlus size={15} className="text-[#086a5b]" />
                <span>2. Account Banane Ka Tarika (Registration)</span>
              </div>
              <div className="space-y-2 text-[11px] text-slate-700">
                <p>Aap apna personal password set kar sakte hain taake aainda asani se login ho sakein:</p>
                <ol className="space-y-1.5 list-decimal pl-4">
                  <li>Upper <strong>'Create Account'</strong> tab par click karein.</li>
                  <li><strong>System Verification:</strong> Apna Roll No / Staff ID aur admission form mein diya gaya mobile number darj karein.</li>
                  <li>System college database se aapka naam aur class verify karega.</li>
                  <li>Verification ke baad apna 6+ characters ka secret password banayein aur confirm karein.</li>
                  <li>Save karte hi aapka account foran activate ho jayega!</li>
                </ol>
                <div className="pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => switchTab("signup")}
                    className="h-8 bg-[#086a5b] text-white text-[10px] font-bold rounded-lg"
                  >
                    Create Account Now &rarr;
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 3: How to Reset Password */}
          {helpSubTab === "reset" && (
            <div className="space-y-2.5 text-xs text-slate-700 bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/70 leading-relaxed">
              <div className="flex items-center gap-1.5 text-amber-950 font-bold">
                <RefreshCw size={15} className="text-amber-700" />
                <span>3. Password Bhool Jane Par Reset Kaise Karein?</span>
              </div>
              <div className="space-y-2 text-[11px] text-slate-700">
                <p>Agar aap apna password bhool gaye hain to ghabrane ki zaroorat nahi:</p>
                <ol className="space-y-1.5 list-decimal pl-4">
                  <li><strong>'Reset'</strong> tab par ya Sign In form mein <strong>'Forgot Password?'</strong> par click karein.</li>
                  <li>Apna Roll No / Staff ID aur registered contact number darj karein.</li>
                  <li>System verification ke baad naya password type karne ka option dega.</li>
                  <li>Naya password darj karein aur 'Save New Password' par click karein.</li>
                  <li>Aapka password update ho jayega aur aap foran login kar sakein gay!</li>
                </ol>
                <div className="pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => switchTab("reset")}
                    className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg"
                  >
                    Reset Password Now &rarr;
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 4: Support & Campus Helpdesk */}
          {helpSubTab === "contact" && (
            <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 leading-relaxed">
              <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                <PhoneCall size={15} className="text-[#086a5b]" />
                <span>4. Campus IT Support & Helpline</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Agar aapka phone number tabdeel ho gaya hai ya record match nahi ho raha:
              </p>
              <div className="space-y-1.5 text-[11px] bg-white p-2.5 rounded-xl border border-slate-200/80">
                <p><strong>📍 Office:</strong> IT Control Desk, Admin Block, Superior College Jahanian</p>
                <p><strong>📞 Phone:</strong> 0300-1234567 / (065) 261234</p>
                <p><strong>⏰ Timings:</strong> Monday to Saturday (08:00 AM - 02:00 PM)</p>
              </div>
            </div>
          )}

          {/* Return button */}
          <div className="pt-2 text-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => switchTab("signin")}
              className="w-full h-10 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              <span>Back to Sign In Screen</span>
            </Button>
          </div>
        </div>
      )}

      {/* Footer Branding Guarantee */}
      <div className="mt-5 pt-3 border-t border-slate-200/70 text-center text-[10px] text-slate-400">
        <span>Copyright © 2026 Superior Group of Colleges Jahanian. All rights reserved.</span>
      </div>
    </motion.div>
  );
}
