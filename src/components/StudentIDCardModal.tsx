import * as React from 'react';
import ExecutiveIDCardModal, { IDCardEntity } from './ExecutiveIDCardModal';
import { Student } from '../types';

interface StudentIDCardModalProps {
  student: Student | null;
  settings?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StudentIDCardModal({
  student,
  settings,
  open,
  onOpenChange
}: StudentIDCardModalProps) {
  const entity: IDCardEntity | null = React.useMemo(() => {
    if (!student) return null;
    return {
      type: 'student',
      fullName: student.fullName || 'Student',
      fatherName: student.fatherName,
      idNumber: student.collegeNo || student.id,
      categoryOrRole: student.category || student.group || 'Intermediate',
      subCategory: student.section ? `Sec: ${student.section}` : 'General',
      sessionOrValidity: student.session || '2026-28',
      bloodGroup: student.bloodGroup,
      contact: student.contact,
      emergencyContact: student.fatherContact || student.secondaryContact || student.contact,
      cnicOrBForm: student.bayFormNo,
      photo: student.photo,
      address: student.address
    };
  }, [student]);

  return (
    <ExecutiveIDCardModal
      entity={entity}
      settings={settings}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
