import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Phone,
  Fingerprint,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { secugenService } from '../lib/secugenService';
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
  const [bioSigningIn, setBioSigningIn] = useState(false);

  const handlePortalLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim().toLowerCase();
    const cleanPin = secretPin.trim().replace(/\D/g, '');

    if (!cleanId) {
      toast.error('Please enter your Roll No / ID or Registered Phone Number');
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

        const matched = pool.find((s: any) => {
          const roll = String(s.collegeNo || s.studentId || s.id || '').toLowerCase();
          const name = String(s.fullName || '').toLowerCase();
          const phone = String(s.contact || s.fatherContact || '').replace(/\D/g, '');
          const idDigits = cleanId.replace(/\D/g, '');
          const idMatches =
            roll === cleanId ||
            name === cleanId ||
            (idDigits.length >= 7 && phone.endsWith(idDigits.slice(-7)));
          if (!idMatches) return false;
          if (!cleanPin) return true;
          return (
            phone.endsWith(cleanPin.slice(-4)) ||
            String(s.bayFormNo || '')
              .replace(/\D/g, '')
              .endsWith(cleanPin.slice(-4))
          );
        });

        if (matched) {
          onLoginSuccessStudent(matched);
        } else {
          setAuthLoading(false);
          toast.error('No matching student record found. Check Roll No or Contact Number.');
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

        const idDigits = cleanId.replace(/\D/g, '');
        const matched = pool.find((st: any) => {
          const id = String(st.id || '').toLowerCase();
          const name = String(st.fullName || '').toLowerCase();
          const phone = String(st.contact || '').replace(/\D/g, '');
          const cnic = String(st.cnic || '').replace(/\D/g, '');
          return (
            id === cleanId ||
            name.includes(cleanId) ||
            (idDigits.length >= 7 && phone.endsWith(idDigits.slice(-7))) ||
            (cleanPin.length >= 4 &&
              (phone.endsWith(cleanPin.slice(-4)) || cnic.endsWith(cleanPin.slice(-4))))
          );
        });

        if (matched) {
          onLoginSuccessStaff(matched);
        } else {
          setAuthLoading(false);
          toast.error('Faculty record not found. Enter your Staff ID (e.g. SGC-T-002), Name, or Mobile.');
        }
      }
    } catch (err: any) {
      setAuthLoading(false);
      toast.error(err?.message || 'Error verifying portal login');
    }
  };

  // 1-Touch Biometric Thumb Login for Faculty
  const handleFacultyBiometricLogin = async () => {
    setBioSigningIn(true);
    try {
      const cap = await secugenService.captureFingerprint({ timeoutMs: 9000, quality: 45 });
      if (!cap.success || !cap.templateBase64) {
        toast.error(cap.error || 'Could not capture fingerprint from SecuGen sensor');
        return;
      }

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

      const enrolled = pool.filter((st: any) => Boolean(st.fingerprintTemplate));
      for (const st of enrolled) {
        const m = await secugenService.matchTemplates(cap.templateBase64, st.fingerprintTemplate);
        if (m.matched) {
          onLoginSuccessStaff(st);
          return;
        }
      }
      toast.warning('Fingerprint did not match any enrolled faculty member.');
    } finally {
      setBioSigningIn(false);
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
            ? 'Enter your Roll Number or Registered Mobile Number'
            : 'Enter your Staff ID (e.g. SGC-T-002), Faculty Name, or Mobile Number'}
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
            {loginPortal === 'student'
              ? 'Roll No / Student ID / Mobile'
              : 'Staff ID / Faculty Name / Mobile'}
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
                  : 'e.g. SGC-T-002 or M. Tahir'
              }
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
            Verification PIN (Last 4 Digits of Phone / CNIC - Optional)
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={secretPin}
              onChange={(e) => setSecretPin(e.target.value)}
              placeholder="Last 4 digits"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2.5 pt-1">
        <button
          type="submit"
          disabled={authLoading || bioSigningIn}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
        >
          <span>{authLoading ? 'Verifying...' : 'Open Portal Dashboard'}</span>
          <ArrowRight size={16} />
        </button>

        {loginPortal === 'staff' && (
          <button
            type="button"
            onClick={handleFacultyBiometricLogin}
            disabled={authLoading || bioSigningIn}
            className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Fingerprint size={15} className="text-emerald-700" />
            <span>
              {bioSigningIn
                ? 'Place Enrolled Finger on SecuGen Scanner...'
                : '1-Touch Biometric Thumb Sign-In (Enrolled Faculty)'}
            </span>
          </button>
        )}
      </div>
    </form>
  );
}
