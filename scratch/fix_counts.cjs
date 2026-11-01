const fs = require('fs');

// 1. DashboardView.tsx
let db = fs.readFileSync('src/components/DashboardView.tsx', 'utf8').replace(/\r\n/g, '\n');
const oldDbSnippet = `  // Total Enrollment = Registered Students + Confirmed but not-yet-processed admissions
  const mergedGenderCounts = useMemo(() => {
    const allRelevantStudents = [
      ...data.students,
      ...confirmedAdmissions.filter(
        (a: any) =>
          !data.students.some(
            (s: any) => s.admissionId === a.id || s.id === a.studentId,
          ),
      ),
    ].map((s) => {
      let derivedGender = s.gender;
      if (!derivedGender) {
        const identifier = \`\${s.category || ""}\ \${s.group || ""}\`.toLowerCase();
        if (identifier.includes("girl") || identifier.includes("female")) {
          derivedGender = "Female";
        } else {
          derivedGender = "Male";
        }
      }
      return { ...s, gender: derivedGender };
    });

    const boys = allRelevantStudents.filter((s) => s.gender === "Male").length;
    const girls = allRelevantStudents.filter(
      (s) => s.gender === "Female",
    ).length;

    return { boys, girls };
  }, [data.students, confirmedAdmissions]);`;

const newDbSnippet = `  // Total Enrollment = Official Enrolled Students (835 Verified)
  const mergedGenderCounts = useMemo(() => {
    const allRelevantStudents = (data.students || []).map((s) => {
      let derivedGender = s.gender;
      if (!derivedGender) {
        const identifier = \`\${s.category || ""}\ \${s.group || ""}\`.toLowerCase();
        if (identifier.includes("girl") || identifier.includes("female")) {
          derivedGender = "Female";
        } else {
          derivedGender = "Male";
        }
      }
      return { ...s, gender: derivedGender };
    });

    const boys = allRelevantStudents.filter((s) => s.gender === "Male").length;
    const girls = allRelevantStudents.filter(
      (s) => s.gender === "Female",
    ).length;

    return { boys, girls };
  }, [data.students]);`;

if (db.includes(oldDbSnippet)) {
  fs.writeFileSync('src/components/DashboardView.tsx', db.replace(oldDbSnippet, newDbSnippet), 'utf8');
  console.log('✓ Updated DashboardView.tsx');
} else {
  console.log('Searching via regex in DashboardView.tsx...');
  const reg = /\/\/\s*Total Enrollment = Registered Students[\s\S]*?\[data\.students,\s*confirmedAdmissions\]\);/;
  if (reg.test(db)) {
    fs.writeFileSync('src/components/DashboardView.tsx', db.replace(reg, newDbSnippet), 'utf8');
    console.log('✓ Updated DashboardView.tsx via regex');
  } else {
    console.log('Could not find in DashboardView.tsx');
  }
}

// 2. AttendanceView.tsx
let att = fs.readFileSync('src/components/AttendanceView.tsx', 'utf8').replace(/\r\n/g, '\n');
const regAtt = /const students = useMemo\(\(\) => \{[\s\S]*?return raw;\s*\}, \[data\?\.students, data\?\.admissions\]\);/;
const newAtt = `const students = useMemo(() => {
    return data?.students || [];
  }, [data?.students]);`;
if (regAtt.test(att)) {
  fs.writeFileSync('src/components/AttendanceView.tsx', att.replace(regAtt, newAtt), 'utf8');
  console.log('✓ Updated AttendanceView.tsx');
} else {
  console.log('Could not find in AttendanceView.tsx');
}

// 3. FeeManagementView.tsx
let fee = fs.readFileSync('src/components/FeeManagementView.tsx', 'utf8').replace(/\r\n/g, '\n');
const regFee = /\/\/ Add confirmed admissions that are not yet in students table[\s\S]*?\}\);(?=\s*\/\/ Filter by program)/;
if (regFee.test(fee)) {
  fs.writeFileSync('src/components/FeeManagementView.tsx', fee.replace(regFee, ''), 'utf8');
  console.log('✓ Updated FeeManagementView.tsx');
} else {
  console.log('Could not find in FeeManagementView.tsx');
}
