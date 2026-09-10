"""
TBTA Attendance & Homework Spreadsheet Generator
Maintains complete Attendance + Homework evaluation sheets for all classes:
- Attendance Sheets: illanthalir, Mazhalai, Nilai-1, Nilai-2, Nilai-3, Nilai-4, Nilai-5, Nilai-6, Nilai-7, Nilai-8
- Homework Evaluation Sheets: HW_illanthalir, HW_Mazhalai, HW_Nilai-1, HW_Nilai-2, HW_Nilai-3, HW_Nilai-4, HW_Nilai-5, HW_Nilai-6, HW_Nilai-7, HW_Nilai-8
- Homework Summary: Class-by-class Ontime, Perfection, Handwriting, Effort metrics
- Teacher Sheet: Assigned teachers, classrooms, contact details, attendance tracking
- Committee Registry: Leadership & committee members
- Summary Dashboard: Real-time attendance KPIs
"""

import os
import sys
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from datetime import datetime, timedelta

def get_school_year_fridays(year_start=2026, year_end=2027):
    """Generate all Friday dates for the school year (Aug to June)."""
    fridays = []
    # Start around mid August
    cur = datetime(year_start, 8, 14)
    end = datetime(year_end, 6, 4)
    while cur <= end:
        if cur.weekday() == 4: # Friday
            fridays.append(cur.strftime("%Y-%m-%d"))
        cur += timedelta(days=1)
    return fridays

def create_tbta_sheets(output_path="attendance_template.xlsx"):
    wb = openpyxl.Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    fridays = get_school_year_fridays()

    # Style definitions
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    hw_header_fill = PatternFill(start_color="0F766E", end_color="0F766E", fill_type="solid")
    summary_header_fill = PatternFill(start_color="4338CA", end_color="4338CA", fill_type="solid")
    border_thin = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    classes_def = [
        {"name": "illanthalir", "grade": "Ilanthalir", "room": "126", "has_sections": False},
        {"name": "Mazhalai", "grade": "Mazhalai", "room": "116", "has_sections": False},
        {"name": "Nilai-1", "grade": "Nilai 1", "room": "118", "has_sections": False},
        {"name": "Nilai-2", "grade": "Nilai 2", "room": "122 / 125", "has_sections": True, "sections": ["2A", "2B"]},
        {"name": "Nilai-3", "grade": "Nilai 3", "room": "124 / 127", "has_sections": True, "sections": ["3A", "3B"]},
        {"name": "Nilai-4", "grade": "Nilai 4", "room": "129 / 130", "has_sections": True, "sections": ["4A", "4B"]},
        {"name": "Nilai-5", "grade": "Nilai 5", "room": "120", "has_sections": False},
        {"name": "Nilai-6", "grade": "Nilai 6", "room": "115", "has_sections": False},
        {"name": "Nilai-7", "grade": "Nilai 7", "room": "117", "has_sections": False},
        {"name": "Nilai-8", "grade": "Nilai 8", "room": "111", "has_sections": False}
    ]

    # Sample student generation per class
    sample_students_by_class = {
        "illanthalir": [("S001", "Aadhavan", "Kumar", "2021-04-12", "Ilanthalir")],
        "Mazhalai": [("S002", "Abinaya", "Selvam", "2020-05-18", "Mazhalai")],
        "Nilai-1": [("S003", "Akilan", "Rajan", "2019-06-22", "Nilai 1")],
        "Nilai-2": [
            ("S004", "Amudhan", "Sundaram", "2018-03-15", "Nilai 2", "2A"),
            ("S005", "Anbarasu", "Pandian", "2018-07-19", "Nilai 2", "2B")
        ],
        "Nilai-3": [
            ("S006", "Arul", "Arasan", "2017-02-11", "Nilai 3", "3A"),
            ("S007", "Balan", "Thambi", "2017-08-25", "Nilai 3", "3B")
        ],
        "Nilai-4": [
            ("S008", "Chitra", "Vasagam", "2016-01-30", "Nilai 4", "4A"),
            ("S009", "Devan", "Nambi", "2016-09-14", "Nilai 4", "4B")
        ],
        "Nilai-5": [("S010", "Ezhil", "Govindan", "2015-11-05", "Nilai 5")],
        "Nilai-6": [("S011", "Iniyan", "Mani", "2014-10-18", "Nilai 6")],
        "Nilai-7": [("S012", "Kailash", "Raja", "2013-12-08", "Nilai 7")],
        "Nilai-8": [("S013", "Kamali", "Kumar", "2012-04-20", "Nilai 8")]
    }

    # 1. Class Attendance Sheets
    for c in classes_def:
        ws = wb.create_sheet(title=c["name"])
        headers = ["Student ID", "First Name", "Last Name", "Date Of Birth", "Nilai"]
        if c["has_sections"]:
            headers.append("Class")
        headers.extend(fridays)

        ws.append(headers)
        for col_num, h in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")

        students = sample_students_by_class.get(c["name"], [])
        for s in students:
            row = [s[0], s[1], s[2], s[3], s[4]]
            if c["has_sections"]:
                row.append(s[5] if len(s) > 5 else c["sections"][0])
            # Default attendance empty for Fridays
            row.extend(["" for _ in fridays])
            ws.append(row)

    # 2. Class Homework Evaluation Sheets (HW_*)
    for c in classes_def:
        ws_hw = wb.create_sheet(title=f"HW_{c['name']}")
        hw_headers = ["Student ID", "First Name", "Last Name", "Class", "Ontime (Y/N)", "Perfection (Y/N)", "Handwriting (Y/N)", "Effort (Y/N)", "Date"]
        ws_hw.append(hw_headers)

        for col_num, h in enumerate(hw_headers, 1):
            cell = ws_hw.cell(row=1, column=col_num)
            cell.fill = hw_header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")

        students = sample_students_by_class.get(c["name"], [])
        for s in students:
            cls_name = s[4] if not c["has_sections"] else f"{s[4]} {s[5] if len(s)>5 else c['sections'][0]}"
            ws_hw.append([s[0], s[1], s[2], cls_name, "Y", "Y", "Y", "Y", fridays[0]])

    # 3. Homework Summary Sheet
    ws_hw_summary = wb.create_sheet(title="Homework_Summary")
    hw_sum_headers = ["Grade / Class", "Room", "Total Students", "Ontime", "Perfection", "Handwriting", "Effort", "Evaluation Date"]
    ws_hw_summary.append(hw_sum_headers)
    for col_num, h in enumerate(hw_sum_headers, 1):
        cell = ws_hw_summary.cell(row=1, column=col_num)
        cell.fill = summary_header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for c in classes_def:
        ws_hw_summary.append([c["grade"], c["room"], len(sample_students_by_class.get(c["name"], [])), "100%", "100%", "100%", "100%", fridays[0]])

    # 4. Teachers Sheet
    ws_teachers = wb.create_sheet(title="Teacher")
    teacher_headers = ["Teacher ID", "First Name", "Last Name", "Class Assignment", "Room", "Email", "Phone"] + fridays
    ws_teachers.append(teacher_headers)
    for col_num, h in enumerate(teacher_headers, 1):
        cell = ws_teachers.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    teachers_data = [
        ["T001", "Venkatesh", "Sundar", "Ilanthalir", "126", "venkatesh.s@school.com", "813-555-0101"],
        ["T002", "Rajesh", "Karthik", "Mazhalai", "116", "rajesh.k@school.com", "813-555-0102"],
        ["T003", "Divya", "Selvam", "Nilai 1", "118", "divya.s@school.com", "813-555-0103"],
        ["T004", "Suresh", "Mani", "Nilai 2A", "122", "suresh.m@school.com", "813-555-0104"],
        ["T005", "Priya", "Arasan", "Nilai 2B", "125", "priya.a@school.com", "813-555-0105"],
        ["T006", "Karthik", "Pandian", "Nilai 3A", "124", "karthik.p@school.com", "813-555-0106"],
        ["T007", "Meena", "Rajan", "Nilai 3B", "127", "meena.r@school.com", "813-555-0107"],
        ["T008", "Anand", "Nambi", "Nilai 4A", "129", "anand.n@school.com", "813-555-0108"],
        ["T009", "Lakshmi", "Govindan", "Nilai 4B", "130", "lakshmi.g@school.com", "813-555-0109"],
        ["T010", "Ganesh", "Thambi", "Nilai 5", "120", "ganesh.t@school.com", "813-555-0110"],
        ["T011", "Saravanan", "Vasagam", "Nilai 6", "115", "saravanan.v@school.com", "813-555-0111"],
        ["T012", "Bhavani", "Sundaram", "Nilai 7", "117", "bhavani.s@school.com", "813-555-0112"],
        ["T013", "Murugan", "Chitra", "Nilai 8", "111", "murugan.c@school.com", "813-555-0113"]
    ]
    for t in teachers_data:
        row = list(t) + ["" for _ in fridays]
        ws_teachers.append(row)

    # 5. Committee Sheet
    ws_committee = wb.create_sheet(title="Committee")
    comm_headers = ["ID", "Name", "Role"]
    ws_committee.append(comm_headers)
    for col_num, h in enumerate(comm_headers, 1):
        cell = ws_committee.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    committee_members = [
        ["C01", "Senthamil Arasan", "President (Committee 1)"],
        ["C02", "Bharathi Raja", "Committee Member 2"],
        ["C03", "Elango Mani", "Committee Member 3"],
        ["C04", "Kavitha Sundar", "Committee Member 4"],
        ["C05", "Muthu Pandian", "Committee Member 5"],
        ["C06", "Nila Govindan", "Committee Member 6"],
        ["C07", "Selvam Nambi", "Committee Member 7"],
        ["C08", "Senthamil Thambi", "Committee Member 8"]
    ]
    for row in committee_members:
        ws_committee.append(row)

    # 6. Summary Dashboard Sheet
    ws_dashboard = wb.create_sheet(title="Summary_Dashboard")
    dash_headers = ["Grade / Class", "Room", "Total Students", "Present", "Absent", "Unmarked", "Attendance Rate"]
    ws_dashboard.append(dash_headers)
    for col_num, h in enumerate(dash_headers, 1):
        cell = ws_dashboard.cell(row=1, column=col_num)
        cell.fill = summary_header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for c in classes_def:
        ws_dashboard.append([c["grade"], c["room"], len(sample_students_by_class.get(c["name"], [])), 0, 0, len(sample_students_by_class.get(c["name"], [])), "0%"])

    # Auto adjust column widths
    for sheet in wb.worksheets:
        for col in sheet.columns:
            max_len = 0
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            for cell in col:
                val = str(cell.value or '')
                if len(val) > max_len:
                    max_len = len(val)
            sheet.column_dimensions[col_letter].width = max(max_len + 3, 12)

    wb.save(output_path)
    print(f"Excel workbook generated successfully at: {os.path.abspath(output_path)}")

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "attendance_template.xlsx"
    create_tbta_sheets(out)
