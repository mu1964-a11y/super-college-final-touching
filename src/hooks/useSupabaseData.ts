import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useLeadsOperations } from './data/useLeadsOperations';
import { useAdmissionsOperations } from './data/useAdmissionsOperations';
import { useStudentsOperations } from './data/useStudentsOperations';
import { useAccountsOperations } from './data/useAccountsOperations';
import { useStaffOperations } from './data/useStaffOperations';
import { useSettingsOperations } from './data/useSettingsOperations';
import { useAcademicOperations } from './data/useAcademicOperations';
import { 
  Lead, Admission, Student, Staff, Expense, Income, 
  AppSettings, UserPermission, Notification, AcademicRecord, 
  SalaryPayment, FeePayment, Installment, FeeTransaction, AdmissionStatus,
  ArchivedRecord
} from '../types';
import { toast } from 'sonner';
import { safeLocalStorage } from '../utils/safeStorage';
import { secugenService } from '../lib/secugenService';

function safeParseArray(val: any): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

export function useSupabaseData(user: any) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffAttendance, setStaffAttendance] = useState<any[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);
  const [staffTimetable, setStaffTimetable] = useState<any[]>([]);
  const [staffAdvances, setStaffAdvances] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [academicRecords, setAcademicRecords] = useState<AcademicRecord[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [deletedArchive, setDeletedArchive] = useState<ArchivedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isFetchingRef = useRef<boolean>(false);
  const isBulkOperatingRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [actionedItems, setActionedItems] = useState<string[]>(() => {
    try { return JSON.parse(safeLocalStorage.getItem('scj_actioned') || '[]'); } catch { return []; }
  });

  const markActioned = useCallback((id: string) => {
    setActionedItems(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      safeLocalStorage.setItem('scj_actioned', JSON.stringify(next));
      return next;
    });
  }, []);

  const isNewRecord = useCallback((id: string, dateStr?: string) => {
    if (actionedItems.includes(id)) return false;
    if (!dateStr) return false;
    const itemDate = new Date(dateStr);
    const launchDate = new Date('2026-04-24T00:00:00Z'); // Feature launch boundary
    return itemDate > launchDate;
  }, [actionedItems]);

  const fetchAllRecords = async (table: string, orderCol: string, countLimit: number = 50000) => {
    let allData: any[] = [];
    let from = 0;
    const step = 500; // Smaller step size to avoid server-side caps
    let hasMore = true;

    while (hasMore && allData.length < countLimit) {
      // Order by orderCol AND id to ensure stable pagination
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(orderCol, { ascending: false })
        .order('id', { ascending: false }) 
        .range(from, from + step - 1);

      if (error) {
        console.error(`Error fetching batch from ${table}:`, error);
        hasMore = false;
      } else if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += step;
        // If we got fewer than requested, we definitely hit the end
        if (data.length < step) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    return allData;
  };

  const runFullFetchData = useCallback(async (silent = false) => {
    // Prevent overlapping fetches or fetches during bulk operations
    if (isFetchingRef.current || isBulkOperatingRef.current || !isSupabaseConfigured) return;
    
    isFetchingRef.current = true;
    if (!silent) setLoading(true);
    try {
      // Use parallel fetch for simple items, but paginate large ones
      const [
        leadsData,
        admissionsData,
        studentsData,
        expensesData,
        incomeData,
        staffResult,
        staffAttendanceResult,
        staffTimetableResult,
        staffAdvancesResult,
        settingsResult,
        permissionsResponse,
        notificationsResult,
        academicRecordsResult,
        salaryPaymentsResult,
        studentAttendanceResult
      ] = await Promise.all([
        fetchAllRecords('leads', 'date_added'),
        fetchAllRecords('admissions', 'created_at'),
        fetchAllRecords('students', 'created_at'),
        fetchAllRecords('expenses', 'date'),
        fetchAllRecords('income', 'date'),
        supabase.from('staff').select('*').order('created_at', { ascending: false }).limit(1000),
        supabase.from('staff_attendance').select('*').order('date', { ascending: false }).limit(2000),
        supabase.from('staff_timetable').select('*').limit(1000),
        supabase.from('staff_advances').select('*').order('date_issued', { ascending: false }).limit(500),
        supabase.from('settings').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        fetch('/api/permissions').then(res => res.json()).catch(() => []),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(1000),
        fetchAllRecords('academic_records', 'date'),
        fetchAllRecords('salary_payments', 'date'),
        fetchAllRecords('student_attendance', 'date')
      ]);

      const { data: staffData } = staffResult;
      const { data: staffAttendanceData } = staffAttendanceResult;
      const { data: staffTimetableData } = staffTimetableResult;
      const { data: staffAdvancesData } = staffAdvancesResult;
      const { data: settingsData } = settingsResult;
      const permissionsData = Array.isArray(permissionsResponse) ? permissionsResponse : (permissionsResponse?.data || []);
      const { data: notificationsData } = notificationsResult;
      const academicRecordsData = academicRecordsResult || [];
      const salaryPaymentsData  = salaryPaymentsResult || [];
      const studentAttendanceData = studentAttendanceResult || [];

      const defaultSession = settingsData?.academic_session || '2026-28';

      if (leadsData) setLeads(leadsData.map(l => ({ 
        ...l, 
        studentName: l.student_name,
        fatherName: l.father_name,
        finalizedFee: l.package ?? l.finalized_fee,
        finalizedBy: l.finalized_by,
        previousSchool: l.previous_school,
        fatherPhone: l.father_phone,
        areaVillage: l.area_village,
        dateAdded: l.date_added,
        currentClass: l.current_class,
        isConverted: l.is_converted,
        session: l.session || defaultSession,
        subjects: l.subjects || [],
        pipelineStage: l.pipeline_stage || l.extra_info1 || (l.is_converted ? 'converted' : 'new'),
        followUpDate: l.follow_up_date || l.extra_info2 || '',
        notes: l.notes || '',
        source: l.source || (l.notes && l.notes.includes('[Source:') ? l.notes.match(/\[Source:\s*([^\]]+)\]/)?.[1] : undefined) || 'Campus Desk'
      })));
      if (admissionsData) setAdmissions(admissionsData.map(a => {
        const linkedStudent = studentsData?.find(s => 
          s.admission_id === a.id || 
          (a.student_id && (s.student_id === a.student_id || s.college_no === a.student_id)) || 
          (a.college_no && (s.college_no === a.college_no || s.student_id === a.college_no)) ||
          ((s.full_name || '').trim().toLowerCase() === (a.full_name || '').trim().toLowerCase() && (s.father_name || '').trim().toLowerCase() === (a.father_name || '').trim().toLowerCase())
        );
        const resolvedPhoto = a.photo || a.photo_url || linkedStudent?.photo || linkedStudent?.photo_url || '';

        return {
          ...a,
          fullName: a.full_name,
          fatherName: a.father_name,
          previousMarks: a.previous_marks,
          previousInstitute: a.previous_institute,
          collegeNo: a.college_no,
          bayFormNo: a.bay_form_no,
          admissionFee: a.admission_fee,
          miscFunds: a.misc_funds,
          totalFeeFinalized: a.total_fee_finalized,
          totalPackage: a.total_package,
          feeReceived: a.fee_received,
          paymentPlan: a.payment_plan,
          contactNumber: a.contact_number,
          fatherContact: a.father_contact,
          secondaryContact: a.secondary_contact,
          email: a.email,
          bloodGroup: a.blood_group,
          concessionReason: a.concession_reason || (a.reference && a.reference.startsWith('Concession:') ? a.reference.replace('Concession:', '').trim() : undefined),
          isAdmitted: a.is_admitted,
          session: a.session || defaultSession,
          sessionStartDate: a.session_start_date,
          sessionEndDate: a.session_end_date,
          academicPart: a.academic_part,
          programType: a.program_type || 'Yearly',
          currentSemester: a.current_semester,
          studentId: a.student_id,
          photo: resolvedPhoto, // Mapping photo_url from DB or linked student to photo in app
          feeHistory: a.fee_history || [],
          feeLedger: a.fee_ledger || null,
          source: a.source || (a.reference && a.reference.includes('[Source:') ? a.reference.match(/\[Source:\s*([^\]]+)\]/)?.[1] : undefined) || 'Campus Desk',
          fingerprintTemplate: a.fingerprint_template || (a as any).fingerprintTemplate || undefined,
          fingerprintFinger: a.fingerprint_finger || (a as any).fingerprintFinger || undefined,
          fingerprintEnrolledAt: a.fingerprint_enrolled_at || (a as any).fingerprintEnrolledAt || undefined
        };
      }));
      if (studentsData) {
        const deletedArchiveList = (settingsData?.config?.deletedArchive || []) as any[];
        const archivedIds = new Set<string>();
        const archivedNames = new Set<string>();
        deletedArchiveList.forEach((arch: any) => {
          if (arch.originalId) archivedIds.add(arch.originalId);
          if (arch.studentId) archivedIds.add(arch.studentId);
          if (arch.fullName && arch.fatherName) {
            archivedNames.add(`${arch.fullName.trim().toLowerCase()}::${arch.fatherName.trim().toLowerCase()}`);
          }
        });

        const activeStudentsData = studentsData.filter(s => {
          if ((s as any).status === 'archived' || (s as any).status === 'Deleted') return false;
          if (archivedIds.has(s.id) || (s.admission_id && archivedIds.has(s.admission_id))) return false;
          if (s.full_name && s.father_name && archivedNames.has(`${s.full_name.trim().toLowerCase()}::${s.father_name.trim().toLowerCase()}`)) return false;
          return true;
        });

        const mappedStudents = activeStudentsData.map(s => {
          let parsedSubjects = safeParseArray(s.subjects);
          
          let linkedAdmission = null;
          if (s.admission_id && admissionsData) {
             linkedAdmission = admissionsData.find(a => a.id === s.admission_id);
          }

          // Fallback to admissions table if missing in students
          if (parsedSubjects.length === 0 && linkedAdmission) {
             if (linkedAdmission.subjects) {
                 parsedSubjects = safeParseArray(linkedAdmission.subjects);
             }
          }

          let mappedPhoto = s.photo_url || s.photo;
          if (!mappedPhoto && linkedAdmission) {
             mappedPhoto = linkedAdmission.photo_url || linkedAdmission.photo;
          }

          return {
          ...s,
          photo: mappedPhoto,
          fullName: s.full_name || linkedAdmission?.full_name,
          fatherName: s.father_name || linkedAdmission?.father_name,
          collegeNo: s.college_no || linkedAdmission?.college_no,
          bayFormNo: s.bay_form_no || linkedAdmission?.bay_form_no,
          dob: s.dob || linkedAdmission?.dob,
          previousClass: s.previous_class || linkedAdmission?.previous_class,
          boardRollNo: s.board_roll_no || linkedAdmission?.board_roll_no,
          previousMarks: s.previous_marks ?? linkedAdmission?.previous_marks,
          contact: s.contact || linkedAdmission?.contact_number,
          fatherContact: s.father_contact || linkedAdmission?.father_contact,
          secondaryContact: s.secondary_contact || linkedAdmission?.secondary_contact,
          email: s.email || linkedAdmission?.email,
          bloodGroup: s.blood_group || linkedAdmission?.blood_group,
          concessionReason: s.concession_reason || linkedAdmission?.concession_reason,
          admissionFee: s.admission_fee ?? linkedAdmission?.admission_fee,
          miscFunds: s.misc_funds ?? linkedAdmission?.misc_funds,
          totalFeeFinalized: s.total_fee_finalized ?? linkedAdmission?.total_fee_finalized,
          totalPackage: Number(s.total_package ?? linkedAdmission?.total_package ?? 0),
          feeReceived: Number(s.fee_received ?? linkedAdmission?.fee_received ?? 0),
          totalInstallments: s.total_installments ?? linkedAdmission?.total_installments,
          monthlyFee: s.monthly_fee,
          admissionId: s.admission_id,
          session: s.session || linkedAdmission?.session || defaultSession,
          sessionStartDate: s.session_start_date || linkedAdmission?.session_start_date,
          sessionEndDate: s.session_end_date || linkedAdmission?.session_end_date,
          subjects: parsedSubjects,
          academicPart: s.academic_part || linkedAdmission?.academic_part || 'Part-1',
          programType: s.program_type || linkedAdmission?.program_type || 'Yearly',
          currentSemester: s.current_semester || linkedAdmission?.current_semester,
          createdAt: s.created_at || linkedAdmission?.created_at,
          created_at: s.created_at || linkedAdmission?.created_at,
          feeLedger: {
            ...(s.fee_ledger || {}),
            totalPackage: Number(s.total_package ?? linkedAdmission?.total_package ?? 0),
            totalReceived: Number(s.fee_received ?? linkedAdmission?.fee_received ?? 0),
            remainingBalance: Math.max(0, Number(s.total_package ?? linkedAdmission?.total_package ?? 0) - Number(s.fee_received ?? linkedAdmission?.fee_received ?? 0)),
            installments: s.fee_ledger?.installments || [],
            transactions: s.fee_ledger?.transactions || []
          },
          feeHistory: s.fee_history || [],
          ...(() => {
            const isFpDeleted =
              safeLocalStorage.getItem(`scj_fp_deleted_${s.id}`) === 'true' ||
              (s.admission_id && safeLocalStorage.getItem(`scj_fp_deleted_${s.admission_id}`) === 'true') ||
              (linkedAdmission?.id && safeLocalStorage.getItem(`scj_fp_deleted_${linkedAdmission.id}`) === 'true');

            if (isFpDeleted) {
              if (s.fingerprint_template) {
                supabase.from('students').update({
                  fingerprint_template: null,
                  fingerprint_finger: null,
                  fingerprint_enrolled_at: null,
                }).eq('id', s.id).then(() => {});
              }
              if (linkedAdmission?.fingerprint_template && linkedAdmission?.id) {
                supabase.from('admissions').update({
                  fingerprint_template: null,
                  fingerprint_finger: null,
                  fingerprint_enrolled_at: null,
                }).eq('id', linkedAdmission.id).then(() => {});
              }
              return {
                fingerprintTemplate: undefined,
                fingerprintFinger: undefined,
                fingerprintEnrolledAt: undefined,
              };
            }

            const rawTpl = s.fingerprint_template || linkedAdmission?.fingerprint_template || (s as any).fingerprintTemplate || undefined;
            const rawFgr = s.fingerprint_finger || linkedAdmission?.fingerprint_finger || (s as any).fingerprintFinger || undefined;
            const cleanFgr = rawFgr
              ? rawFgr.split(/\s*(?:\|\|\||\+)\s*/).map((f: string) => secugenService.cleanFingerLabel(f)).join(' + ')
              : undefined;

            return {
              fingerprintTemplate: rawTpl,
              fingerprintFinger: cleanFgr,
              fingerprintEnrolledAt: s.fingerprint_enrolled_at || linkedAdmission?.fingerprint_enrolled_at || (s as any).fingerprintEnrolledAt || undefined,
            };
          })()
        };
        });

        // Self-healing: if any admitted admission is missing from students table, synthesize and include it
        if (admissionsData) {
          const existingAdmIds = new Set(studentsData.map(s => s.admission_id).filter(Boolean));
          const existingStudentIds = new Set(studentsData.map(s => s.id));
          
          admissionsData.forEach(a => {
            const isArchived = a.status === "Archived" || 
                               a.status === "Deleted" || 
                               archivedIds.has(a.id) || 
                               (a.student_id && archivedIds.has(a.student_id)) ||
                               (a.full_name && a.father_name && archivedNames.has(`${a.full_name.trim().toLowerCase()}::${a.father_name.trim().toLowerCase()}`));
            const isConfirmed = !isArchived && (
                                  a.is_admitted === true || 
                                  a.status === "Admitted/Confirmed" || 
                                  a.status === "Admitted" || 
                                  a.status === "Confirmed" ||
                                  a.status === "Full Paid" ||
                                  a.status === "Partial Paid" ||
                                  Number(a.fee_received || 0) > 0
                                );
            if (isConfirmed && !existingAdmIds.has(a.id) && !existingStudentIds.has(a.student_id)) {
              let derivedGender = a.gender;
              if (!derivedGender) {
                const identifier = (`${a.category || ''} ${a.group || ''}`).toLowerCase();
                derivedGender = (identifier.includes('girl') || identifier.includes('female')) ? 'Female' : 'Male';
              }
              const studentId = a.student_id || a.id;
              const remaining = Math.max(0, (a.total_package || 0) - (a.fee_received || 0));
              const installments = a.total_installments || 12;
              const calculatedMonthlyFee = installments > 0 ? Math.ceil(remaining / installments) : 0;
              
              mappedStudents.push({
                id: studentId,
                admissionId: a.id,
                fullName: a.full_name,
                fatherName: a.father_name,
                collegeNo: a.college_no,
                bayFormNo: a.bay_form_no,
                dob: a.dob,
                previousClass: a.previous_class,
                boardRollNo: a.board_roll_no,
                previousMarks: a.previous_marks ?? 0,
                contact: a.contact_number,
                fatherContact: a.father_contact,
                secondaryContact: a.secondary_contact,
                email: a.email || '',
                bloodGroup: a.blood_group || '',
                concessionReason: a.concession_reason || (a.reference && a.reference.startsWith('Concession:') ? a.reference.replace('Concession:', '').trim() : undefined),
                address: a.address || '',
                gender: derivedGender,
                category: a.category || 'N/A',
                group: a.group || 'N/A',
                section: a.section || 'A',
                photo: a.photo_url || a.photo || '',
                attendance: { present: 0, absent: 0 },
                feeHistory: a.fee_history || [],
                feeLedger: a.fee_ledger || {
                  totalPackage: a.total_package || 0,
                  totalReceived: a.fee_received || 0,
                  remainingBalance: remaining,
                  installments: [],
                  transactions: (a.fee_received || 0) > 0 ? [{
                    id: `tx-adm-${a.id}`,
                    date: a.date || new Date().toISOString().split('T')[0],
                    amount: a.fee_received,
                    description: 'Initial Admission Payment',
                    paymentMethod: 'Cash',
                    receiptId: `REC-${a.id.slice(-6)}`
                  }] : []
                },
                subjects: safeParseArray(a.subjects),
                admissionFee: a.admission_fee || 0,
                miscFunds: a.misc_funds || 0,
                totalFeeFinalized: a.total_fee_finalized || a.total_package || 0,
                totalInstallments: installments,
                monthlyFee: calculatedMonthlyFee,
                totalPackage: a.total_package || 0,
                feeReceived: a.fee_received || 0,
                session: a.session || defaultSession,
                sessionStartDate: a.session_start_date,
                sessionEndDate: a.session_end_date,
                academicPart: a.academic_part || 'Part-1',
                programType: a.program_type || 'Yearly',
                currentSemester: a.current_semester || 0,
                fingerprintTemplate:
                  safeLocalStorage.getItem(`scj_fp_deleted_${studentId}`) === 'true' ||
                  safeLocalStorage.getItem(`scj_fp_deleted_${a.id}`) === 'true'
                    ? undefined
                    : (a.fingerprint_template || (a as any).fingerprintTemplate || undefined),
                fingerprintFinger:
                  safeLocalStorage.getItem(`scj_fp_deleted_${studentId}`) === 'true' ||
                  safeLocalStorage.getItem(`scj_fp_deleted_${a.id}`) === 'true'
                    ? undefined
                    : (a.fingerprint_finger
                        ? String(a.fingerprint_finger).split(/\s*(?:\|\|\||\+)\s*/).map((f: string) => secugenService.cleanFingerLabel(f)).join(' + ')
                        : ((a as any).fingerprintFinger || undefined)),
                fingerprintEnrolledAt:
                  safeLocalStorage.getItem(`scj_fp_deleted_${studentId}`) === 'true' ||
                  safeLocalStorage.getItem(`scj_fp_deleted_${a.id}`) === 'true'
                    ? undefined
                    : (a.fingerprint_enrolled_at || (a as any).fingerprintEnrolledAt || undefined)
              } as any);
            }
          });
        }

        setStudents(mappedStudents);
        // Run promotion check
        autoPromoteStudents(mappedStudents);
      }
      if (staffData) setStaff(staffData.map(st => {
        const isStaffFpDeleted = safeLocalStorage.getItem(`scj_fp_deleted_${st.id}`) === 'true';
        let dbTemplate = isStaffFpDeleted ? undefined : (st.fingerprint_template || (st as any).fingerprintTemplate || undefined);
        let rawDbFinger = isStaffFpDeleted ? undefined : (st.fingerprint_finger || (st as any).fingerprintFinger || undefined);
        let dbFinger = rawDbFinger
          ? String(rawDbFinger).split(/\s*(?:\|\|\||\+)\s*/).map((f: string) => secugenService.cleanFingerLabel(f)).join(' + ')
          : undefined;
        let dbEnrolledAt = isStaffFpDeleted ? undefined : (st.fingerprint_enrolled_at || (st as any).fingerprintEnrolledAt || undefined);

        try {
          const vaultKey = `scj_fp_vault_${st.id}`;
          if (isStaffFpDeleted) {
            safeLocalStorage.removeItem(vaultKey);
          } else if (dbTemplate) {
            safeLocalStorage.setItem(vaultKey, JSON.stringify({
              personId: st.id,
              personType: 'staff',
              template: dbTemplate,
              finger: dbFinger || 'Right Thumb',
              enrolledAt: dbEnrolledAt || new Date().toISOString()
            }));
          } else {
            const cachedVault = safeLocalStorage.getItem(vaultKey);
            if (cachedVault) {
              const parsed = JSON.parse(cachedVault);
              if (parsed?.template) {
                dbTemplate = parsed.template;
                dbFinger = parsed.finger
                  ? String(parsed.finger).split(/\s*(?:\|\|\||\+)\s*/).map((f: string) => secugenService.cleanFingerLabel(f)).join(' + ')
                  : 'Right Thumb';
                dbEnrolledAt = parsed.enrolledAt || new Date().toISOString();
                // Push recovered template back to Supabase silently
                supabase.from('staff').update({
                  fingerprint_template: dbTemplate,
                  fingerprint_finger: dbFinger,
                  fingerprint_enrolled_at: dbEnrolledAt,
                }).eq('id', st.id).then(() => {});
              }
            }
          }
        } catch {}

        return {
          ...st,
          fullName: st.full_name,
          fatherName: st.father_name,
          joinDate: st.join_date,
          designation: st.designation || undefined,
          secondaryRole: (st as any).secondary_role || (st.designation && st.designation.includes('&') ? st.designation.split('&')[1].trim() : undefined),
          baseSalary: st.base_salary,
          salary: st.salary,
          photo: st.photo_url || st.photo,
          photo_url: st.photo_url || st.photo,
          dob: st.dob,
          cnic: st.cnic,
          qualification: st.qualification,
          specialization: st.specialization,
          subjects: st.subjects,
          fingerprintTemplate: dbTemplate,
          fingerprintFinger: dbFinger,
          fingerprintEnrolledAt: dbEnrolledAt
        };
      }));
      if (staffAttendanceData) setStaffAttendance(staffAttendanceData.map(a => {
        let parsedNotes: any = null;
        if (a.notes && typeof a.notes === 'string' && a.notes.startsWith('{')) {
          try { parsedNotes = JSON.parse(a.notes); } catch {}
        }
        const checkIn = a.check_in || a.check_in_time || parsedNotes?.checkIn || parsedNotes?.check_in || parsedNotes?.check_in_time || null;
        const breakOut = parsedNotes?.breakOut || parsedNotes?.break_out || null;
        const breakIn = parsedNotes?.breakIn || parsedNotes?.break_in || null;
        const checkOut = a.check_out || a.check_out_time || parsedNotes?.checkOut || parsedNotes?.check_out || parsedNotes?.check_out_time || null;
        let entrySnap: string | null = null;
        let exitSnap: string | null = null;
        if (parsedNotes) {
          entrySnap = parsedNotes.entry_snapshot || null;
          exitSnap = parsedNotes.exit_snapshot || null;
        }
        if (!entrySnap && !exitSnap && a.snapshot_url) {
          if (checkOut && !checkIn) {
            exitSnap = a.snapshot_url;
          } else {
            entrySnap = a.snapshot_url;
          }
        }
        const isBio = a.verification_method === 'face_biometric' || parsedNotes?.verification_method === 'face_biometric' || Boolean(entrySnap || exitSnap);
        const isSecuGen = a.verification_method === 'secugen_fingerprint' || parsedNotes?.method === 'biometric_fingerprint' || parsedNotes?.Verify?.includes('SecuGen') || parsedNotes?.Verify?.includes('Biometric');

        return {
          ...a,
          staffId: a.staff_id,
          checkIn,
          breakOut,
          breakIn,
          checkOut,
          checkInTime: checkIn,
          checkOutTime: checkOut,
          snapshotUrl: entrySnap || exitSnap || null,
          entrySnapshotUrl: entrySnap,
          exitSnapshotUrl: exitSnap,
          verificationMethod: isSecuGen ? 'secugen_fingerprint' : isBio ? 'face_biometric' : (a.verification_method || 'manual'),
          parsedNotes
        };
      }));
      if (staffTimetableData) setStaffTimetable(staffTimetableData.map(t => ({
        ...t,
        staffId: t.staff_id,
        startTime: t.start_time,
        endTime: t.end_time,
        classRoom: t.class_room,
        section: t.section || (t.class_room?.match(/\(Sec\s+([^)]+)\)/i)?.[1]?.trim()) || ''
      })));
      if (studentAttendanceData) setStudentAttendance(studentAttendanceData.map(a => {
        let parsedNotes: any = null;
        if (a.notes && typeof a.notes === 'string' && a.notes.startsWith('{')) {
          try { parsedNotes = JSON.parse(a.notes); } catch {}
        }
        const checkIn = a.check_in_time || parsedNotes?.checkIn || parsedNotes?.check_in || parsedNotes?.check_in_time || null;
        const checkOut = a.check_out_time || parsedNotes?.checkOut || parsedNotes?.check_out || parsedNotes?.check_out_time || null;
        let entrySnap: string | null = null;
        let exitSnap: string | null = null;
        if (parsedNotes) {
          entrySnap = parsedNotes.entry_snapshot || null;
          exitSnap = parsedNotes.exit_snapshot || null;
        }
        if (!entrySnap && !exitSnap && a.snapshot_url) {
          if (checkOut && !checkIn) {
            exitSnap = a.snapshot_url;
          } else {
            entrySnap = a.snapshot_url;
          }
        }
        const isBio = a.verification_method === 'face_biometric' || parsedNotes?.verification_method === 'face_biometric' || Boolean(entrySnap || exitSnap);
        const isSecuGen = a.verification_method === 'secugen_fingerprint' || parsedNotes?.method === 'biometric_fingerprint' || parsedNotes?.Verify?.includes('SecuGen') || parsedNotes?.Verify?.includes('Biometric');

        return {
          ...a,
          studentId: a.student_id,
          checkIn,
          checkOut,
          checkInTime: checkIn,
          checkOutTime: checkOut,
          snapshotUrl: entrySnap || exitSnap || null,
          entrySnapshotUrl: entrySnap,
          exitSnapshotUrl: exitSnap,
          verificationMethod: isSecuGen ? 'secugen_fingerprint' : isBio ? 'face_biometric' : (a.verification_method || 'manual'),
          parsedNotes
        };
      }));
      if (staffAdvancesData) setStaffAdvances(staffAdvancesData.map(a => ({
        ...a,
        staffId: a.staff_id,
        dateIssued: a.date_issued,
        deductionPerMonth: a.deduction_per_month,
        remainingBalance: a.remaining_balance
      })));
      if (expensesData) setExpenses(expensesData.map(e => ({
        ...e,
        session: e.session || defaultSession
      })));
      if (incomeData) setIncomes(incomeData.map(i => ({
        ...i,
        studentId: i.student_id,
        studentName: i.student_name,
        feeType: i.fee_type,
        paymentMethod: i.payment_method,
        recordedBy: i.recorded_by,
        session: i.session || defaultSession
      })));
      if (settingsData) {
        if (settingsData.config?.deletedArchive && Array.isArray(settingsData.config.deletedArchive)) {
          setDeletedArchive(settingsData.config.deletedArchive);
        }
        const normalizedCollegeName = (settingsData.college_name || 'Superior College Jahanian')
          .replace(/Superior Group of Colleges\s*,?\s*Jahanian/gi, 'Superior College Jahanian')
          .replace(/Superior Group of Colleges/gi, 'Superior College Jahanian');
        setSettings({
        id: settingsData.id,
        collegeName: normalizedCollegeName,
        campusName: (settingsData.campus_name || '').replace(/Superior Group of Colleges/gi, 'Superior College Jahanian'),
        logo: settingsData.logo_url || settingsData.logo || settingsData.config?.logo,
        address: settingsData.address,
        contactNumber: settingsData.contact_number,
        email: settingsData.email,
        website: settingsData.website,
        principalName: settingsData.principal_name,
        themeColor: settingsData.theme_color,
        currencySymbol: settingsData.currency_symbol,
        academicSession: settingsData.academic_session,
        sidebarColor: settingsData.sidebar_color || settingsData.config?.sidebarColor,
        sidebarTextColor: settingsData.sidebar_text_color || settingsData.config?.sidebarTextColor,
        headerColor: settingsData.header_color || settingsData.config?.headerColor,
        headerTextColor: settingsData.header_text_color || settingsData.config?.headerTextColor,
        fontFamily: settingsData.font_family || settingsData.config?.fontFamily,
        cardRadius: settingsData.card_radius || settingsData.config?.cardRadius,
        glassEffect: settingsData.glass_effect ?? settingsData.config?.glassEffect,
        enabledModules: settingsData.enabled_modules || [],
        autoLeadConversion: settingsData.auto_lead_conversion ?? settingsData.config?.autoLeadConversion,
        defaulterAlertThreshold: settingsData.defaulter_alert_threshold ?? settingsData.config?.defaulterAlertThreshold,
        allowQuickNav: settingsData.allow_quick_nav ?? settingsData.config?.allowQuickNav,
        enableHighlighting: settingsData.enable_highlighting ?? settingsData.config?.enableHighlighting,
        admissionSlipCustomText: settingsData.admission_slip_custom_text ?? settingsData.config?.admissionSlipCustomText,
        feeReceiptCustomText: settingsData.fee_receipt_custom_text ?? settingsData.config?.feeReceiptCustomText,
        predefinedSections: settingsData.predefined_sections || settingsData.config?.predefinedSections || [],
        gateEntryStartTime: settingsData.config?.gateEntryStartTime || '07:00',
        collegeStartTime: settingsData.config?.collegeStartTime || '07:54',
        gateEntryCutoffTime: settingsData.config?.gateEntryCutoffTime || '08:30',
        gateExitStartTime: settingsData.config?.gateExitStartTime || '13:30',
        gateExitCutoffTime: settingsData.config?.gateExitCutoffTime || '15:30',
        allowOffHoursScan: settingsData.config?.allowOffHoursScan ?? false,
        config: settingsData.config || {}
      } as any);
      }
      if (permissionsData) setPermissions(permissionsData.map(p => ({
        ...p,
        displayName: p.display_name,
        isAdmin: p.is_admin,
        lastActive: p.last_active
      })));
      if (notificationsData) setNotifications(notificationsData.map(n => ({
        ...n,
        actorName: n.actor_name,
        isRead: n.is_read,
        timestamp: n.created_at
      })));
      if (academicRecordsData) setAcademicRecords(academicRecordsData.map(r => ({
        ...r,
        studentId: r.student_id,
        studentName: r.student_name,
        class: r.class,
        section: r.section,
        testName: r.test_name,
        testType: r.test_type,
        totalMarks: r.total_marks,
        obtainedMarks: r.obtained_marks,
        teacherId: r.teacher_id,
        teacherName: r.teacher_name,
        session: r.session || defaultSession
      })));
      if (salaryPaymentsData) setSalaryPayments(salaryPaymentsData.map(p => ({
        ...p,
        staffId: p.staff_id,
        staffName: p.staff_name,
        paymentMethod: p.payment_method,
        receiptNumber: p.receipt_number
      })));
    } catch (error) {
      console.error('Error fetching Supabase data:', error);
    } finally {
      if (!silent) setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const debouncedFetchData = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      runFullFetchData(true);
    }, 1200);
  }, [runFullFetchData]);

  // Fast non-blocking fetchData:
  // - Initial load (silent === false) awaits full dataset
  // - Post-mutation silent sync (silent === true) schedules background refresh and resolves in 0ms
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) {
      await runFullFetchData(false);
      return;
    }
    debouncedFetchData();
  }, [runFullFetchData, debouncedFetchData]);

  const refreshStudentAttendanceOnly = useCallback(async () => {
    if (!isSupabaseConfigured || isBulkOperatingRef.current) return;
    try {
      const { data: studentAttendanceData } = await supabase
        .from('student_attendance')
        .select('*')
        .order('date', { ascending: false })
        .limit(3000);
      if (studentAttendanceData) {
        setStudentAttendance(studentAttendanceData.map(a => {
          let parsedNotes: any = null;
          if (a.notes && typeof a.notes === 'string' && a.notes.startsWith('{')) {
            try { parsedNotes = JSON.parse(a.notes); } catch {}
          }
          const checkIn = a.check_in_time || parsedNotes?.check_in_time || null;
          const checkOut = a.check_out_time || parsedNotes?.check_out_time || null;
          let entrySnap: string | null = null;
          let exitSnap: string | null = null;
          if (parsedNotes) {
            entrySnap = parsedNotes.entry_snapshot || null;
            exitSnap = parsedNotes.exit_snapshot || null;
          }
          if (!entrySnap && !exitSnap && a.snapshot_url) {
            if (checkOut && !checkIn) {
              exitSnap = a.snapshot_url;
            } else {
              entrySnap = a.snapshot_url;
            }
          }
          const isBio = a.verification_method === 'face_biometric' || parsedNotes?.verification_method === 'face_biometric' || Boolean(entrySnap || exitSnap);
          return {
            ...a,
            studentId: a.student_id,
            checkInTime: checkIn,
            checkOutTime: checkOut,
            snapshotUrl: entrySnap || exitSnap || null,
            entrySnapshotUrl: entrySnap,
            exitSnapshotUrl: exitSnap,
            verificationMethod: isBio ? 'face_biometric' : (a.verification_method || 'manual'),
            parsedNotes
          };
        }));
      }
    } catch {}
  }, []);

  const refreshStaffAttendanceOnly = useCallback(async () => {
    if (!isSupabaseConfigured || isBulkOperatingRef.current) return;
    try {
      const { data: staffAttendanceData } = await supabase
        .from('staff_attendance')
        .select('*')
        .order('date', { ascending: false })
        .limit(2000);
      if (staffAttendanceData) {
        setStaffAttendance(staffAttendanceData.map(a => {
          let parsedNotes: any = null;
          if (a.notes && typeof a.notes === 'string' && a.notes.startsWith('{')) {
            try { parsedNotes = JSON.parse(a.notes); } catch {}
          }
          const checkIn = a.check_in || a.check_in_time || parsedNotes?.check_in_time || null;
          const checkOut = a.check_out || a.check_out_time || parsedNotes?.check_out_time || null;
          let entrySnap: string | null = null;
          let exitSnap: string | null = null;
          if (parsedNotes) {
            entrySnap = parsedNotes.entry_snapshot || null;
            exitSnap = parsedNotes.exit_snapshot || null;
          }
          if (!entrySnap && !exitSnap && a.snapshot_url) {
            if (checkOut && !checkIn) {
              exitSnap = a.snapshot_url;
            } else {
              entrySnap = a.snapshot_url;
            }
          }
          const isBio = a.verification_method === 'face_biometric' || parsedNotes?.verification_method === 'face_biometric' || Boolean(entrySnap || exitSnap);
          return {
            ...a,
            staffId: a.staff_id,
            checkIn,
            checkOut,
            checkInTime: checkIn,
            checkOutTime: checkOut,
            snapshotUrl: entrySnap || exitSnap || null,
            entrySnapshotUrl: entrySnap,
            exitSnapshotUrl: exitSnap,
            verificationMethod: isBio ? 'face_biometric' : (a.verification_method || 'manual'),
            parsedNotes
          };
        }));
      }
    } catch {}
  }, []);

  const userId = user?.id;

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) {
      setLoading(false);
      return;
    }

    runFullFetchData(false);

    const leadsSubscription = supabase.channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => debouncedFetchData())
      .subscribe();

    const notifSubscription = supabase.channel('notifications-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const newNotif: any = payload.new;
        if (newNotif) {
          setNotifications(prev => [
            {
              ...newNotif,
              actorName: newNotif.actor_name,
              isRead: newNotif.is_read,
              timestamp: newNotif.created_at,
            },
            ...prev.filter(n => n.id !== newNotif.id).slice(0, 199),
          ]);
        }

        const msgOpts = {
          description: `${newNotif.message} (by ${newNotif.actor_name || 'Admin'})`,
          duration: 2500,
        };
        
        // Define priority - only show global toasts for important things to avoid spam
        const isUpdateOrDelete = (newNotif.title || '').toLowerCase().includes('delete') || 
                                 (newNotif.title || '').toLowerCase().includes('update') || 
                                 (newNotif.title || '').toLowerCase().includes('remove') ||
                                 newNotif.type === 'alert' ||
                                 newNotif.type === 'warning';
                                 
        // Don't show toast if the current user triggered it (to avoid double notifications)
        const isFromOtherAdmin = !user || (newNotif.actor_name && newNotif.actor_name !== (user.displayName || user.email));
        
        // Only show notifications to the Super Admins
        const SUPER_ADMIN_EMAILS = ["mughalazam1964@gmail.com", "akhtar147jhn@gmail.com"];
        const isSuperAdmin = user?.email ? SUPER_ADMIN_EMAILS.includes(user.email) : false;
                                 
        if (isUpdateOrDelete && isFromOtherAdmin && isSuperAdmin) {
          switch (newNotif.type) {
            case 'success':
              toast.success(`${newNotif.title}`, msgOpts);
              break;
            case 'alert':
            case 'error':
              toast.error(`${newNotif.title}`, msgOpts);
              break;
            case 'warning':
              toast.warning(`${newNotif.title}`, msgOpts);
              break;
            default:
              toast.info(`${newNotif.title}`, msgOpts);
          }
        }
      })
      .subscribe();

    const studentAttSubscription = supabase.channel('student-attendance-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_attendance' }, () => {
        refreshStudentAttendanceOnly();
      })
      .subscribe();

    const staffAttSubscription = supabase.channel('staff-attendance-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_attendance' }, () => {
        refreshStaffAttendanceOnly();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leadsSubscription);
      supabase.removeChannel(notifSubscription);
      supabase.removeChannel(studentAttSubscription);
      supabase.removeChannel(staffAttSubscription);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [userId, runFullFetchData, debouncedFetchData, refreshStudentAttendanceOnly, refreshStaffAttendanceOnly]);

  const logActivity = (title: string, message: string | object, type: 'info' | 'alert' | 'success' | 'warning' = 'info') => {
    if (!user) return;
    const finalMessage = typeof message === 'object' && message !== null ? JSON.stringify(message) : String(message);
    supabase.from('notifications').insert({
      title,
      message: finalMessage,
      type,
      actor_name: user.displayName || user.email,
      is_read: false
    }).then(() => {}).catch((e) => {
      console.warn('Failed to log activity', e);
    });
  };

  async function autoPromoteStudents(studentsList: Student[]) {
    const today = new Date();
    const promoteCandidates = studentsList.filter(s => {
      if (!s.sessionEndDate || s.academicPart !== 'Part-1') return false;
      const endDate = new Date(s.sessionEndDate);
      return today > endDate;
    });

    if (promoteCandidates.length === 0) return;

    for (const student of promoteCandidates) {
      try {
        const nextEndDate = new Date(student.sessionEndDate!);
        nextEndDate.setFullYear(nextEndDate.getFullYear() + 1);
        
        const nextStartDate = new Date(student.sessionEndDate!);
        nextStartDate.setDate(nextStartDate.getDate() + 1);

        const { error } = await supabase.from('students').update({
          academic_part: 'Part-2',
          session_start_date: nextStartDate.toISOString().split('T')[0],
          session_end_date: nextEndDate.toISOString().split('T')[0]
        }).eq('id', student.id);

        if (error) throw error;
        
        logActivity("Promotion", `Student ${student.fullName} auto-promoted to Part-2`, 'success');
      } catch (e) {
        console.error(`Promotion failed for student ${student.id}:`, e);
      }
    }
    // Refresh if any were promoted
    if (promoteCandidates.length > 0) fetchData(true);
  };

  const generateStudentId = (program?: string) => {
    const year = new Date().getFullYear().toString().slice(-2);
    let prefix = 'SGC';
    
    if (program) {
      const p = program.toLowerCase();
      if (p.includes('dit')) prefix = 'DIT';
      else if (p.includes('uk') || p.includes('level 3')) prefix = 'UKL';
      else if (p.includes('bs')) prefix = 'BSP';
      else prefix = 'SGC';
    }

    const targetPattern = new RegExp(`^${prefix}-${year}-(\\d+)$`, 'i');
    const existingNumbers: number[] = [];

    // Scan all existing IDs in state (students, admissions, deletedArchive)
    (students || []).forEach((s: any) => {
      const m = String(s.id || '').match(targetPattern);
      if (m) existingNumbers.push(parseInt(m[1], 10));
      const m2 = String(s.studentId || '').match(targetPattern);
      if (m2) existingNumbers.push(parseInt(m2[1], 10));
    });

    (admissions || []).forEach((a: any) => {
      const m = String(a.studentId || a.student_id || '').match(targetPattern);
      if (m) existingNumbers.push(parseInt(m[1], 10));
    });

    (deletedArchive || []).forEach((d: any) => {
      const m = String(d.studentId || d.originalId || '').match(targetPattern);
      if (m) existingNumbers.push(parseInt(m[1], 10));
    });

    const maxExisting = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 1000;
    const nextSeq = Math.max(maxExisting + 1, 1001);
    return `${prefix}-${year}-${nextSeq}`;
  };

  const generateBatchStudentIds = (program: string | undefined, count: number): string[] => {
    const year = new Date().getFullYear().toString().slice(-2);
    let prefix = 'SGC';
    
    if (program) {
      const p = program.toLowerCase();
      if (p.includes('dit')) prefix = 'DIT';
      else if (p.includes('uk') || p.includes('level 3')) prefix = 'UKL';
      else if (p.includes('bs')) prefix = 'BSP';
      else prefix = 'SGC';
    }

    const targetPattern = new RegExp(`^${prefix}-${year}-(\\d+)$`, 'i');
    const existingNumbers: number[] = [];

    (students || []).forEach((s: any) => {
      const m = String(s.id || '').match(targetPattern);
      if (m) existingNumbers.push(parseInt(m[1], 10));
      const m2 = String(s.studentId || '').match(targetPattern);
      if (m2) existingNumbers.push(parseInt(m2[1], 10));
    });

    (admissions || []).forEach((a: any) => {
      const m = String(a.studentId || a.student_id || '').match(targetPattern);
      if (m) existingNumbers.push(parseInt(m[1], 10));
    });

    (deletedArchive || []).forEach((d: any) => {
      const m = String(d.studentId || d.originalId || '').match(targetPattern);
      if (m) existingNumbers.push(parseInt(m[1], 10));
    });

    let current = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 1000;
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      current++;
      result.push(`${prefix}-${year}-${current}`);
    }
    return result;
  };

  // Archive Operations
  const archiveRecords = async (records: ArchivedRecord[]) => {
    if (!records.length) return;
    const updated = [
      ...records,
      ...deletedArchive.filter(existing => !records.some(r => 
        r.originalId === existing.originalId || 
        r.studentId === existing.studentId || 
        (r.originalId && existing.studentId && r.originalId === existing.studentId) ||
        (r.studentId && existing.originalId && r.studentId === existing.originalId) ||
        (Boolean(r.fullName && existing.fullName && r.fullName.trim().toLowerCase() === existing.fullName.trim().toLowerCase()) &&
         Boolean(r.fatherName && existing.fatherName && r.fatherName.trim().toLowerCase() === existing.fatherName.trim().toLowerCase()))
      ))
    ];
    setDeletedArchive(updated);
    try {
      if ((settings as any)?.id) {
        const existingConfig = (settings as any)?.config || {};
        const safeSections = (settings as any)?.predefinedSections || existingConfig.predefinedSections || [];
        await supabase.from('settings').update({
          config: {
            ...existingConfig,
            predefinedSections: safeSections,
            deletedArchive: updated
          },
          updated_at: new Date().toISOString()
        }).eq('id', (settings as any).id);

        setSettings(prev => prev ? {
          ...prev,
          config: {
            ...((prev as any).config || {}),
            predefinedSections: safeSections,
            deletedArchive: updated
          }
        } as any : null);
      }
    } catch (e) {
      console.warn("Could not sync archive to settings:", e);
    }
    return updated;
  };

  const restoreFromArchive = async (archiveId: string) => {
    const item = deletedArchive.find(a => a.id === archiveId);
    if (!item) {
      toast.error("Archived record not found");
      return;
    }
    const toastId = toast.loading(`Restoring ${item.fullName}...`);
    try {
      const snap = item.snapshot || {};
      const { admission: admSnap, student: stuSnap } = snap;

      const resolvedStudentId = stuSnap?.id || admSnap?.student_id || admSnap?.studentId || item.studentId || item.originalId;
      const rawAdmId = admSnap?.id || stuSnap?.admission_id || stuSnap?.admissionId;
      const isUuid = typeof rawAdmId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawAdmId);
      const resolvedAdmId = isUuid ? rawAdmId : crypto.randomUUID();
      const feePkg = Number(item.totalPackage || stuSnap?.totalPackage || stuSnap?.total_package || admSnap?.total_package || admSnap?.totalPackage || 0);
      const feeRec = Number(item.feeReceived || stuSnap?.feeReceived || stuSnap?.fee_received || admSnap?.fee_received || admSnap?.feeReceived || 0);
      const feeRem = Math.max(0, feePkg - feeRec);

      const resolvedFeeLedger = item.snapshot?.feeLedger || stuSnap?.feeLedger || stuSnap?.fee_ledger || admSnap?.fee_ledger || {
        totalPackage: feePkg,
        totalReceived: feeRec,
        remainingBalance: feeRem,
        installments: [],
        transactions: feeRec > 0 ? [{
          id: `tx-res-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          amount: feeRec,
          description: 'Initial Payment / Restored Ledger',
          paymentMethod: 'Cash',
          receiptId: `REC-${String(resolvedStudentId).slice(-6)}`
        }] : []
      };

      // 1. Restore Admission in Supabase
      await supabase.from('admissions').upsert({
        id: resolvedAdmId,
        student_id: resolvedStudentId,
        date: admSnap?.date || new Date().toISOString().split('T')[0],
        full_name: admSnap?.full_name || admSnap?.fullName || stuSnap?.fullName || stuSnap?.full_name || item.fullName,
        father_name: admSnap?.father_name || admSnap?.fatherName || stuSnap?.fatherName || stuSnap?.father_name || item.fatherName,
        category: admSnap?.category || stuSnap?.category || item.category || 'N/A',
        group: admSnap?.group || stuSnap?.group || item.group || 'N/A',
        section: admSnap?.section || stuSnap?.section || item.section || 'A',
        subjects: admSnap?.subjects || stuSnap?.subjects || [],
        address: admSnap?.address || stuSnap?.address || '',
        admission_fee: admSnap?.admission_fee ?? stuSnap?.admission_fee ?? 0,
        misc_funds: admSnap?.misc_funds ?? stuSnap?.misc_funds ?? 0,
        total_fee_finalized: feePkg,
        total_package: feePkg,
        fee_received: feeRec,
        payment_plan: admSnap?.payment_plan || 'Semester',
        contact_number: admSnap?.contact_number || stuSnap?.contact || item.contact || '',
        father_contact: admSnap?.father_contact || stuSnap?.fatherContact || '',
        gender: admSnap?.gender || stuSnap?.gender || 'Female',
        status: 'Admitted/Confirmed',
        is_admitted: true,
        session: admSnap?.session || stuSnap?.session || item.session || '2026-28',
        fee_history: admSnap?.fee_history || stuSnap?.fee_history || [],
        fee_ledger: resolvedFeeLedger
      });

      // 2. Restore Student in Supabase students table
      await supabase.from('students').upsert({
        id: resolvedStudentId,
        admission_id: resolvedAdmId,
        full_name: stuSnap?.full_name || stuSnap?.fullName || admSnap?.full_name || item.fullName,
        father_name: stuSnap?.father_name || stuSnap?.fatherName || admSnap?.father_name || item.fatherName,
        category: stuSnap?.category || admSnap?.category || item.category || 'N/A',
        group: stuSnap?.group || admSnap?.group || item.group || 'N/A',
        section: stuSnap?.section || admSnap?.section || item.section || 'A',
        college_no: stuSnap?.college_no || stuSnap?.collegeNo || admSnap?.college_no || null,
        bay_form_no: stuSnap?.bay_form_no || stuSnap?.bayFormNo || admSnap?.bay_form_no || null,
        dob: stuSnap?.dob || admSnap?.dob || null,
        previous_class: stuSnap?.previous_class || stuSnap?.previousClass || admSnap?.previous_class || null,
        board_roll_no: stuSnap?.board_roll_no || stuSnap?.boardRollNo || admSnap?.board_roll_no || null,
        previous_marks: stuSnap?.previous_marks ?? stuSnap?.previousMarks ?? admSnap?.previous_marks ?? 0,
        subjects: stuSnap?.subjects || admSnap?.subjects || [],
        contact: stuSnap?.contact || admSnap?.contact_number || item.contact || '',
        father_contact: stuSnap?.father_contact || admSnap?.father_contact || '',
        address: stuSnap?.address || admSnap?.address || '',
        gender: stuSnap?.gender || admSnap?.gender || 'Female',
        admission_fee: stuSnap?.admission_fee ?? admSnap?.admission_fee ?? 0,
        misc_funds: stuSnap?.misc_funds ?? admSnap?.misc_funds ?? 0,
        total_fee_finalized: feePkg,
        total_package: feePkg,
        fee_received: feeRec,
        total_installments: stuSnap?.total_installments || stuSnap?.totalInstallments || 12,
        monthly_fee: stuSnap?.monthly_fee || stuSnap?.monthlyFee || 0,
        fee_ledger: resolvedFeeLedger,
        fee_history: stuSnap?.fee_history || admSnap?.fee_history || [],
        session: stuSnap?.session || admSnap?.session || item.session || '2026-28',
        academic_part: stuSnap?.academic_part || stuSnap?.academicPart || admSnap?.academic_part || 'Part-1',
        current_semester: stuSnap?.current_semester || stuSnap?.currentSemester || admSnap?.current_semester || 8
      });

      // 3. Restore income entry if fee_received > 0
      if (feeRec > 0) {
        try {
          await supabase.from('income').insert({
            student_id: resolvedStudentId,
            student_name: item.fullName,
            fee_type: 'Admission Fee / Initial Payment',
            amount: feeRec,
            month: new Date().toLocaleString('default', { month: 'long' }),
            year: new Date().getFullYear(),
            date: new Date().toISOString().split('T')[0],
            status: 'Paid',
            payment_method: 'Cash',
            recorded_by: user?.email || 'System'
          });
        } catch (incErr) {
          console.warn("Could not insert income on restore:", incErr);
        }
      }

      // 4. Remove from archive
      const newArchive = deletedArchive.filter(a => 
        a.id !== archiveId && 
        a.originalId !== item.originalId && 
        a.studentId !== item.studentId &&
        !(a.fullName === item.fullName && a.fatherName === item.fatherName)
      );
      setDeletedArchive(newArchive);

      if ((settings as any)?.id) {
        await supabase.from('settings').update({
          config: {
            ...((settings as any)?.config || {}),
            deletedArchive: newArchive
          },
          updated_at: new Date().toISOString()
        }).eq('id', (settings as any).id);

        setSettings(prev => prev ? {
          ...prev,
          config: {
            ...((prev as any).config || {}),
            deletedArchive: newArchive
          }
        } as any : null);
      }

      await fetchData(true);
      toast.success(`${item.fullName} restored successfully with fees intact!`, { id: toastId });
    } catch (e: any) {
      console.error("Restore Error:", e);
      toast.error(`Restore failed: ${e.message}`, { id: toastId });
    }
  };

  const permanentlyDeleteFromArchive = async (archiveId: string) => {
    const newArchive = deletedArchive.filter(a => a.id !== archiveId);
    setDeletedArchive(newArchive);

    try {
      if ((settings as any)?.id) {
        await supabase.from('settings').update({
          config: {
            ...((settings as any)?.config || {}),
            deletedArchive: newArchive
          },
          updated_at: new Date().toISOString()
        }).eq('id', (settings as any).id);
      }
      toast.success("Record permanently deleted from archive");
    } catch (e: any) {
      console.error("Permanent Delete Error:", e);
      toast.error("Failed to delete from archive");
    }
  };

  const clearArchive = async () => {
    setDeletedArchive([]);
    try {
      if ((settings as any)?.id) {
        await supabase.from('settings').update({
          config: {
            ...((settings as any)?.config || {}),
            deletedArchive: []
          },
          updated_at: new Date().toISOString()
        }).eq('id', (settings as any).id);
      }
      toast.success("Deleted Archive emptied completely");
    } catch (e: any) {
      console.error("Clear Archive Error:", e);
      toast.error("Failed to clear archive");
    }
  };

  const updateFingerprintRecord = useCallback(async (
    personId: string,
    personType: 'student' | 'staff',
    template: string,
    finger: string,
    mode: 'merge' | 'replace_all' = 'merge'
  ) => {
    const isRemoving = !template || template.trim() === '';
    const enrolledAt = isRemoving ? null : new Date().toISOString();

    let finalTemplate: string | null = isRemoving ? null : template;
    let finalFinger: string | null = isRemoving ? null : finger;

    if (!isRemoving && mode === 'merge') {
      let existingTpl: string | null = null;
      let existingFinger: string | null = null;

      try {
        const cached = safeLocalStorage.getItem(`scj_fp_vault_${personId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.template) {
            existingTpl = parsed.template;
            existingFinger = parsed.finger;
          }
        }
      } catch {}

      if (personType === 'staff') {
        const found = staff.find(s => s.id === personId);
        if (found?.fingerprintTemplate) {
          existingTpl = found.fingerprintTemplate;
          existingFinger = found.fingerprintFinger || existingFinger;
        }
      } else {
        const foundStu = students.find(s =>
          s.id === personId ||
          (s as any).studentId === personId ||
          (s as any).collegeNo === personId ||
          s.admissionId === personId
        );
        if (foundStu?.fingerprintTemplate) {
          existingTpl = foundStu.fingerprintTemplate;
          existingFinger = foundStu.fingerprintFinger || existingFinger;
        }
      }

      if (existingTpl) {
        const merged = secugenService.mergeFingerTemplate(
          existingTpl,
          existingFinger,
          template,
          finger,
          'merge'
        );
        finalTemplate = merged.templateField;
        finalFinger = merged.fingerField;
      }
    }

    const matchedStu = personType === 'student'
      ? students.find(s =>
          s.id === personId ||
          (s as any).studentId === personId ||
          (s as any).collegeNo === personId ||
          s.admissionId === personId
        )
      : undefined;

    // 1. Save redundant local backup vault so templates are never lost even offline, or mark tombstone when removing
    try {
      if (isRemoving) {
        safeLocalStorage.removeItem(`scj_fp_vault_${personId}`);
        safeLocalStorage.removeItem(`scj_fp_thumb_${personId}`);
        safeLocalStorage.setItem(`scj_fp_deleted_${personId}`, 'true');
        if (matchedStu?.id) {
          safeLocalStorage.removeItem(`scj_fp_vault_${matchedStu.id}`);
          safeLocalStorage.removeItem(`scj_fp_thumb_${matchedStu.id}`);
          safeLocalStorage.setItem(`scj_fp_deleted_${matchedStu.id}`, 'true');
        }
        if (matchedStu?.admissionId) {
          safeLocalStorage.removeItem(`scj_fp_vault_${matchedStu.admissionId}`);
          safeLocalStorage.removeItem(`scj_fp_thumb_${matchedStu.admissionId}`);
          safeLocalStorage.setItem(`scj_fp_deleted_${matchedStu.admissionId}`, 'true');
        }
      } else {
        safeLocalStorage.removeItem(`scj_fp_deleted_${personId}`);
        if (matchedStu?.id) safeLocalStorage.removeItem(`scj_fp_deleted_${matchedStu.id}`);
        if (matchedStu?.admissionId) safeLocalStorage.removeItem(`scj_fp_deleted_${matchedStu.admissionId}`);
        safeLocalStorage.setItem(
          `scj_fp_vault_${personId}`,
          JSON.stringify({
            personId,
            personType,
            template: finalTemplate,
            finger: finalFinger,
            enrolledAt,
          })
        );
      }
    } catch {}

    // 2. Optimistic React state update
    if (personType === 'staff') {
      setStaff(prev => prev.map(s => s.id === personId ? {
        ...s,
        fingerprintTemplate: finalTemplate || undefined,
        fingerprintFinger: finalFinger || undefined,
        fingerprintEnrolledAt: enrolledAt || undefined
      } : s));
    } else {
      setStudents(prev => prev.map(s => (
        s.id === personId || 
        (s as any).studentId === personId || 
        (s as any).collegeNo === personId ||
        s.admissionId === personId
      ) ? {
        ...s,
        fingerprintTemplate: finalTemplate || undefined,
        fingerprintFinger: finalFinger || undefined,
        fingerprintEnrolledAt: enrolledAt || undefined
      } : s));
      setAdmissions(prev => prev.map(a => (
        a.id === personId || 
        a.studentId === personId || 
        (matchedStu?.admissionId && a.id === matchedStu.admissionId) ||
        (matchedStu?.collegeNo && (a as any).collegeNo === matchedStu.collegeNo) ||
        (a as any).collegeNo === personId
      ) ? {
        ...a,
        fingerprintTemplate: finalTemplate || undefined,
        fingerprintFinger: finalFinger || undefined,
        fingerprintEnrolledAt: enrolledAt || undefined
      } : a));
    }

    // 3. Persist directly to Supabase database using safe individual queries so non-UUID roll numbers never fail
    if (isSupabaseConfigured) {
      try {
        if (personType === 'staff') {
          const { error } = await supabase
            .from('staff')
            .update({
              fingerprint_template: finalTemplate,
              fingerprint_finger: finalFinger,
              fingerprint_enrolled_at: enrolledAt,
            })
            .eq('id', personId);
          if (error) {
            console.error('Supabase staff fingerprint update error:', error);
            toast.error(`Database sync warning: ${error.message}`);
          }
        } else {
          const payload = {
            fingerprint_template: finalTemplate,
            fingerprint_finger: finalFinger,
            fingerprint_enrolled_at: enrolledAt,
          };

          const updateOps: Promise<any>[] = [
            supabase.from('students').update(payload).eq('id', personId),
            supabase.from('admissions').update(payload).eq('student_id', personId),
          ];

          if (matchedStu?.id && matchedStu.id !== personId) {
            updateOps.push(supabase.from('students').update(payload).eq('id', matchedStu.id));
            updateOps.push(supabase.from('admissions').update(payload).eq('student_id', matchedStu.id));
          }

          if (matchedStu?.admissionId) {
            updateOps.push(supabase.from('students').update(payload).eq('admission_id', matchedStu.admissionId));
            updateOps.push(supabase.from('admissions').update(payload).eq('id', matchedStu.admissionId));
          }

          if (matchedStu?.collegeNo) {
            updateOps.push(supabase.from('students').update(payload).eq('college_no', matchedStu.collegeNo));
            updateOps.push(supabase.from('admissions').update(payload).eq('college_no', matchedStu.collegeNo));
          }

          // If personId itself is a UUID or matches admissions.id, try updating by id safely
          updateOps.push(
            Promise.resolve(supabase.from('admissions').update(payload).eq('id', personId)).catch(() => {})
          );

          await Promise.allSettled(updateOps);
        }
      } catch (err: any) {
        console.error('Failed to persist fingerprint to Supabase:', err);
      }
    }
  }, [staff, students]);

  const ctx = { user, generateStudentId, generateBatchStudentIds, leads, setLeads, admissions, setAdmissions, students, setStudents, staff, setStaff, staffAttendance, setStaffAttendance, staffTimetable, setStaffTimetable, staffAdvances, setStaffAdvances, expenses, setExpenses, incomes, setIncomes, academicRecords, setAcademicRecords, salaryPayments, setSalaryPayments, studentAttendance, setStudentAttendance, settings, setSettings, permissions, setPermissions, notifications, setNotifications, isBulkOperatingRef, logActivity, fetchData, archiveRecords, deletedArchive, setDeletedArchive };
  const leadsOps = useLeadsOperations(ctx);
  const admissionsOps = useAdmissionsOperations(ctx);
  const studentsOps = useStudentsOperations(ctx);
  const accountsOps = useAccountsOperations(ctx);
  const staffOps = useStaffOperations(ctx);
  const settingsOps = useSettingsOperations(ctx);
  const academicOps = useAcademicOperations(ctx);
  return {
    ...leadsOps,
    ...admissionsOps,
    ...studentsOps,
    ...accountsOps,
    ...staffOps,
    ...settingsOps,
    ...academicOps,
    leads,
    admissions,
    students,
    staff,
    staffAttendance,
    studentAttendance,
    staffTimetable,
    staffAdvances,
    expenses,
    incomes,
    settings,
    permissions,
    notifications,
    deletedArchive,
    restoreFromArchive,
    permanentlyDeleteFromArchive,
    clearArchive,
    archiveRecords,
    loading,
    actionedItems,
    markActioned,
    isNewRecord,
    logActivity,
    ...admissionsOps,
    academicRecords,
    salaryPayments,
    generateStudentId,
    generateBatchStudentIds,
    fetchData,
    updateFingerprintRecord,
    setStaff,
    setStudents,
    setAdmissions,
    setLeads,
    setStaffAttendance,
    setStudentAttendance,
  };
}
