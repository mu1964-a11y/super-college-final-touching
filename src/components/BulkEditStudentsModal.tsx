import * as React from 'react';
import { useState } from 'react';
import {
  Edit,
  CheckCircle2,
  AlertCircle,
  Users,
  Layers,
  Calendar,
  GraduationCap,
  Sparkles,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Student } from '../types';
import {
  MASTER_ACADEMIC_GROUPS,
  CANONICAL_SESSIONS,
  normalizeSessionString
} from '../lib/academicMasterData';
import { supabase } from '../lib/supabase';

interface BulkEditStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudents: Student[];
  data: any;
  onSuccess?: () => void;
}

export default function BulkEditStudentsModal({
  isOpen,
  onClose,
  selectedStudents,
  data,
  onSuccess
}: BulkEditStudentsModalProps) {
  // Field toggles
  const [applyGroup, setApplyGroup] = useState(false);
  const [newGroup, setNewGroup] = useState<string>('BS Zoology');

  const [applySession, setApplySession] = useState(false);
  const [newSession, setNewSession] = useState<string>('2024-26');

  const [applySemester, setApplySemester] = useState(false);
  const [newSemester, setNewSemester] = useState<number>(8);

  const [applySection, setApplySection] = useState(false);
  const [newSection, setNewSection] = useState<string>('BS-A');

  const [isUpdating, setIsUpdating] = useState(false);

  const handleApplyChanges = async () => {
    if (!applyGroup && !applySession && !applySemester && !applySection) {
      toast.warning("Please check at least one field to update!");
      return;
    }

    if (!selectedStudents.length) {
      toast.error("No students selected!");
      return;
    }

    setIsUpdating(true);
    const toastId = toast.loading(`Updating ${selectedStudents.length} students...`);

    try {
      const studentUpdates: any = {};
      const admissionUpdates: any = {};

      if (applyGroup) {
        studentUpdates.group = newGroup;
        admissionUpdates.group = newGroup;
        const groupObj = MASTER_ACADEMIC_GROUPS.find(g => g.name === newGroup);
        if (groupObj) {
          studentUpdates.subjects = groupObj.subjects;
          admissionUpdates.subjects = groupObj.subjects;
        }
      }

      if (applySession) {
        const cleanSes = normalizeSessionString(newSession);
        studentUpdates.session = cleanSes;
        admissionUpdates.session = cleanSes;
      }

      if (applySemester) {
        studentUpdates.current_semester = newSemester;
        studentUpdates.academic_part = newSemester >= 5 ? 'Part-2' : 'Part-1';
        admissionUpdates.current_semester = newSemester;
        admissionUpdates.academic_part = newSemester >= 5 ? 'Part-2' : 'Part-1';
      }

      if (applySection) {
        studentUpdates.section = newSection;
        admissionUpdates.section = newSection;
      }

      const ids = selectedStudents.map(s => s.id);
      const explicitAdmIds = selectedStudents
        .map(s => s.admissionId || (s.id && s.id.startsWith('adm-') ? s.id : null))
        .filter(Boolean) as string[];

      // 1. Update students table by primary key id
      const { error: stuErr } = await supabase.from('students').update(studentUpdates).in('id', ids);
      if (stuErr) throw stuErr;

      // 2. Update admissions table strictly by immutable admission ID or student's own unique PK
      if (explicitAdmIds.length > 0) {
        await supabase.from('admissions').update(admissionUpdates).in('id', explicitAdmIds);
      }
      
      // For any student whose admissionId wasn't stored, update admission specifically by student_id and full_name
      const remainingStudents = selectedStudents.filter(s => !s.admissionId);
      for (const st of remainingStudents) {
        if (st.id && !st.id.startsWith('adm-')) {
          await supabase.from('admissions').update(admissionUpdates)
            .eq('student_id', st.id)
            .eq('full_name', st.fullName);
        }
      }

      // 3. Log audit activity
      const updatedFieldsList: string[] = [];
      if (applyGroup) updatedFieldsList.push(`Group -> ${newGroup}`);
      if (applySession) updatedFieldsList.push(`Session -> ${newSession}`);
      if (applySemester) updatedFieldsList.push(`Semester -> ${newSemester}`);
      if (applySection) updatedFieldsList.push(`Section -> ${newSection}`);

      if (data?.logActivity) {
        data.logActivity(
          "Bulk Edit Students",
          `Updated ${selectedStudents.length} students (${updatedFieldsList.join(', ')})`,
          'info'
        );
      }

      toast.dismiss(toastId);
      toast.success(`Successfully updated ${selectedStudents.length} students!`);
      if (data?.fetchData) await data.fetchData(true);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Bulk Edit Error:", err);
      toast.dismiss(toastId);
      toast.error(`Bulk edit failed: ${err.message || 'Database update error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[92vh] overflow-hidden flex flex-col p-0 rounded-3xl border-none shadow-2xl bg-white dark:bg-slate-900">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-superior-teal to-teal-900 text-white p-5 sm:p-6 shrink-0 flex items-center justify-between border-b border-teal-700/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Edit size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-serif font-black tracking-tight text-white">
                  Bulk Edit Academic Records
                </h2>
                <Badge className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-0.5">
                  {selectedStudents.length} Students Selected
                </Badge>
              </div>
              <p className="text-xs text-teal-100/80 mt-0.5">
                Batch correct Group, Session, Semester, or Section across selected candidates with audit log.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 h-9 w-9 p-0 rounded-xl"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Form Body & Previews */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">
              Select Fields to Update in Batch
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field 1: Academic Group */}
              <div className={cn(
                "p-4 rounded-2xl border transition-all space-y-2",
                applyGroup ? "border-superior-teal bg-teal-50/20 dark:bg-teal-950/20" : "border-slate-200 dark:border-slate-700"
              )}>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="chk-group"
                    checked={applyGroup}
                    onCheckedChange={(c) => setApplyGroup(Boolean(c))}
                  />
                  <Label htmlFor="chk-group" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Academic Group / Degree
                  </Label>
                </div>
                <Select value={newGroup} onValueChange={setNewGroup} disabled={!applyGroup}>
                  <SelectTrigger className="h-10 bg-white dark:bg-slate-900 font-semibold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MASTER_ACADEMIC_GROUPS.map(g => (
                      <SelectItem key={g.id} value={g.name}>{g.name} ({g.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Field 2: Session */}
              <div className={cn(
                "p-4 rounded-2xl border transition-all space-y-2",
                applySession ? "border-superior-teal bg-teal-50/20 dark:bg-teal-950/20" : "border-slate-200 dark:border-slate-700"
              )}>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="chk-session"
                    checked={applySession}
                    onCheckedChange={(c) => setApplySession(Boolean(c))}
                  />
                  <Label htmlFor="chk-session" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Academic Session
                  </Label>
                </div>
                <Select value={newSession} onValueChange={setNewSession} disabled={!applySession}>
                  <SelectTrigger className="h-10 bg-white dark:bg-slate-900 font-mono font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CANONICAL_SESSIONS.map((sess) => (
                      <SelectItem key={sess} value={sess} className="font-mono font-bold">
                        {sess}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Field 3: Current Semester */}
              <div className={cn(
                "p-4 rounded-2xl border transition-all space-y-2",
                applySemester ? "border-superior-teal bg-teal-50/20 dark:bg-teal-950/20" : "border-slate-200 dark:border-slate-700"
              )}>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="chk-semester"
                    checked={applySemester}
                    onCheckedChange={(c) => setApplySemester(Boolean(c))}
                  />
                  <Label htmlFor="chk-semester" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Current Semester (1 to 8)
                  </Label>
                </div>
                <Select value={String(newSemester)} onValueChange={(v) => setNewSemester(Number(v))} disabled={!applySemester}>
                  <SelectTrigger className="h-10 bg-white dark:bg-slate-900 font-bold font-mono"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <SelectItem key={s} value={String(s)}>
                        Semester {s} {s === 8 ? '(Final Semester 8th)' : s === 5 ? '(ADP Lateral 5th)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Field 4: Section */}
              <div className={cn(
                "p-4 rounded-2xl border transition-all space-y-2",
                applySection ? "border-superior-teal bg-teal-50/20 dark:bg-teal-950/20" : "border-slate-200 dark:border-slate-700"
              )}>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="chk-section"
                    checked={applySection}
                    onCheckedChange={(c) => setApplySection(Boolean(c))}
                  />
                  <Label htmlFor="chk-section" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Section Assignment
                  </Label>
                </div>
                <Select value={newSection} onValueChange={setNewSection} disabled={!applySection}>
                  <SelectTrigger className="h-10 bg-white dark:bg-slate-900 font-semibold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BS-A">BS-A</SelectItem>
                    <SelectItem value="BS-B">BS-B</SelectItem>
                    <SelectItem value="A">Section A</SelectItem>
                    <SelectItem value="B">Section B</SelectItem>
                    <SelectItem value="PMC2B">PMC2B (Inter-2 Boys ICS-1 / Medical)</SelectItem>
                    <SelectItem value="EIC2B">EIC2B (Inter-2 Boys ICS-2)</SelectItem>
                    <SelectItem value="MEP2B">MEP2B (Inter-2 Boys Pre-Med / Engineering / ME Plus)</SelectItem>
                    <SelectItem value="PMC2G">PMC2G (Inter-2 Girls Medical / Pre-Med)</SelectItem>
                    <SelectItem value="EIC2G">EIC2G (Inter-2 Girls Pre-Eng)</SelectItem>
                    <SelectItem value="ICS2G">ICS2G (Inter-2 Girls ICS)</SelectItem>
                    <SelectItem value="MEP2G">MEP2G (Inter-2 Girls Plus / Medical)</SelectItem>
                    <SelectItem value="Girls Section">Girls Campus Section</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Affected Candidates Summary Table */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
              Selected Students Preview ({selectedStudents.length} Students)
            </h4>
            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-700">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-2 px-3">Student Name</th>
                    <th className="py-2 px-3">Father Name</th>
                    <th className="py-2 px-3">Current Group</th>
                    <th className="py-2 px-3">Current Session</th>
                    <th className="py-2 px-3 text-center">Sem</th>
                    <th className="py-2 px-3 text-center">Sec</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {selectedStudents.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="py-1.5 px-3 font-bold text-slate-900 dark:text-white">{s.fullName}</td>
                      <td className="py-1.5 px-3 text-slate-600 dark:text-slate-300">{s.fatherName}</td>
                      <td className="py-1.5 px-3">
                        {applyGroup ? (
                          <span className="font-bold text-superior-teal">{newGroup} (New)</span>
                        ) : (
                          <span className="text-slate-500">{s.group}</span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 font-mono">
                        {applySession ? (
                          <span className="font-bold text-superior-teal">{newSession} (New)</span>
                        ) : (
                          <span className="text-slate-500">{s.session}</span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 text-center font-mono">
                        {applySemester ? (
                          <span className="font-bold text-superior-teal">S{newSemester}</span>
                        ) : (
                          <span className="text-slate-500">S{s.currentSemester || 1}</span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 text-center font-mono">
                        {applySection ? (
                          <span className="font-bold text-superior-teal">{newSection}</span>
                        ) : (
                          <span className="text-slate-500">{s.section || 'A'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Changes will be logged to activity history and committed to database immediately.
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl h-10 px-5 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isUpdating || (!applyGroup && !applySession && !applySemester && !applySection)}
              onClick={handleApplyChanges}
              className="bg-superior-teal hover:bg-superior-teal/90 text-white font-bold text-xs rounded-xl h-10 px-6 gap-2 shadow-lg cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span>{isUpdating ? "Applying Updates..." : `Apply to ${selectedStudents.length} Students`}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
