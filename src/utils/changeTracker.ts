export interface ChangeLogItem {
  field: string;
  old: string;
  new: string;
}

export const STUDENT_FIELD_LABELS: Record<string, string> = {
  fullName: "Full Name",
  fatherName: "Father's Name",
  category: "Class Category",
  group: "Group",
  section: "Section",
  contact: "Contact Number",
  email: "Email Address",
  address: "Residential Address",
  monthlyFee: "Monthly Fee",
  totalPackage: "Total Package Fee",
  feeReceived: "Fee Received",
  academicPart: "Academic Part",
  subjects: "Assigned Subjects"
};

export const STAFF_FIELD_LABELS: Record<string, string> = {
  fullName: "Full Name",
  fatherName: "Father's Name",
  role: "Organizational Role",
  cnic: "CNIC Number",
  contact: "Contact Number",
  address: "Residential Address",
  baseSalary: "Base Salary",
  salary: "Active Salary",
  joinDate: "Date of Joining",
  status: "Employment Status",
  subjects: "Taught Subjects",
  qualification: "Qualification"
};

export const ADMISSION_FIELD_LABELS: Record<string, string> = {
  fullName: "Full Name",
  fatherName: "Father's Name",
  category: "Class Category",
  group: "Group",
  section: "Section",
  status: "Admission Status",
  admissionFee: "Admission Fee",
  totalPackage: "Total Package Fee",
  feeReceived: "Fee Received",
  contactNumber: "Contact Number",
  gender: "Gender",
  academicPart: "Academic Part"
};

export const LEAD_FIELD_LABELS: Record<string, string> = {
  studentName: "Student Name",
  fatherName: "Father's Name",
  fatherPhone: "Father's Contact",
  grade: "Grade",
  currentClass: "Current Class",
  previousSchool: "Previous School",
  areaVillage: "Area/Village",
  city: "City",
  finalizedFee: "Finalized Package"
};

export function diffObjects(
  oldObj: any, 
  newObj: any, 
  fieldLabels: Record<string, string>
): ChangeLogItem[] {
  const changes: ChangeLogItem[] = [];
  if (!oldObj || !newObj) return changes;

  for (const key of Object.keys(fieldLabels)) {
    const oldValue = oldObj[key];
    const newValue = newObj[key];

    if (newValue !== undefined) {
      if (Array.isArray(oldValue) || Array.isArray(newValue)) {
        const arrOld = Array.isArray(oldValue) ? oldValue : [];
        const arrNew = Array.isArray(newValue) ? newValue : [];
        const strOld = JSON.stringify([...arrOld].sort());
        const strNew = JSON.stringify([...arrNew].sort());
        if (strOld !== strNew) {
          changes.push({
            field: fieldLabels[key],
            old: arrOld.length > 0 ? arrOld.join(', ') : 'None',
            new: arrNew.length > 0 ? arrNew.join(', ') : 'None'
          });
        }
      } else {
        const strOld = String(oldValue ?? '');
        const strNew = String(newValue ?? '');
        if (strOld !== strNew) {
          changes.push({
            field: fieldLabels[key],
            old: oldValue !== null && oldValue !== undefined && String(oldValue).trim() !== '' ? String(oldValue) : 'None',
            new: newValue !== null && newValue !== undefined && String(newValue).trim() !== '' ? String(newValue) : 'None'
          });
        }
      }
    }
  }
  return changes;
}
