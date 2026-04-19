
import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  setDoc,
  getDoc,
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Lead, Admission, Student, Staff, Expense, Income, AppSettings, FeePayment, FeeTransaction, Installment, AcademicRecord, SalaryPayment, UserPermission, Notification } from '../types';
import { INITIAL_SETTINGS } from '../constants';
import { toast } from 'sonner';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (errorMessage.includes('offline') || errorMessage.includes('insufficient permissions')) {
    console.error('Firestore Error Payload: ', JSON.stringify(errInfo));
  }
  
  throw new Error(JSON.stringify(errInfo));
}

export function useFirebaseData(user: any) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [academicRecords, setAcademicRecords] = useState<AcademicRecord[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubLeads = onSnapshot(query(collection(db, 'leads'), orderBy('dateAdded', 'desc')), (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Lead)));
    }, (error) => {
      console.error("Leads listener error:", error);
      handleFirestoreError(error, OperationType.LIST, 'leads');
    });

    const unsubAdmissions = onSnapshot(query(collection(db, 'admissions'), orderBy('date', 'desc')), (snapshot) => {
      setAdmissions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Admission)));
    }, (error) => {
      console.error("Admissions listener error:", error);
      handleFirestoreError(error, OperationType.LIST, 'admissions');
    });

    const unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Student)));
    }, (error) => {
      console.error("Students listener error:", error);
      handleFirestoreError(error, OperationType.LIST, 'students');
    });

    const unsubStaff = onSnapshot(collection(db, 'staff'), (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Staff)));
    }, (error) => {
      console.error("Staff listener error:", error);
      handleFirestoreError(error, OperationType.LIST, 'staff');
    });

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), orderBy('date', 'desc')), (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));
    }, (error) => {
      console.error("Expenses listener error:", error);
      handleFirestoreError(error, OperationType.LIST, 'expenses');
    });

    const unsubIncome = onSnapshot(query(collection(db, 'income'), orderBy('date', 'desc')), (snapshot) => {
      setIncomes(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Income)));
    }, (error) => {
      console.error("Income listener error:", error);
      handleFirestoreError(error, OperationType.LIST, 'income');
    });

    const unsubAcademic = onSnapshot(query(collection(db, 'academicRecords'), orderBy('date', 'desc')), (snapshot) => {
      setAcademicRecords(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AcademicRecord)));
    }, (error) => {
      console.error("Academic listener error:", error);
      handleFirestoreError(error, OperationType.LIST, 'academicRecords');
    });

    const unsubSalary = onSnapshot(query(collection(db, 'salaryPayments'), orderBy('date', 'desc')), (snapshot) => {
      setSalaryPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryPayment)));
    }, (error) => {
      console.error("Salary listener error:", error);
      handleFirestoreError(error, OperationType.LIST, 'salaryPayments');
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'config'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as AppSettings);
      }
      setLoading(false);
    }, (error) => {
      console.error("Settings listener error:", error);
      handleFirestoreError(error, OperationType.GET, 'settings/config');
    });

    const unsubPermissions = onSnapshot(collection(db, 'permissions'), (snapshot) => {
      setPermissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserPermission)));
    }, (error) => {
      console.error("Permissions listener error:", error);
      handleFirestoreError(error, OperationType.LIST, 'permissions');
    });

    const unsubNotifications = onSnapshot(query(collection(db, 'notifications'), orderBy('timestamp', 'desc')), (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    }, (error) => {
      console.error("Notifications listener error:", error);
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => {
      unsubLeads();
      unsubAdmissions();
      unsubStudents();
      unsubStaff();
      unsubExpenses();
      unsubIncome();
      unsubAcademic();
      unsubSalary();
      unsubSettings();
      unsubPermissions();
      unsubNotifications();
    };
  }, [user]);

  // User Presence Tracking
  useEffect(() => {
    if (!user) return;

    // MANDATORY Connection Test
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Firestore connection test successful.");
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firestore connection failure: the client is offline. Please check your network and Firebase configuration.");
        }
      }
    };
    testConnection();

    const updatePresence = async (status: 'online' | 'offline') => {
      const path = `permissions/${user.email}`;
      try {
        const userDoc = doc(db, 'permissions', user.email);
        
        // Use getDoc with attempt to handle offline failure
        let docSnap;
        try {
          docSnap = await getDoc(userDoc);
        } catch (e) {
          // If the reachability check above failed, this will likely fail too.
          // Don't re-throw here to gracefully handle background status updates failing quietly when offline.
          return;
        }
        
        const presenceData = {
          lastActive: new Date().toISOString(),
          status: status
        };

        if (docSnap.exists()) {
          await updateDoc(userDoc, presenceData);
        } else if (user.email === 'mughalazam1964@gmail.com') {
          await setDoc(userDoc, {
            email: user.email,
            displayName: 'Super Admin',
            isAdmin: true,
            sections: ['dashboard', 'admissions', 'students', 'academic', 'staff', 'accounts', 'reports', 'leads', 'settings'],
            ...presenceData
          });
        }
      } catch (e) {
        console.error("Presence update failed", e);
        // Silently handle presence failure to avoid crashing app loop, but log detail for dev
      }
    };

    updatePresence('online');
    const heartbeat = setInterval(() => updatePresence('online'), 5 * 60 * 1000);

    const handleVisibilityChange = () => {
      updatePresence(document.visibilityState === 'hidden' ? 'offline' : 'online');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      updatePresence('offline');
    };
  }, [user]);

  const logActivity = async (title: string, message: string, type: 'info' | 'alert' | 'success' | 'warning' = 'info') => {
    if (!user) return;
    // Log activities for all personnel to ensure Super Admin can monitor everything.
    // Super Admin requested to see "k kis roler ki tarf s kya kya kia ja raha hay"
    // We will log for everyone so the stream is comprehensive.

    try {
      await addDoc(collection(db, 'notifications'), {
        title,
        message,
        type,
        timestamp: new Date().toISOString(),
        actorName: user.displayName || user.email,
        isRead: false
      });
    } catch (e) {
      console.error("Failed to log activity", e);
    }
  };

  // Actions
  const addLead = async (lead: Omit<Lead, 'id'>) => {
    try {
      const { id: _, ...safeLead } = lead as any;
      await addDoc(collection(db, 'leads'), { ...safeLead, dateAdded: new Date().toISOString() });
      logActivity("Lead Added", `New lead ${lead.studentName} added by ${user?.displayName || user?.email}`, 'info');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'leads');
      toast.error("Failed to add lead");
    }
  };

  const deleteLead = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'leads', id));
      logActivity("Lead Record Deleted", `A candidate record (ID: ${id}) was permanently removed from the system`, 'alert');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `leads/${id}`);
      toast.error("Failed to delete lead");
    }
  };

  const bulkDeleteLeads = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      ids.forEach(id => batch.delete(doc(db, 'leads', id)));
      await batch.commit();
      logActivity("Bulk Deletion", `Security Protocol: ${ids.length} lead records were removed simultaneously`, 'alert');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'leads/bulk');
      toast.error("Failed to delete leads");
    }
  };

  const addAdmission = async (admission: Omit<Admission, 'id'>) => {
    try {
      await addDoc(collection(db, 'admissions'), { ...admission, date: new Date().toISOString() });
      logActivity("New Admission Added", `${admission.fullName} application recorded`, 'success');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'admissions');
      toast.error("Failed to add admission");
    }
  };

  const updateAdmission = async (id: string, updates: Partial<Admission>) => {
    try {
      await updateDoc(doc(db, 'admissions', id), updates);
      logActivity("Admission Updated", `Admission ID: ${id} modified`, 'info');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `admissions/${id}`);
      toast.error("Failed to update admission");
    }
  };

  const deleteAdmission = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'admissions', id));
      logActivity("Admission Withdrawn", `Admission record for ID: ${id} was deleted`, 'alert');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `admissions/${id}`);
      toast.error("Failed to delete admission");
    }
  };

  const bulkDeleteAdmissions = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      ids.forEach(id => batch.delete(doc(db, 'admissions', id)));
      await batch.commit();
      logActivity("Bulk Admission Deletion", `Security Cleanup: ${ids.length} admission files removed`, 'alert');
    } catch (e) {
      toast.error("Failed to delete admissions");
    }
  };

  const addStudent = async (student: Omit<Student, 'id'>) => {
    try {
      // Use the student ID as the document ID if provided
      const id = (student as any).id || `SGC-J-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      await setDoc(doc(db, 'students', id), { ...student, id });
      logActivity("Student Record Created", `Full record for ${student.fullName} initialized`, 'success');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'students');
      toast.error("Failed to add student");
    }
  };

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    try {
      await updateDoc(doc(db, 'students', id), updates);
      logActivity("Student Data Modified", `Record for ${id} updated`, 'info');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `students/${id}`);
      toast.error("Failed to update student");
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'students', id));
      logActivity("Student File Purged", `Critical: Student ID: ${id} record was permanently deleted`, 'alert');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `students/${id}`);
      toast.error("Failed to delete student");
    }
  };

  const bulkDeleteStudents = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      ids.forEach(id => batch.delete(doc(db, 'students', id)));
      await batch.commit();
      logActivity("Bulk Student Erasure", `System Alert: ${ids.length} student files were permanently purged from system`, 'alert');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'students/bulk');
      toast.error("Failed to delete students");
    }
  };

  const addStaff = async (member: Omit<Staff, 'id'>) => {
    try {
      const id = `SGC-T-${Math.floor(100 + Math.random() * 900)}`;
      await setDoc(doc(db, 'staff', id), { ...member, id });
      logActivity("Staff Onboarded", `${member.fullName} added to faculty`, 'success');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'staff');
      toast.error("Failed to add staff");
    }
  };

  const updateStaff = async (id: string, updates: Partial<Staff>) => {
    try {
      await updateDoc(doc(db, 'staff', id), updates);
      logActivity("Staff Record Updated", `Details for ${id} modified`, 'info');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `staff/${id}`);
      toast.error("Failed to update staff");
    }
  };

  const deleteStaff = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'staff', id));
      logActivity("Staff Terminated/Removed", `Faculty/Staff ID: ${id} record deleted`, 'alert');
    } catch (e) {
      toast.error("Failed to delete staff");
    }
  };

  const bulkDeleteStaff = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      ids.forEach(id => batch.delete(doc(db, 'staff', id)));
      await batch.commit();
      logActivity("Bulk Staff Data Cleanup", `${ids.length} personnel records purged`, 'alert');
    } catch (e) {
      toast.error("Failed to delete staff records");
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'expenses'), { 
        ...expense, 
        date: expense.date || new Date().toISOString().split('T')[0] 
      });
      logActivity("Expense Recorded", `Rs. ${expense.amount} spent on ${expense.category}`, 'warning');
      toast.success("Expense recorded successfully");
      return docRef.id;
    } catch (e) {
      console.error(e);
      toast.error("Failed to add expense");
    }
  };

  const addIncome = async (inc: Omit<Income, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'income'), { 
        ...inc, 
        date: inc.date || new Date().toISOString().split('T')[0] 
      });
      logActivity("Income Recorded", `Rs. ${inc.amount} received from ${inc.studentName || 'Miscellaneous'}`, 'success');
      toast.success("Income recorded successfully");
      return docRef.id;
    } catch (e) {
      console.error(e);
      toast.error("Failed to record income");
    }
  };

  const updateSettings = async (newSettings: AppSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'config'), newSettings);
      toast.success("Settings updated");
    } catch (e) {
      toast.error("Failed to update settings");
    }
  };

  const importLeads = async (newLeads: Lead[]) => {
    try {
      const batch = writeBatch(db);
      newLeads.forEach(lead => {
        const { id, ...data } = lead;
        batch.set(doc(collection(db, 'leads')), { ...data, dateAdded: new Date().toISOString() });
      });
      await batch.commit();
      logActivity("Bulk Leads Import", `${newLeads.length} leads imported into pool`, 'success');
    } catch (e) {
      toast.error("Failed to import leads");
    }
  };

  const convertLeadsToApplicants = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      for (const id of ids) {
        const leadDoc = await getDoc(doc(db, 'leads', id));
        if (leadDoc.exists()) {
          const leadData = leadDoc.data() as Lead;
          // Add to admissions
          const admissionRef = doc(collection(db, 'admissions'));
          batch.set(admissionRef, {
            fullName: leadData.studentName || 'Unknown Student',
            fatherName: leadData.fatherName || '',
            contactNumber: leadData.fatherPhone || '',
            group: 'Pending', 
            status: 'Not Paid',
            date: new Date().toISOString(),
            previousInstitute: leadData.previousSchool || '',
            address: leadData.areaVillage || '',
            isAdmitted: false,
            // Add defaults for missing required Admission fields
            previousMarks: 0,
            category: 'Standard',
            section: 'Pending',
            subjects: leadData.subjects || [],
            admissionFee: 0,
            totalFeeFinalized: 0,
            totalPackage: 0,
            feeReceived: 0,
            paymentPlan: 'Installments'
          });
          // Mark lead as converted
          batch.update(doc(db, 'leads', id), { isConverted: true });
        }
      }
      await batch.commit();
      logActivity("Leads Converted", `${ids.length} entries transitioned to enrollment pool`, 'success');
      toast.success(`${ids.length} leads successfully converted!`);
    } catch (e) {
      console.error("Conversion error:", e);
      toast.error("Process failed during conversion attempt");
    }
  };

  const confirmAdmission = async (admissionId: string, operatorEmail?: string) => {
    try {
      const admissionDoc = await getDoc(doc(db, 'admissions', admissionId));
      if (!admissionDoc.exists()) return;
      
      const admission = admissionDoc.id ? { id: admissionDoc.id, ...admissionDoc.data() } as Admission : null;
      if (!admission) return;

      const studentId = admission.studentId || `SGC-J-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const totalPackage = admission.totalPackage || (Number(admission.totalFeeFinalized || 0) + Number(admission.admissionFee || 0) + Number(admission.miscFunds || 0)) || 80000;

      const batch = writeBatch(db);

      // 1. Update Admission
      batch.update(doc(db, 'admissions', admissionId), {
        status: 'Admitted/Confirmed',
        studentId,
        totalPackage,
        isAdmitted: true
      });

      // 2. Create Student
      const studentRef = doc(db, 'students', studentId);
      batch.set(studentRef, {
        id: studentId,
        admissionId: admission.id,
        collegeNo: admission.collegeNo || '',
        bayFormNo: admission.bayFormNo || '',
        dob: admission.dob || '',
        previousClass: admission.previousClass || '10th',
        boardRollNo: admission.boardRollNo || '',
        previousMarks: admission.previousMarks || 0,
        category: admission.category || 'Inter Part-1 Boys',
        group: admission.group || '',
        section: admission.section || '',
        fullName: admission.fullName,
        fatherName: admission.fatherName,
        contact: admission.contactNumber,
        address: admission.address,
        gender: admission.gender || 'Male',
        subjects: admission.subjects || [],
        admissionFee: admission.admissionFee || 0,
        miscFunds: admission.miscFunds || 0,
        totalFeeFinalized: admission.totalFeeFinalized || 0,
        totalInstallments: admission.totalInstallments || 12,
        monthlyFee: Math.round(Number(totalPackage || 0) / (admission.totalInstallments || 12)),
        totalPackage: totalPackage,
        feeLedger: {
          totalPackage: totalPackage,
          totalReceived: admission.feeReceived || 0,
          remainingBalance: totalPackage - (admission.feeReceived || 0),
          installments: [],
          transactions: (admission.feeReceived || 0) > 0 ? [{
            id: `tx-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            amount: admission.feeReceived,
            paymentMethod: 'Cash',
            receiptId: `REC-${Date.now().toString().slice(-6)}`,
            description: 'Initial Admission Payment',
            recordedBy: operatorEmail || 'System'
          }] : []
        },
        otherFees: [],
        feeHistory: [],
        performance: [],
        attendance: { present: 0, absent: 0 },
        photo: admission.photo || ''
      });

      // 3. Record Income
      if (admission.feeReceived > 0) {
        const incomeRef = doc(collection(db, 'income'));
        batch.set(incomeRef, {
          studentId: studentId,
          studentName: admission.fullName,
          feeType: 'Admission Fee',
          amount: admission.feeReceived,
          date: new Date().toISOString().split('T')[0],
          status: 'Full',
          gender: admission.gender || 'Male',
          photo: admission.photo || '',
          recordedBy: operatorEmail || 'System'
        });
      }

      await batch.commit();
      logActivity("Registration Finalized", `${admission.fullName} has been officially enrolled and student ID ${studentId} generated`, 'success');
      toast.success("Admission confirmed and student record created!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to confirm admission");
    }
  };

  const recordFeePayment = async (studentId: string, payment: FeePayment, operatorEmail?: string) => {
    try {
      const studentDoc = await getDoc(doc(db, 'students', studentId));
      if (!studentDoc.exists()) return;
      const student = studentDoc.data() as Student;

      const batch = writeBatch(db);

      // 1. Update Student Fee History
      const existingIndex = student.feeHistory.findIndex(f => f.month === payment.month && f.year === payment.year);
      let newHistory = [...student.feeHistory];
      
      if (existingIndex >= 0) {
        const existing = newHistory[existingIndex];
        const totalPaid = existing.amountPaid + payment.amountPaid;
        newHistory[existingIndex] = {
          ...existing,
          amountPaid: totalPaid,
          status: totalPaid >= existing.amountDue ? 'Paid' : 'Partial',
          datePaid: payment.datePaid || new Date().toISOString().split('T')[0]
        };
      } else {
        newHistory.push(payment);
      }

      // 2. Add Transaction to Ledger
      const newTransaction = {
        id: `tx-${Date.now()}`,
        date: payment.datePaid || new Date().toISOString().split('T')[0],
        amount: payment.amountPaid,
        description: `Installment: ${payment.month} ${payment.year}`,
        paymentMethod: 'Cash',
        receiptId: `REC-${Date.now().toString().slice(-6)}`,
        recordedBy: operatorEmail || 'System'
      };

      const totalReceived = (student.feeLedger?.totalReceived || student.feeReceived || 0) + payment.amountPaid;
      const totalPackage = student.totalPackage || student.feeLedger?.totalPackage || 0;
      const remainingBalance = totalPackage - totalReceived;

      batch.update(doc(db, 'students', studentId), { 
        feeHistory: newHistory,
        feeReceived: totalReceived,
        feeLedger: {
          ...student.feeLedger,
          totalReceived,
          remainingBalance,
          transactions: [newTransaction, ...(student.feeLedger?.transactions || [])]
        }
      });

      // 3. Record Income
      const incomeRef = doc(collection(db, 'income'));
      batch.set(incomeRef, {
        studentId: studentId,
        studentName: student.fullName,
        feeType: 'Monthly Installment',
        amount: payment.amountPaid,
        month: payment.month,
        year: payment.year,
        date: payment.datePaid || new Date().toISOString().split('T')[0],
        status: payment.status === 'Paid' ? 'Full' : 'Partial',
        gender: student.gender,
        photo: student.photo || '',
        recordedBy: operatorEmail || 'System'
      });

      await batch.commit();
      logActivity("Installment Received", `${student.fullName} paid Rs. ${payment.amountPaid} for ${payment.month} ${payment.year}`, 'success');
      toast.success("Payment recorded successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to record fee payment");
    }
  };

  const recordFeeTransaction = async (studentId: string, transaction: Omit<FeeTransaction, 'id'>) => {
    try {
      const studentDoc = await getDoc(doc(db, 'students', studentId));
      if (!studentDoc.exists()) return;
      const s = studentDoc.data() as Student;

      const newTransaction = { ...transaction, id: `tx-${Date.now()}` };
      const totalReceived = s.feeLedger.totalReceived + transaction.amount;
      const remainingBalance = s.feeLedger.totalPackage - totalReceived;
      
      await updateDoc(doc(db, 'students', studentId), {
        feeLedger: {
          ...s.feeLedger,
          totalReceived,
          remainingBalance,
          transactions: [newTransaction, ...s.feeLedger.transactions]
        }
      });
      logActivity("Ledger Transaction", `Package payment of Rs. ${transaction.amount} recorded for ${s.fullName}`, 'success');
      toast.success("Transaction recorded");
    } catch (e) {
      toast.error("Failed to record transaction");
    }
  };

  const updateInstallments = async (studentId: string, installments: Installment[]) => {
    try {
      await updateDoc(doc(db, 'students', studentId), {
        'feeLedger.installments': installments
      });
      toast.success("Installments updated");
    } catch (e) {
      toast.error("Failed to update installments");
    }
  };

  const updateFeePackage = async (studentId: string, totalPackage: number) => {
    try {
      const studentDoc = await getDoc(doc(db, 'students', studentId));
      if (!studentDoc.exists()) return;
      const s = studentDoc.data() as Student;

      await updateDoc(doc(db, 'students', studentId), {
        totalPackage,
        'feeLedger.totalPackage': totalPackage,
        'feeLedger.remainingBalance': totalPackage - s.feeLedger.totalReceived
      });
      toast.success("Fee package updated");
    } catch (e) {
      toast.error("Failed to update fee package");
    }
  };

  const generateStudentId = () => {
    return `SGC-J-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  return {
    leads,
    admissions,
    students,
    staff,
    expenses,
    incomes,
    settings,
    permissions,
    notifications,
    loading,
    generateStudentId,
    logActivity,
    addLead,
    updateLead: async (id: string, updates: Partial<Lead>) => {
      try {
        await updateDoc(doc(db, 'leads', id), updates);
        logActivity("Lead Updated", `Lead record updated`, 'info');
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `leads/${id}`);
        toast.error("Failed to update lead");
      }
    },
    deleteLead,
    bulkDeleteLeads,
    importLeads,
    convertLeadsToApplicants,
    addAdmission,
    updateAdmission,
    deleteAdmission,
    bulkDeleteAdmissions,
    confirmAdmission,
    addStudent,
    updateStudent,
    deleteStudent,
    bulkDeleteStudents,
    recordFeePayment,
    recordFeeTransaction,
    updateInstallments,
    updateFeePackage,
    addStaff,
    updateStaff,
    deleteStaff,
    bulkDeleteStaff,
    addExpense,
    addIncome,
    updateSettings,
    academicRecords,
    salaryPayments,
    updatePermission: async (permission: Omit<UserPermission, 'id'>) => {
      try {
        // We'll manage it by email as ID for simplicity
        await setDoc(doc(db, 'permissions', permission.email), permission, { merge: true });
        toast.success("Permissions updated");
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `permissions/${permission.email}`);
        toast.error("Failed to update permissions");
      }
    },
    deletePermission: async (email: string) => {
      try {
        await deleteDoc(doc(db, 'permissions', email));
        toast.success("User access removed");
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `permissions/${email}`);
        toast.error("Failed to remove permissions");
      }
    },
    markNotificationRead: async (id: string) => {
      try {
        await updateDoc(doc(db, 'notifications', id), { isRead: true });
      } catch (e) {
        console.error(e);
      }
    },
    clearAllNotifications: async () => {
      try {
        const batch = writeBatch(db);
        notifications.forEach(n => batch.delete(doc(db, 'notifications', n.id)));
        await batch.commit();
        toast.success("All notifications cleared");
      } catch (e) {
        toast.error("Failed to clear notifications");
      }
    },
    addAcademicRecord: async (record: Omit<AcademicRecord, 'id'>) => {
      try {
        await addDoc(collection(db, 'academicRecords'), record);
      } catch (e) {
        toast.error("Failed to add academic record");
      }
    },
    importAcademicRecords: async (records: Omit<AcademicRecord, 'id'>[]) => {
      try {
        const batch = writeBatch(db);
        records.forEach(record => {
          batch.set(doc(collection(db, 'academicRecords')), record);
        });
        await batch.commit();
        toast.success(`${records.length} records imported successfully`);
      } catch (e) {
        toast.error("Failed to import academic records");
      }
    },
    addSalaryPayment: async (payment: Omit<SalaryPayment, 'id'>) => {
      try {
        const batch = writeBatch(db);
        const paymentRef = doc(collection(db, 'salaryPayments'));
        batch.set(paymentRef, payment);
        
        const expenseRef = doc(collection(db, 'expenses'));
        batch.set(expenseRef, {
          date: payment.date,
          category: 'Staff Salaries',
          amount: payment.amount,
          description: `Salary for ${payment.staffName} (${payment.month} ${payment.year})`,
          addedBy: 'System'
        });
        
        await batch.commit();
        toast.success("Salary payment recorded");
      } catch (e) {
        toast.error("Failed to record salary payment");
      }
    }
  };
}
