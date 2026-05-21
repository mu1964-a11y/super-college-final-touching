# College Management System Context (AI Memory)

## Application Overview
**Name**: SCJ Management System LMS Final
**Client**: Superior Group of Colleges Jahanian (SGC-J)
**Purpose**: A comprehensive ERP / Management system tailored for college administration, keeping track of students, staff, academics, and finances.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide React (for icons)
- **Backend/Database**: **Supabase** (PostgreSQL). Schema defined in `schema.sql` and `supabase_schema.sql`.
- **Utilities**: recharts (charts), date-fns, jspdf & react-to-print (exports)

## Database Architecture (Supabase)
Major tables include:
- `settings`: Global app settings, campus name, enabled modules.
- `leads`: Pre-admission lead tracking (converted into admissions).
- `admissions`: Records of students going through the admission phase.
- `students`: Admitted and enrolled students.
- `staff`: Staff profiles. Crucial fields include `id`, `full_name`, `role`, `salary`, `photo_url` (mapped as `photo` in UI).
- `staff_attendance`: Daily/Monthly attendance logs for payroll considerations.
- `staff_advances`: Salary advance logs, deductions, remaining balances.
- `staff_timetable`: Class scheduling.
- `incomes`, `expenses`: For overall account ledgers.
- `student_fees`: Fee ledgers for active students.

## Major Modules & Their Logic
1. **Staff Module**:
   - Has Sub-tabs: **Directory, Attendance, Payroll, Subjects, Timetable**.
   - *Payroll Logic*: Salaries are computed dynamically based on: `Base Salary` - `Late Arrival Deductions` - `Absent Deductions` - `Advance Salary Recovery`.
   - *Advance Salary*: Keeps track of total money advanced, tracks monthly deductions explicitly through Supabase `staff_advances` table, and automatically deducts during Payroll Generation until remaining balance hits zero.
2. **Students & Admissions**:
   - Converts leads -> Admitted Students.
3. **Accounts**:
   - Fee tracking, general expenses, and income management.
4. **Academic**:
   - Classes, sections, subjects, and exams generation.

## Key Rules & Developer Notes for AI Agent (Persistent Context)
As the project grows over the upcoming months, strictly adhere to these rules:

1. **State Null/Undefined Guards (CRITICAL)**:
   - React components frequently handle database data that can be `null` or missing (`undefined`).
   - When applying filters, ALWAYS use fallbacks before `.toLowerCase()` or `.includes()`.
     - *Incorrect*: `s.fullName.toLowerCase()`
     - *Correct*: `(s.fullName || '').toLowerCase()`
2. **Supabase Field Mappings**:
   - The Postgres Database uses `snake_case` (e.g., `date_issued`, `photo_url`, `base_salary`). React state relies on `camelCase` (e.g., `dateIssued`, `photo`, `baseSalary`).
   - *Actionably*: Always ensure perfect mappings inside hooks such as `useStaffOperations.ts`. Never assume field names without double-checking the Supabase tables in `supabase_schema.sql`.
3. **Module Interconnectivity**:
   - Changes in `StaffView` (adding a new teacher) directly impact `StaffPayroll`, `StaffTimetable`, and `StaffAttendance`. All sub-lists rely on `staffList` passed as props.
   - If records are "hidden" or "missing" from one sub-module, the first diagnostic step should ALWAYS be to check the local filtering logic (`filteredStaff` array logic) in that specific component.
4. **Local Storage Fallback vs DB**:
   - Code frequently utilizes a mix of React local state and Supabase queries. Always prioritize mutating DB first -> then adjusting UI state.
5. **Access Control & Permissions**:
   - Rely on the robust `isAdmin` check (from `userPermission?.isAdmin`) instead of hardcoding `isSuperAdmin` strictly to an email. Users granted Super Admin access from the Settings > Sub-Admins UI must have global app access without constraints.
6. **Dynamic Campus / View Labelling**:
   - Use dynamic conditional labels depending on props or context instead of hardcoding strings. For instance: `gender === 'Male' ? 'Boys Campus' : gender === 'Female' ? 'Girls Campus' : 'Student Records'` or `All Campuses`.
7. **Tabs & Modular UIs**:
   - Complex views like `FeeManagementView` use tab-based navigation (`collect`, `records`, `structure`, `defaulters`) to cleanly separate concerns and improve UX. Never break this separated structure.
8. **Language Preference**:
   - MUST ALWAYS COMMUNICATE AND REPLY IN ENGLISH OR HINGLISH ONLY. Do not use pure Urdu responses.
9. **Session Normalization**:
   - A logic hook is applied in `App.tsx` (`normalizeSession`) that forces any usage of `2026-2028` (or similar 4-digit ended sessions) to be read, processed, and tracked as `2026-28`. Keep this in your logic, the system will naturally consider `2026-2028` as `2026-28`.

