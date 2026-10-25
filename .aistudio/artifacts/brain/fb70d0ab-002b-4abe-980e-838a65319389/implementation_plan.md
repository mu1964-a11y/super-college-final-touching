# Multi-Punch Staff Attendance, All-Program Timetable & Multi-Subject Marks Matrix

This upgrade introduces three real-world campus operations workflows for Superior College Jahanian: (1) a 4-stage Biometric & Manual Staff Movement Engine that tracks Morning Arrival, Mid-Day Free-Period/Recess Exit & Return, and Final Off-Duty Departure; (2) a Program-Tabbed Timetable Builder covering Intermediate, BS, DIT, and UKL3 with automatic class/section discovery; and (3) a Multi-Subject Marks Entry Matrix where every subject has its own custom Total Marks and Test Date with live Grand Total calculation.

## User Review & Critical Decisions

> [!IMPORTANT]
> All three architectural choices below reflect your confirmed preferences from our discussion and are 100% backward-compatible with your existing Supabase database schema (zero SQL migrations required).

- **Confirmed Decision 1 (Staff Mid-Day Movement Tracking)**: Biometric and manual staff attendance will support 4 daily punch states — **1st Scan: Morning Check-In**, **2nd Scan: Mid-Day Gate Out (Recess / Free Period)**, **3rd Scan: Mid-Day Gate In (Return for Lecture)**, and **4th Scan: Final Off-Duty Check-Out** (with an optional 1-click selector if a teacher is leaving early for the day on their 2nd scan).
- **Confirmed Decision 2 (All-Program Timetable Organization)**: The Timetable module will feature top-level **Program Tabs (`Intermediate`, `BS Programs`, `DIT`, `UKL3`)** that automatically discover all active classes, groups, and Boys/Girls sections from enrolled student records, while also allowing new sections to be added on the fly.
- **Confirmed Decision 3 (Multi-Subject Marks Entry Sheet)**: Marks Entry will default to a **Multi-Subject Spreadsheet Matrix** where selecting a Program, Campus (Boys/Girls), Group/Class, and Section loads all relevant subjects as columns. Each subject column header has its own editable **Custom Total Marks** (e.g., `85`, `100`, `50`, `30`) and **Test Date**, and each student row automatically computes **Grand Obtained, Grand Total, Percentage, and Grade**.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Staff Movement & Gate Pass Tracking**: Distinguishes between a teacher stepping out during a free period/recess and a teacher leaving at the end of duty, recording exact timestamps for each punch (`Morning In`, `Break Out`, `Break In`, `Final Out`) and calculating net campus presence.
  2. **Unified Multi-Program Timetable (`Inter`, `BS`, `DIT`, `UKL3`)**: Gives administrators and coordinators a visual Period 1–7 grid for every program in the college, automatically preventing a teacher from being double-booked across Intermediate and BS/DIT classes at the same time.
  3. **Multi-Subject Exam Matrix**: Replaces repetitive single-subject entry with a single unified marksheet per class where all subjects, their individual total marks, and test dates are configured at the top of each column and saved in one click.
- **Target Audience / Persona**: Principal, Campus Coordinators, Examination Controller, Biometric Gate Operator, and Faculty Members.
- **Key Value**: Eliminates premature "Off-Duty Check-Out" errors when teachers go out for recess/free periods, brings BS/DIT/UKL3 classes into the official timetable, and cuts exam result entry time by up to 80%.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  - **Flow 1: Staff 4-Stage Biometric & Manual Movement**:
    1. When a teacher scans their thumb in the morning (`07:52 AM`), the system logs **Morning Check-In (`Present` / `Late`)**.
    2. When the same teacher scans during recess or a free period (`11:10 AM`), the terminal automatically logs **Mid-Day Gate Out (Recess / Free Period)** (and offers a quick toggle if they are taking a Half-Day/Final Check-Out instead).
    3. When the teacher returns for their next lecture (`11:45 AM`), the 3rd scan logs **Mid-Day Gate In (Returned to Campus)**.
    4. At dismissal (`02:15 PM`), the 4th scan logs **Final Off-Duty Check-Out**.
    5. All 4 timestamps appear clearly in the Staff Attendance Register, Staff Portal, PDF Attendance Ledger, and WhatsApp summaries.
  - **Flow 2: Program-Tabbed Timetable (`Inter | BS | DIT | UKL3`)**:
    1. Admin opens **Staff > Timetable** and selects a Program Tab at the top (`Intermediate`, `BS Programs`, `DIT`, or `UKL3`) and Campus filter (`All`, `Boys Campus`, `Girls Campus`).
    2. The system automatically lists all active groups/sections for that program (e.g., `F.Sc Pre-Medical - Sec A`, `ICS - Sec B`, `BS Computer Science`, `BS English`, `DIT`, `UKL3`) derived from enrolled students and saved sections.
    3. Admin clicks any cell in the **Period 1 – Period 7** grid (or uses Quick Assign) to pick the **Subject**, **Teacher**, and **Room**. If that teacher is already teaching in *any* other program (e.g., teaching Inter Physics in Period 2 while being assigned BS Physics in Period 2), a real-time **Cross-Program Clash Alert** warns the user.
  - **Flow 3: Multi-Subject Marks Matrix with Custom Totals & Dates**:
    1. Admin/Teacher opens **Academics > Fast Marks Sheet** and selects **Program (`Inter | BS | DIT | UKL3`)**, **Boys/Girls**, **Group/Class**, **Section**, and **Test Session** (e.g., `Monthly Exam - October 2026`, `Weekly Test`, `Send-Up`).
    2. The sheet automatically loads the standard subjects for that group (e.g., `Physics`, `Chemistry`, `Biology`, `English`, `Urdu`, `Islamiat` for Pre-Medical) and allows adding/removing any custom subject column with one click.
    3. In the **Column Header of each Subject**, the user sets:
       - **Custom Total Marks** for that subject (e.g., Physics = `85`, English = `100`, Islamiat = `50`, or apply a single total to all subjects with 1 click).
       - **Subject Test Date** (defaults to the exam date, or customizable per subject paper date).
    4. Below, the scrollable student roster shows all students in roll-number order. The operator types marks across columns or down rows using `Enter`, `Tab`, or Arrow keys (`↑ ↓ ← →`), or types `A` for Absent.
    5. The rightmost columns display live **Grand Obtained / Grand Total** (e.g., `438 / 505`), **Percentage (`86.7%`)**, and **Grade (`A+`)**.
    6. Clicking **Download Multi-Subject Excel Template** exports a ready-to-fill Excel sheet containing all subject columns with their custom total marks and dates; uploading it back populates the entire class matrix immediately.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Crisp Enterprise Academic ERP with high-density tabular grids, sticky headers, and zero nested-card clutter.
  - *Color Palette & Mood*: Deep Superior Emerald (`#064e43`) primary headers, warm gold (`#c9a84c`) active indicators, clean white (`#FFFFFF`) and slate (`#F8FAFC`) table surfaces, semantic badges for movement states (Emerald for `In Campus`, Amber for `Mid-Day Out`, Indigo for `Returned`, Slate for `Checked Out`).
  - *Typography & Hierarchy*: `Plus Jakarta Sans` for headers and controls, paired with `JetBrains Mono` (`tabular-nums`) for all attendance timestamps, subject marks, grand totals, and percentages so columns align vertically to the pixel.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Schema-Safe JSON Persistence for 4-Stage Movement Timestamps**
  - *Chosen Approach*: Store `checkIn`, `breakOut`, `breakIn`, `checkOut`, and a chronological `movements` array inside the existing `notes` JSON field of `staff_attendance` while keeping `status` (`Present` / `Late` / `Absent` / `Leave`) in the core column.
  - *Why*: Works 100% reliably with the current Supabase `staff_attendance` table without requiring any `ALTER TABLE` SQL commands, and preserves full compatibility with existing attendance records.
- **Decision 2: Automatic Cross-Program Section Discovery in Timetable**
  - *Chosen Approach*: Dynamically derive program-tagged sections from both `settings.predefinedSections` AND live enrolled students (`students` array grouped by `Inter`, `BS`, `DIT`, `UKL3` + `group` + `section` + `gender`), plus store the `program` tag inside each timetable entry.
  - *Why*: Ensures that BS, DIT, and UKL3 classes appear automatically in the Timetable builder as soon as students are enrolled, without forcing the admin to manually pre-create every class in Settings first.
- **Decision 3: Multi-Subject Matrix + Single-Subject Compatibility in `academic_records`**
  - *Chosen Approach*: The UI presents a unified **Multi-Subject Matrix** where each cell `(student, subject)` saves as a clean, standard `AcademicRecord` row (`studentId`, `subject`, `obtainedMarks`, `totalMarks`, `date`, `testType`, `testName`) in Supabase.
  - *Why*: Gives the operator a fast, single-screen multi-subject spreadsheet experience with custom total marks and test date per subject, while keeping 100% compatibility with Student Portals, 6-Month Progress Charts, Merit Lists, and WhatsApp Result Card PDFs.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     SUPERIOR COLLEGE JAHANIAN ERP                            │
└──────────────────────┬───────────────────────────┬───────────────────────────┘
                       │                           │
       ┌───────────────▼───────────────┐   ┌───────▼───────────────────────────┐
       │   STAFF MODULE & BIOMETRICS   │   │   ACADEMICS & MULTI-SUBJECT MARKS │
       └───────┬───────────────┬───────┘   └───────┬───────────────────────────┘
               │               │                   │
┌──────────────▼─────┐ ┌───────▼──────────────┐ ┌──▼───────────────────────────┐
│ 4-Stage Biometric  │ │ Multi-Program        │ │ Multi-Subject Marks Matrix   │
│ Movement Engine    │ │ Timetable Builder    │ │ (BatchMarksEntry Upgraded)   │
│ • 1st: Morning In  │ │ • Tabs: Inter | BS   │ │ • Program/Gender/Group/Sec   │
│ • 2nd: Break Out   │ │   | DIT | UKL3       │ │ • Subject Columns w/ Custom  │
│ • 3rd: Break In    │ │ • Auto Class/Section │ │   Total Marks & Test Date    │
│ • 4th: Final Out   │ │   Discovery          │ │ • Live Grand Total, % & Grade│
│ • Manual Override  │ │ • Cross-Program      │ │ • Multi-Subject Excel Import │
│   & WhatsApp Alert │ │   Teacher Clash Guard│ │   & Export Template          │
└──────────────┬─────┘ └───────┬──────────────┘ └──┬───────────────────────────┘
               │               │                   │
               └───────────────┴─────────┬─────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│     Supabase Persistence + Official PDF Generator + WhatsApp Bot Bridge      │
│  • extractAttendanceTimings() parses Morning In, Break Out/In & Final Out    │
│  • StaffPortal, StudentPortal & PDFs display full timestamps & subject dates │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State Mapping

1. **4-Stage Staff Attendance Movement Payload (`notes` JSON)**:
   - Structure stored in `staff_attendance.notes`:
     ```json
     {
       "mode": "SecuGen-Biometric",
       "checkIn": "07:52:14 AM",
       "breakOut": "11:05:20 AM",
       "breakIn": "11:42:10 AM",
       "checkOut": "02:15:05 PM",
       "campusState": "Checked-Out",
       "movements": [
         { "type": "MORNING_IN", "time": "07:52:14 AM" },
         { "type": "BREAK_OUT", "time": "11:05:20 AM" },
         { "type": "BREAK_IN", "time": "11:42:10 AM" },
         { "type": "FINAL_OUT", "time": "02:15:05 PM" }
       ]
     }
     ```
   - In `BiometricAttendanceDesk`, `InstantBiometricVerifyModal`, and `StaffAttendance`:
     - Automatically detects the next logical movement step based on existing timestamps for today, while providing a 1-tap override pill (`Break Out` vs `Final Check-Out`) so a teacher leaving permanently at 11:30 AM can mark `Final Check-Out` directly.
     - Displays `Morning In`, `Break Out / In`, and `Final Out` badges in the live feed, Staff Attendance Register, Staff Portal, and PDF Attendance Reports.

2. **All-Program Timetable Builder (`StaffTimetable`)**:
   - Adds Program Switcher Tabs: `All Programs`, `Intermediate`, `BS Programs`, `DIT`, `UKL3`.
   - Auto-discovers classes/sections from `students` (grouping by Program + Group/Course + Section + Gender) and merges them with `predefinedSections`.
   - Allows adding new custom Class/Section entries for any program (`Inter`, `BS`, `DIT`, `UKL3`) directly inside the Timetable modal.
   - Cross-checks teacher availability across **all programs** before saving a period slot.

3. **Multi-Subject Marks Matrix (`BatchMarksEntry`)**:
   - Supports switching between **Multi-Subject Class Matrix Mode (Default)** and **Single-Subject Mode**.
   - Auto-populates default subject lists based on selected Program/Group (e.g., Pre-Medical, Pre-Engineering, ICS, I.Com, FA, BS, DIT, UKL3) with `+ Add Subject` and `× Remove Subject` controls.
   - Each subject column header contains:
     - Subject Title
     - Editable `Total Marks` input (e.g., `85`, `100`, `50`, `30`) + `"Apply to All"` quick button
     - Editable `Test Date` input (`YYYY-MM-DD`)
   - Student rows render fast keyboard-navigable inputs (`Enter` moves down to next student in same subject; `Tab` / `→` moves right to next subject for the same student) plus live `Grand Obtained / Grand Total`, `Percentage`, and `Grade` columns.
