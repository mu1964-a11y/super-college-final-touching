import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  KeyRound,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { toast } from 'sonner';

interface PortalAuthCardProps {
  loginPortal: 'admin' | 'staff' | 'student';
  currentPortalConfig: any;
  brandingSettings: any;
  students: any[];
  staffList: any[];
  authLoading: boolean;
  setAuthLoading: (v: boolean) => void;
  onLoginSuccessStudent: (student: any) => void;
  onLoginSuccessStaff: (staff: any) => void;
  onAdminLogin: (e: React.FormEvent) => void;
  adminEmail: string;
  setAdminEmail: (v: string) => void;
  adminPassword: string;
  setAdminPassword: (v: string) => void;
  rememberMe: boolean;
  setRememberMe: (v: boolean) => void;
  onBackToGateway: () => void;
}

export default function PortalAuthCard({
  loginPortal,
  currentPortalConfig,
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
  const [showPass, setShowPass] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [secretPin, setSecretPin] = useState('');

  const handlePortalLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim().toLowerCase();
    const cleanPin = secretPin.trim().replace(/\D/g, '');

    if (!cleanId) {
      toast.error(
        loginPortal === 'student'
          ? 'Please enter your Roll Number or Student ID'
          : 'Please enter your Staff ID (e.g. SGC-T-002) or Registered Mobile'
      );
      return;
    }

    if (cleanPin.length < 4) {
      toast.error(
        'Please enter your 4-digit Security PIN (Last 4 digits of registered Mobile or CNIC / B-Form)'
      );
      return;
    }

    setAuthLoading(true);
    try {
      if (loginPortal === 'student') {
        let pool = students && students.length > 0 ? students : [];
        if (pool.length === 0 && isSupabaseConfigured) {
          const { data } = await supabase.from('students').select('*');
          if (data) {
            pool = data.map((s: any) => ({
              ...s,
              fullName: s.full_name || s.fullName,
              fatherName: s.father_name || s.fatherName,
              collegeNo: s.college_no || s.student_id || s.id,
              studentId: s.student_id || s.id,
              fatherContact: s.father_contact || s.contact,
              bayFormNo: s.bay_form_no || s.b_form,
              photo: s.photo_url || s.photo,
            }));
          }
        }

        const pin4 = cleanPin.slice(-4);
        const matched = pool.find((s: any) => {
          const roll = String(s.collegeNo || s.studentId || s.id || '').toLowerCase();
          const name = String(s.fullName || '').toLowerCase();
          const phone = String(s.contact || '').replace(/\D/g, '');
          const fatherPhone = String(s.fatherContact || '').replace(/\D/g, '');
          const bform = String(s.bayFormNo || '').replace(/\D/g, '');
          const idDigits = cleanId.replace(/\D/g, '');

          const idMatches =
            roll === cleanId ||
            name === cleanId ||
            (idDigits.length >= 7 &&
              (phone.endsWith(idDigits.slice(-7)) || fatherPhone.endsWith(idDigits.slice(-7))));
          if (!idMatches) return false;

          // If student has a registered phone or B-Form, require last 4 digits to match
          const hasStoredCredentials =
            phone.length >= 4 || fatherPhone.length >= 4 || bform.length >= 4;
          if (!hasStoredCredentials) {
            return roll === cleanId;
          }
          return (
            phone.endsWith(pin4) ||
            fatherPhone.endsWith(pin4) ||
            bform.endsWith(pin4)
          );
        });

        if (matched) {
          onLoginSuccessStudent(matched);
        } else {
          setAuthLoading(false);
          toast.error('Invalid Student ID / Roll No or 4-digit Security PIN.');
        }
      } else {
        let pool = staffList && staffList.length > 0 ? staffList : [];
        if (pool.length === 0 && isSupabaseConfigured) {
          const { data } = await supabase.from('staff').select('*');
          if (data) {
            pool = data.map((st: any) => ({
              ...st,
              fullName: st.full_name || st.fullName,
              fatherName: st.father_name || st.fatherName,
              photo: st.photo_url || st.photo,
              baseSalary: st.base_salary || st.salary,
              fingerprintTemplate: st.fingerprint_template || st.fingerprintTemplate,
            }));
          }
        }

        const pin4 = cleanPin.slice(-4);
        const idDigits = cleanId.replace(/\D/g, '');
        const matched = pool.find((st: any) => {
          const id = String(st.id || '').toLowerCase();
          const name = String(st.fullName || '').toLowerCase();
          const phone = String(st.contact || '').replace(/\D/g, '');
          const cnic = String(st.cnic || '').replace(/\D/g, '');

          const idMatches =
            id === cleanId ||
            name === cleanId ||
            (idDigits.length >= 7 && phone.endsWith(idDigits.slice(-7)));
          if (!idMatches) return false;

          const hasStoredCredentials = phone.length >= 4 || cnic.length >= 4;
          if (!hasStoredCredentials) {
            return id === cleanId;
          }
          return phone.endsWith(pin4) || cnic.endsWith(pin4);
        });

        if (matched) {
          onLoginSuccessStaff(matched);
        } else {
          setAuthLoading(false);
          toast.error(
            'Invalid Staff ID or 4-digit Security PIN. Enter your Staff ID and last 4 digits of registered Mobile/CNIC.'
          );
        }
      }
    } catch (err: any) {
      setAuthLoading(false);
      toast.error(err?.message || 'Error verifying portal login');
    }
  };

  if (loginPortal === 'admin') {
    return (
      <form onSubmit={onAdminLogin} className="w-full max-w-md space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900">
            {currentPortalConfig?.title || 'Administrator Sign In'}
          </h2>
          <p className="text-xs text-slate-500">
            {currentPortalConfig?.subtitle ||
              'Enter your institutional credentials to access the ERP'}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Official Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="principal@superior.edu.pk"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600"
            />
            <span>Keep session active</span>
          </label>
          <button
            type="button"
            onClick={onBackToGateway}
            className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft size={12} /> Switch Portal
          </button>
        </div>

        <button
          type="submit"
          disabled={authLoading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#064e43] to-[#085a4e] hover:opacity-95 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
        >
          <span>{authLoading ? 'Authenticating...' : 'Access Executive ERP'}</span>
          <ArrowRight size={16} />
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handlePortalLookup} className="w-full max-w-md space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-black text-slate-900">
          {loginPortal === 'student'
            ? 'Student & Parent Portal'
            : 'Faculty Self-Service Portal'}
        </h2>
        <p className="text-xs text-slate-500">
          {loginPortal === 'student'
            ? 'Enter your Roll Number / Student ID and 4-digit Security PIN'
            : 'Enter your Official Staff ID (e.g. SGC-T-002) and 4-digit Security PIN'}
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
            {loginPortal === 'student'
              ? 'Roll No / Student ID / Registered Mobile'
              : 'Official Staff ID / Registered Mobile'}
          </label>
          <div className="relative">
            <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={
                loginPortal === 'student'
                  ? 'e.g. SCJ-26-101 or 03001234567'
                  : 'e.g. SGC-T-002 or 03001234567'
              }
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
            4-Digit Security PIN (Last 4 Digits of Registered Mobile / CNIC)
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              maxLength={6}
              value={secretPin}
              onChange={(e) => setSecretPin(e.target.value)}
              placeholder="•••• (Required)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-0.5">
        <span className="text-[11px] text-slate-500">
          PIN = Last 4 digits of registered phone or CNIC
        </span>
        <button
          type="button"
          onClick={onBackToGateway}
          className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft size={12} /> Switch Portal
        </button>
      </div>

      <div className="space-y-2.5 pt-1">
        <button
          type="submit"
          disabled={authLoading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
        >
          <span>{authLoading ? 'Verifying Credentials...' : 'Sign In to Portal'}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
}
