// Authorized Personnel PIN Mapping
const AUTHORIZED_PINS = {
    "9900": { role: "President", name: "Senthamil Arasan" },

    // Principals
    "9001": { role: "Principal", name: "Kavin Selvam", location: "Riverview" },
    "9002": { role: "Principal", name: "Ezhil Tamilarasan", location: "Riverview" },
    "9003": { role: "Principal", name: "Kailash Balan", location: "Riverview" },
    "9004": { role: "Principal", name: "Mugilan Pugazh", location: "Riverview" },

    // Vice Principals
    "9101": { role: "Vice Principal", name: "Amudha Kumar", location: "Riverview" },
    "9102": { role: "Vice Principal", name: "Kamali Chitra", location: "Riverview" },
    "9103": { role: "Vice Principal", name: "Yazhini Nila", location: "Riverview" },
    "9104": { role: "Vice Principal", name: "Oviya Thenmozhi", location: "Riverview" },

    // Committee Members
    "1001": { role: "Committee Member", name: "Bharathi Raja" },
    "1002": { role: "Committee Member", name: "Elango Mani" },
    "1003": { role: "Committee Member", name: "Kavitha Sundar" },
    "1004": { role: "Committee Member", name: "Muthu Pandian" },
    "1005": { role: "Committee Member", name: "Nila Govindan" },
    "1006": { role: "Committee Member", name: "Selvam Nambi" },
    "1007": { role: "Committee Member", name: "Senthamil Thambi" },

    // Developer Mode
    "9999": { role: "Developer", name: "Developer Mode" }
};

const LOCATIONS = ["Riverview"];

// All classes including pre-school classes and sectioned grades
const GRADES = [
    "Ilanthalir",
    "Mazhalai",
    "Nilai 1",
    "Nilai 2A", "Nilai 2B",
    "Nilai 3A", "Nilai 3B",
    "Nilai 4A", "Nilai 4B",
    "Nilai 5",
    "Nilai 6",
    "Nilai 7",
    "Nilai 8"
];

// Password for each class (teachers log in with these)
const CLASS_PASSWORDS = {
    "Ilanthalir": "2000",
    "Mazhalai":   "2000",
    "Nilai 1":    "2001",
    "Nilai 2A":   "2002",
    "Nilai 2B":   "2002",
    "Nilai 3A":   "2003",
    "Nilai 3B":   "2003",
    "Nilai 4A":   "2004",
    "Nilai 4B":   "2004",
    "Nilai 5":    "2005",
    "Nilai 6":    "2006",
    "Nilai 7":    "2007",
    "Nilai 8":    "2008"
};

// Room number mapping (populated from Teacher sheet in Excel)
const CLASS_ROOMS = {
    "Ilanthalir": "126",
    "Mazhalai":   "116",
    "Nilai 1":    "118",
    "Nilai 2A":   "122",
    "Nilai 2B":   "125",
    "Nilai 3A":   "124",
    "Nilai 3B":   "127",
    "Nilai 4A":   "129",
    "Nilai 4B":   "130",
    "Nilai 5":    "120",
    "Nilai 6":    "115",
    "Nilai 7":    "117",
    "Nilai 8":    "111"
};

// Default empty arrays — populated dynamically from Excel on load
const DEFAULT_TEACHERS = [];
const DEFAULT_STUDENTS = [];

const COMMITTEE_ROSTER = [
    { ID: "C01", Name: "Senthamil Arasan", Role: "President (Committee 1)" },
    { ID: "C02", Name: "Bharathi Raja", Role: "Committee Member 2" },
    { ID: "C03", Name: "Elango Mani", Role: "Committee Member 3" },
    { ID: "C04", Name: "Kavitha Sundar", Role: "Committee Member 4" },
    { ID: "C05", Name: "Muthu Pandian", Role: "Committee Member 5" },
    { ID: "C06", Name: "Nila Govindan", Role: "Committee Member 6" },
    { ID: "C07", Name: "Selvam Nambi", Role: "Committee Member 7" },
    { ID: "C08", Name: "Senthamil Thambi", Role: "Committee Member 8" }
];

// App State
let appState = {
    currentLocation: LOCATIONS[0],
    currentTab: "Students",
    currentFilter: "all",
    searchQuery: "",
    currentUserRole: null,

    teachers: [...DEFAULT_TEACHERS],
    students: [...DEFAULT_STUDENTS],

    attendance: {
        Teachers: {},
        Students: {}
    },

    lockedDates: [],
    attestations: {},
    logs: []
};

const TARGET_EMAIL = "manivask@gmail.com";

// DOM Elements
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("excel-file-input");
const fileInfoBar = document.getElementById("file-info-bar");
const loadedFileName = document.getElementById("loaded-file-name");
const attendanceTbody = document.getElementById("attendance-tbody");
const currentSheetTitle = document.getElementById("current-sheet-title");
const thInfo = document.getElementById("th-info");

// Stats
const badgeStudents = document.getElementById("badge-students");
const badgeTeachers = document.getElementById("badge-teachers");
const badgeCommittee = document.getElementById("badge-committee");
const statPresent = document.getElementById("stat-present");
const statAbsent = document.getElementById("stat-absent");
const statUnmarked = document.getElementById("stat-unmarked");

// Simulation
const enableSimCheckbox = document.getElementById("enable-sim");
const simDateInput = document.getElementById("sim-date");
const simTimeInput = document.getElementById("sim-time");
const estCurrentTimeSpan = document.getElementById("est-current-time");
const effectiveDateSpan = document.getElementById("effective-date");
const timeWindowStatusDiv = document.getElementById("time-window-status");
const statusTitleSpan = document.getElementById("status-title");
const statusTimeSpan = document.getElementById("status-time");

// Security Gate
const pinGateOverlay = document.getElementById("pin-gate-overlay");
const pinEntryInput = document.getElementById("pin-entry");
const pinErrorMsg = document.getElementById("pin-error-msg");
const activeUserRoleSpan = document.getElementById("active-user-role");

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
    const nowEst = getEstDateTime(new Date());
    simDateInput.value = nowEst.toISOString().split('T')[0];
    simTimeInput.value = String(nowEst.getHours()).padStart(2, '0') + ":" + String(nowEst.getMinutes()).padStart(2, '0');

    loadStateFromLocalStorage();
    loadDefaultWorkbook();
    checkAccessGate();
    setupDragAndDrop();

    setInterval(updateDateTimeAndRules, 1000);
    updateDateTimeAndRules();

    renderList();
});

// Access Gate Authorization Checking
function checkAccessGate() {
    const locSelect = document.getElementById("location-select");
    const tabsBar = document.querySelector(".location-and-tabs-bar .tabs");

    if (appState.currentUserRole) {
        pinGateOverlay.style.display = "none";
        document.getElementById("main-app-container").style.filter = "none";
        document.getElementById("main-app-container").style.pointerEvents = "auto";

        let roleStr = appState.currentUserRole.role;
        if (appState.currentUserRole.grade) {
            roleStr += ` - ${appState.currentUserRole.grade}`;
        }
        activeUserRoleSpan.textContent = appState.currentUserRole.name + ` (${roleStr})`;

        // Update active date bar visibility
        updateActiveDateBar();

        // Developer-only panels
        const isDeveloper = appState.currentUserRole.role === "Developer";
        const isAdmin = isAdminRole(appState.currentUserRole.role);
        document.getElementById("simulation-panel").style.display = isDeveloper ? "block" : "none";
        document.getElementById("file-operations-section").style.display = isDeveloper ? "block" : "none";

        // If teacher, lock down UI
        if (appState.currentUserRole.role === "Teacher") {
            appState.currentLocation = appState.currentUserRole.location;
            appState.currentTab = "Students";

            // Set and disable the Location Select dropdown
            if (locSelect) {
                locSelect.value = appState.currentLocation;
                locSelect.disabled = true;
            }

            // Show student and teacher tabs, hide committee
            if (tabsBar) {
                document.getElementById("tab-students").style.display = "inline-block";
                document.getElementById("tab-teachers").style.display = "inline-block";
                document.getElementById("tab-committee").style.display = "none";
                if (appState.currentTab === "Committee") {
                    switchTab("Students");
                }
            }

            // Auto initialize class students to Present if unmarked
            initializeDefaultAttendanceForClass();
        } else {
            // Admin: restore normal UI
            if (locSelect) {
                locSelect.disabled = false;
            }
            if (tabsBar) {
                document.getElementById("tab-students").style.display = "inline-block";
                document.getElementById("tab-teachers").style.display = "inline-block";
                document.getElementById("tab-committee").style.display = "inline-block";
            }
        }
    } else {
        pinGateOverlay.style.display = "flex";
        document.getElementById("main-app-container").style.filter = "blur(10px)";
        document.getElementById("main-app-container").style.pointerEvents = "none";
        activeUserRoleSpan.textContent = "Visitor";
        document.getElementById("active-date-bar").style.display = "none";
        document.getElementById("simulation-panel").style.display = "none";
        document.getElementById("file-operations-section").style.display = "none";

        // Reset overlay controls
        document.getElementById("gate-location").value = "";
        document.getElementById("gate-role-group").style.display = "none";
        document.getElementById("gate-admin-subroles").style.display = "none";
        document.getElementById("gate-teacher-classes").style.display = "none";
        document.getElementById("gate-password-group").style.display = "none";

        document.querySelectorAll('input[name="primary-role"]').forEach(r => r.checked = false);
        document.querySelectorAll('input[name="admin-subrole"]').forEach(r => r.checked = false);
        document.getElementById("gate-class-select").value = "";

        pinEntryInput.value = "";
        updateGateTips();
    }
}

// Helper: is role an admin role?
function isAdminRole(role) {
    return ["Principal", "Vice Principal", "Committee Member", "President", "Developer"].includes(role);
}

// Update active date bar in header
function updateActiveDateBar() {
    const bar = document.getElementById("active-date-bar");
    const display = document.getElementById("date-bar-display");
    const adminControls = document.getElementById("date-bar-admin-controls");
    const roleBadge = document.getElementById("date-bar-role-badge");
    const adminDatePicker = document.getElementById("admin-date-picker");

    if (!appState.currentUserRole) {
        bar.style.display = "none";
        return;
    }

    bar.style.display = "flex";
    const activeDate = getActiveDateString();
    display.textContent = formatDateForDisplay(activeDate);

    const role = appState.currentUserRole.role;
    const isAdmin = isAdminRole(role);

    roleBadge.textContent = role === "Teacher" ? `📚 ${appState.currentUserRole.grade || "Teacher"}` : `🔑 ${role}`;
    roleBadge.className = "date-bar-role-badge" + (role === "Teacher" ? " badge-teacher" : " badge-admin");

    if (isAdmin) {
        adminControls.style.display = "flex";
        adminDatePicker.value = activeDate;
    } else {
        adminControls.style.display = "none";
    }
}

function formatDateForDisplay(dateStr) {
    if (!dateStr) return "--";
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function handleAdminDateChange() {
    const picker = document.getElementById("admin-date-picker");
    const selectedDate = picker.value;
    if (!selectedDate) return;

    // Override the sim date to use the admin-picked date
    const simDateInput = document.getElementById("sim-date");
    const simTimeInput = document.getElementById("sim-time");
    const enableSim = document.getElementById("enable-sim");

    simDateInput.value = selectedDate;
    simTimeInput.value = "19:30"; // Friday evening
    enableSim.checked = true;

    updateActiveDateBar();
    updateDateTimeAndRules();
    renderList();
    logActivity(`Admin changed active attendance date to: ${selectedDate}`);
}

// Student Profile Modal
function openStudentModal(studentId) {
    const student = appState.students.find(s => s.ID === studentId);
    if (!student) return;

    const modal = document.getElementById("student-modal-overlay");
    const nameEl = document.getElementById("modal-student-name");
    const gradeEl = document.getElementById("modal-grade-badge");
    const avatarEl = document.getElementById("modal-avatar");
    const glowEl = document.getElementById("avatar-glow");
    const detailsEl = document.getElementById("modal-details");

    nameEl.textContent = student.Name;
    gradeEl.textContent = `${student.Grade} • Room ${CLASS_ROOMS[student.Grade] || "—"}`;

    // Gender-based avatar
    const gender = (student.Gender || "").toUpperCase();
    const isFemale = gender === "F" || gender === "GIRL" || gender === "FEMALE";
    if (isFemale) {
        avatarEl.textContent = "👧";
        glowEl.className = "avatar-glow glow-girl";
        document.getElementById("modal-avatar-section").className = "modal-avatar-section avatar-girl";
    } else {
        avatarEl.textContent = "🧒";
        glowEl.className = "avatar-glow glow-boy";
        document.getElementById("modal-avatar-section").className = "modal-avatar-section avatar-boy";
    }

    // Build details table
    const rows = [
        ["🪪 Student ID", student.ID],
        ["📝 Tamil Name", student["Tamil Name"] || "—"],
        ["📚 Grade", student.Grade],
        ["🏫 Room", CLASS_ROOMS[student.Grade] || "—"],
        ["📅 Date of Birth", student["Date of Birth"] || "—"],
        ["📧 Student Email", student["Student Email"] || "—"],
        ["👨 Father Name", student["Father Name"] || "—"],
        ["📞 Father Phone", student["Father Phone"] || "—"],
        ["📧 Father Email", student["Father Email"] || "—"],
        ["👩 Mother Name", student["Mother Name"] || "—"],
        ["📞 Mother Phone", student["Mother Phone"] || "—"],
        ["📧 Mother Email", student["Mother Email"] || "—"]
    ];

    detailsEl.innerHTML = rows.map(([label, val]) =>
        `<div class="modal-detail-row">
            <span class="detail-label">${label}</span>
            <span class="detail-value">${val}</span>
        </div>`
    ).join("");

    // Show modal with animation
    modal.style.display = "flex";
    requestAnimationFrame(() => {
        modal.classList.add("modal-visible");
    });
}

function closeStudentModal(event) {
    if (event && event.target !== document.getElementById("student-modal-overlay") && !event.target.classList.contains("modal-close-btn")) return;
    const modal = document.getElementById("student-modal-overlay");
    modal.classList.remove("modal-visible");
    setTimeout(() => { modal.style.display = "none"; }, 300);
}

// Function to auto-populate unmarked class students to Present
function initializeDefaultAttendanceForClass() {
    if (!appState.currentUserRole || appState.currentUserRole.role !== "Teacher") return;
    const activeDate = getActiveDateString();
    const loc = appState.currentUserRole.location;
    const grade = appState.currentUserRole.grade;

    if (!appState.attendance.Students[activeDate]) {
        appState.attendance.Students[activeDate] = {};
    }
    if (!appState.attendance.Teachers[activeDate]) {
        appState.attendance.Teachers[activeDate] = {};
    }

    let initializedAny = false;
    appState.students.forEach(s => {
        if (s.Location === loc && s.Grade === grade) {
            if (!appState.attendance.Students[activeDate][s.ID]) {
                appState.attendance.Students[activeDate][s.ID] = "present";
                initializedAny = true;
            }
        }
    });

    appState.teachers.forEach(t => {
        if (t.Location === loc && t["Class Assignment"] === grade) {
            if (!appState.attendance.Teachers[activeDate][t.ID]) {
                appState.attendance.Teachers[activeDate][t.ID] = "present";
                initializedAny = true;
            }
        }
    });

    if (initializedAny) {
        logActivity(`Initialized default status 'Present' for unmarked students & teachers of ${grade} at ${loc}`);
        saveStateToLocalStorage();
    }
}

function handlePinInput() {
    const loc = document.getElementById("gate-location").value;
    const roleType = document.querySelector('input[name="primary-role"]:checked')?.value;
    const val = pinEntryInput.value;

    if (!loc || !roleType) return;

    if (roleType === "Admin") {
        const subrole = document.querySelector('input[name="admin-subrole"]:checked')?.value;
        if (!subrole) return;

        if (val.length === 4) {
            if (AUTHORIZED_PINS[val]) {
                const auth = AUTHORIZED_PINS[val];

                // Validate sub-role match
                let roleMatch = false;
                if (subrole === "Committee") {
                    roleMatch = (auth.role === "Committee Member" || auth.role === "President");
                } else if (subrole === "Principal") {
                    roleMatch = (auth.role === "Principal");
                } else if (subrole === "Vice Principal") {
                    roleMatch = (auth.role === "Vice Principal");
                } else if (subrole === "Developer") {
                    roleMatch = (auth.role === "Developer");
                }

                if (!roleMatch) {
                    pinErrorMsg.textContent = `❌ Invalid PIN for ${subrole} role.`;
                    pinErrorMsg.style.display = "block";
                    pinEntryInput.value = "";
                    pinEntryInput.focus();
                    return;
                }

                // Validate Location Match for location-specific VPs and Principals
                if ((auth.role === "Principal" || auth.role === "Vice Principal") && auth.location !== loc) {
                    pinErrorMsg.textContent = `❌ PIN authorized only for ${auth.location}.`;
                    pinErrorMsg.style.display = "block";
                    pinEntryInput.value = "";
                    pinEntryInput.focus();
                    return;
                }

                // Successful Admin Login
                appState.currentUserRole = auth;
                appState.currentLocation = loc;
                pinErrorMsg.style.display = "none";
                pinEntryInput.value = "";

                logActivity(`Access Authorized: ${appState.currentUserRole.name} (${appState.currentUserRole.role}) logged in at ${loc}`);
                saveStateToLocalStorage();
                checkAccessGate();
                updateDateTimeAndRules();
                renderList();
            } else {
                pinErrorMsg.textContent = "❌ Invalid PIN. Access Denied.";
                pinErrorMsg.style.display = "block";
                pinEntryInput.value = "";
                pinEntryInput.focus();
            }
        }
    } else if (roleType === "Teachers") {
        const cls = document.getElementById("gate-class-select").value;
        if (!cls) return;

        // Check password match (e.g. LKG123)
        if (val === CLASS_PASSWORDS[cls]) {
            appState.currentUserRole = {
                role: "Teacher",
                name: `Teacher (${cls})`,
                location: loc,
                grade: cls
            };
            appState.currentLocation = loc;
            pinErrorMsg.style.display = "none";
            pinEntryInput.value = "";

            logActivity(`Access Authorized: Teacher logged in for ${cls} at ${loc}`);
            saveStateToLocalStorage();
            checkAccessGate();
            updateDateTimeAndRules();
            renderList();
        } else {
            // Don't show error immediately on typing, wait until length matches or Enter is typed
            if (val.length >= CLASS_PASSWORDS[cls].length) {
                pinErrorMsg.textContent = "❌ Invalid Password. Access Denied.";
                pinErrorMsg.style.display = "block";
                pinEntryInput.value = "";
                pinEntryInput.focus();
            }
        }
    }
}

function lockAppAccess() {
    if (appState.currentUserRole) {
        logActivity(`Access Revoked: ${appState.currentUserRole.name || appState.currentUserRole.role} logged out`);
    }
    appState.currentUserRole = null;
    saveStateToLocalStorage();
    checkAccessGate();
}

// Gate selection listeners
function handleGateSelectionChange() {
    const loc = document.getElementById("gate-location").value;
    const roleGroup = document.getElementById("gate-role-group");
    if (loc) {
        roleGroup.style.display = "block";
    } else {
        roleGroup.style.display = "none";
        document.getElementById("gate-admin-subroles").style.display = "none";
        document.getElementById("gate-teacher-classes").style.display = "none";
        document.getElementById("gate-password-group").style.display = "none";
        document.querySelectorAll('input[name="primary-role"]').forEach(r => r.checked = false);
        document.querySelectorAll('input[name="admin-subrole"]').forEach(r => r.checked = false);
        document.getElementById("gate-class-select").value = "";
        pinEntryInput.value = "";
    }
    updateGateTips();
}

function handleRoleTypeChange() {
    const roleType = document.querySelector('input[name="primary-role"]:checked')?.value;
    const adminGroup = document.getElementById("gate-admin-subroles");
    const teacherGroup = document.getElementById("gate-teacher-classes");
    const pwdGroup = document.getElementById("gate-password-group");

    document.querySelectorAll('input[name="admin-subrole"]').forEach(r => r.checked = false);
    document.getElementById("gate-class-select").value = "";
    pinEntryInput.value = "";
    pinErrorMsg.style.display = "none";

    if (roleType === "Admin") {
        adminGroup.style.display = "block";
        teacherGroup.style.display = "none";
        pwdGroup.style.display = "none";
        pinEntryInput.placeholder = "••••";
    } else if (roleType === "Teachers") {
        adminGroup.style.display = "none";
        teacherGroup.style.display = "block";
        pwdGroup.style.display = "none";
        pinEntryInput.placeholder = "Enter Class Password";
    } else {
        adminGroup.style.display = "none";
        teacherGroup.style.display = "none";
        pwdGroup.style.display = "none";
    }
    updateGateTips();
}

function handleSubroleChange() {
    const subrole = document.querySelector('input[name="admin-subrole"]:checked')?.value;
    const pwdGroup = document.getElementById("gate-password-group");
    const pwdLabel = document.getElementById("password-label");

    pinEntryInput.value = "";
    pinErrorMsg.style.display = "none";

    if (subrole) {
        pwdGroup.style.display = "block";
        pwdLabel.textContent = `🔑 Enter ${subrole} 4-Digit PIN:`;
        pinEntryInput.focus();
    } else {
        pwdGroup.style.display = "none";
    }
    updateGateTips();
}

function handleClassChangeForGate() {
    const cls = document.getElementById("gate-class-select").value;
    const pwdGroup = document.getElementById("gate-password-group");
    const pwdLabel = document.getElementById("password-label");

    pinEntryInput.value = "";
    pinErrorMsg.style.display = "none";

    if (cls) {
        pwdGroup.style.display = "block";
        pwdLabel.textContent = `🔑 Enter Password for ${cls}:`;
        pinEntryInput.focus();
    } else {
        pwdGroup.style.display = "none";
    }
    updateGateTips();
}

function updateGateTips() {
    const tipsDiv = document.getElementById("gate-tips");
    const roleType = document.querySelector('input[name="primary-role"]:checked')?.value;

    if (roleType === "Admin") {
        const subrole = document.querySelector('input[name="admin-subrole"]:checked')?.value;
        if (subrole === "Committee") {
            tipsDiv.innerHTML = "<p>💡 President PIN: <strong>9900</strong> | Committee PINs: <strong>1001-1007</strong></p>";
        } else if (subrole === "Principal") {
            tipsDiv.innerHTML = "<p>💡 Chennai: <strong>9001</strong> | Madurai: <strong>9002</strong> | Kovai: <strong>9003</strong> | Nellai: <strong>9004</strong></p>";
        } else if (subrole === "Vice Principal") {
            tipsDiv.innerHTML = "<p>💡 Riverview VP: <strong>9101–9104</strong></p>";
        } else if (subrole === "Developer") {
            tipsDiv.innerHTML = "<p>🛠️ Developer PIN: <strong>9999</strong></p>";
        } else {
            tipsDiv.innerHTML = "<p>💡 Select an Admin role above to see PIN tips.</p>";
        }
    } else if (roleType === "Teachers") {
        const cls = document.getElementById("gate-class-select").value;
        if (cls) {
            tipsDiv.innerHTML = `<p>💡 Teacher Password for <strong>${cls}</strong> is: <strong>${CLASS_PASSWORDS[cls]}</strong></p>`;
        } else {
            tipsDiv.innerHTML = "<p>💡 Select a class above to see the password tip.</p>";
        }
    } else {
        tipsDiv.innerHTML = "";
    }
}

// Audit Logging
function logActivity(message) {
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
    const logItem = `[${timestamp} EST] ${message}`;
    appState.logs.unshift(logItem);
    saveStateToLocalStorage();
    renderAuditLogs();
}

function renderAuditLogs() {
    const auditList = document.getElementById("audit-list");
    if (appState.logs.length === 0) {
        auditList.innerHTML = `<div class="audit-empty">No activity logs recorded yet. Changes made will appear here.</div>`;
        return;
    }
    auditList.innerHTML = appState.logs.map(log => `<div class="audit-item">${log}</div>`).join("");
}

function toggleAuditLogs() {
    const auditBody = document.getElementById("audit-body");
    const toggleIcon = document.getElementById("audit-toggle-icon");
    if (auditBody.style.display === "none") {
        auditBody.style.display = "block";
        toggleIcon.textContent = "▲";
    } else {
        auditBody.style.display = "none";
        toggleIcon.textContent = "▼";
    }
}

// Drag and drop setup
function setupDragAndDrop() {
    dropZone.addEventListener("click", () => fileInput.click());

    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        if (e.dataTransfer.files.length > 0) {
            handleExcelFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            handleExcelFile(e.target.files[0]);
        }
    });
}

// Get all Fridays between 14-Aug-2026 and 31-May-2027
function getFridaysInSchoolYear() {
    const fridays = [];
    let current = new Date("2026-08-14T00:00:00");
    const end = new Date("2027-05-31T23:59:59");
    while (current <= end) {
        if (current.getDay() === 5) {
            fridays.push(current.toISOString().split('T')[0]);
        }
        current.setDate(current.getDate() + 1);
    }
    return fridays;
}

// Convert UTC or local date to America/New_York Date object
function getEstDateTime(date) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false
    });

    const parts = formatter.formatToParts(date);
    const dateMap = {};
    parts.forEach(p => dateMap[p.type] = p.value);

    return new Date(
        dateMap.year,
        dateMap.month - 1,
        dateMap.day,
        dateMap.hour,
        dateMap.minute,
        dateMap.second
    );
}

// Check if current logged in user can bypass locks (is Principal or VP)
function canBypassLock() {
    if (!appState.currentUserRole) return false;
    const role = appState.currentUserRole.role;
    return role === "Principal" || role === "Vice Principal";
}

// Time and rules validation
function updateDateTimeAndRules() {
    let now;
    if (enableSimCheckbox.checked) {
        const simDateStr = simDateInput.value;
        const simTimeStr = simTimeInput.value;
        now = new Date(`${simDateStr}T${simTimeStr}:00`);
    } else {
        now = getEstDateTime(new Date());
    }

    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    estCurrentTimeSpan.textContent = now.toLocaleTimeString('en-US', timeOptions) + " EST";

    const dayOfWeek = now.getDay();
    let effectiveDate = new Date(now);

    if (dayOfWeek !== 5) {
        const daysToFriday = (5 - dayOfWeek + 7) % 7;
        effectiveDate.setDate(now.getDate() + daysToFriday);
    }

    const dateStr = effectiveDate.toISOString().split('T')[0];
    effectiveDateSpan.textContent = dateStr + " (Friday)";

    const isFriday = now.getDay() === 5;
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const timeVal = hour * 60 + minutes;

    const windowStart = 18 * 60; // 6:00 PM
    const windowEnd = 22 * 60;   // 10:00 PM

    const isWithinTimeWindow = isFriday && (timeVal >= windowStart && timeVal < windowEnd);
    const isDateLocked = appState.lockedDates.includes(dateStr);

    // Manage Attestation checks (Principals & VPs can toggle anytime)
    const attestVpCheck = document.getElementById("attest-vp");
    const attestPrincipalCheck = document.getElementById("attest-principal");

    const dateAttestation = appState.attestations[dateStr] || { vp: false, principal: false };
    attestVpCheck.checked = dateAttestation.vp;
    attestPrincipalCheck.checked = dateAttestation.principal;

    if (isDateLocked && !canBypassLock()) {
        attestVpCheck.disabled = true;
        attestPrincipalCheck.disabled = true;
    } else {
        attestVpCheck.disabled = false;
        attestPrincipalCheck.disabled = false;
    }

    timeWindowStatusDiv.className = "time-window-status";
    handleAttestationChange();

    if (isDateLocked) {
        timeWindowStatusDiv.classList.add("locked");
        statusTitleSpan.textContent = "Attendance Locked";
        if (canBypassLock()) {
            statusTimeSpan.textContent = "Principal Bypass Mode";
        } else {
            statusTimeSpan.textContent = `${dateStr} Submitted`;
        }
    } else if (isWithinTimeWindow) {
        timeWindowStatusDiv.classList.add("active");
        statusTitleSpan.textContent = "Window Active";
        const minutesLeft = windowEnd - timeVal;
        statusTimeSpan.textContent = `Closes in ${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m`;
    } else {
        timeWindowStatusDiv.classList.add("outside-hours");
        statusTitleSpan.textContent = "Session Closed";
        if (isFriday && timeVal >= windowEnd) {
            statusTimeSpan.textContent = "Closed for Today";
        } else {
            statusTimeSpan.textContent = "Opens Friday 6 PM EST";
        }
    }

    // Keep date bar in sync
    if (appState.currentUserRole) {
        updateActiveDateBar();
    }
}

// Checkbox change handler for attestations
function handleAttestationChange() {
    const activeDate = getActiveDateString();
    const isDateLocked = appState.lockedDates.includes(activeDate);
    const submitBtn = document.getElementById("btn-submit-attendance");

    const vpAttested = document.getElementById("attest-vp").checked;
    const principalAttested = document.getElementById("attest-principal").checked;

    const oldVp = appState.attestations[activeDate]?.vp || false;
    const oldPrin = appState.attestations[activeDate]?.principal || false;

    if (!appState.attestations[activeDate]) {
        appState.attestations[activeDate] = { vp: false, principal: false };
    }

    if (vpAttested !== oldVp) {
        logActivity(`${appState.currentUserRole?.name || "Someone"} changed VP Attestation to ${vpAttested ? "Checked" : "Unchecked"} for date ${activeDate}`);
    }
    if (principalAttested !== oldPrin) {
        logActivity(`${appState.currentUserRole?.name || "Someone"} changed Principal Attestation to ${principalAttested ? "Checked" : "Unchecked"} for date ${activeDate}`);
    }

    appState.attestations[activeDate].vp = vpAttested;
    appState.attestations[activeDate].principal = principalAttested;
    saveStateToLocalStorage();

    if (appState.currentUserRole && appState.currentUserRole.role === "Teacher") {
        submitBtn.disabled = isDateLocked;
        submitBtn.textContent = isDateLocked ? "🔒 Attendance Locked" : "✉️ Submit Class Attendance";
        return;
    }

    if (isDateLocked && !canBypassLock()) {
        submitBtn.disabled = true;
        submitBtn.textContent = "🔒 Attendance Submitted & Locked";
        return;
    }

    if (vpAttested && principalAttested) {
        submitBtn.disabled = false;
        if (isDateLocked) {
            submitBtn.textContent = "✉️ Re-Submit Attendance (Correction)";
        } else {
            submitBtn.textContent = "✉️ Submit with PIN Verification";
        }
    } else {
        submitBtn.disabled = true;
        submitBtn.textContent = "✍️ Awaiting Principal & VP Sign-Off";
    }
}

// Toggle simulation panel collapse
function toggleSimPanel() {
    const simBody = document.getElementById("sim-body");
    const toggleIcon = document.getElementById("sim-toggle-icon");
    if (simBody.style.display === "none") {
        simBody.style.display = "flex";
        toggleIcon.textContent = "▲";
    } else {
        simBody.style.display = "none";
        toggleIcon.textContent = "▼";
    }
}

// Quick Scenario helper
function setQuickScenario(dateStr, timeStr) {
    enableSimCheckbox.checked = true;
    simDateInput.value = dateStr;
    simTimeInput.value = timeStr;
    updateDateTimeAndRules();
    renderList();
}

let masterStudentList = null;

function loadMasterList() {
    return fetch("TBTA-2026- 27- Riverview High School-Students  list.xlsx")
        .then(response => {
            if (!response.ok) throw new Error("Master list not found");
            return response.arrayBuffer();
        })
        .then(ab => {
            const data = new Uint8Array(ab);
            masterStudentList = XLSX.read(data, { type: 'array', cellDates: true });
            console.log("Master list loaded successfully.");
        })
        .catch(err => {
            console.warn("Could not auto-load Master Excel sheet:", err);
        });
}

function enhanceStudentsWithMasterList() {
    if (!masterStudentList || !appState.students) return;

    masterStudentList.SheetNames.forEach(sheetName => {
        if (!sheetName.includes("Nilai") && !["Ilanthalir", "Mazhalai"].includes(sheetName)) return;
        
        const sheet = masterStudentList.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        if (rows.length === 0) return;

        const header = rows[0];
        let firstNameCol = -1, lastNameCol = -1;
        let tamilNameCol = -1, emailIdCol = -1;
        let fatherFirstCol = -1, fatherLastCol = -1, fatherPhoneCol = -1, fatherEmailCol = -1;
        let motherFirstCol = -1, motherLastCol = -1, motherPhoneCol = -1, motherEmailCol = -1;
        
        let phoneCount = 0;
        let emailCount = 0;

        header.forEach((h, idx) => {
            const hl = h ? String(h).toLowerCase().trim() : "";
            if (hl === "first name") firstNameCol = idx;
            else if (hl === "last name") lastNameCol = idx;
            else if (hl === "tamil names" || hl === "tamil nmaes") tamilNameCol = idx;
            else if (hl === "email id") emailIdCol = idx;
            else if (hl === "father first name" || hl === "father name") fatherFirstCol = idx;
            else if (hl === "father last name") fatherLastCol = idx;
            else if (hl === "mother first name" || hl === "mother name" || hl === "mother  name") motherFirstCol = idx;
            else if (hl === "mother last name") motherLastCol = idx;
            else if (hl === "phone#" || hl === "phone") {
                if (phoneCount === 0) fatherPhoneCol = idx;
                else if (phoneCount === 1) motherPhoneCol = idx;
                phoneCount++;
            }
            else if (hl === "email" || hl === "email.1") {
                if (emailCount === 0) fatherEmailCol = idx;
                else if (emailCount === 1) motherEmailCol = idx;
                emailCount++;
            }
        });

        for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.length === 0) continue;

            const firstVal = firstNameCol >= 0 && row[firstNameCol] ? String(row[firstNameCol]).trim() : "";
            const lastVal = lastNameCol >= 0 && row[lastNameCol] ? String(row[lastNameCol]).trim() : "";
            const fullName = `${firstVal} ${lastVal}`.trim().toLowerCase();
            
            if (!fullName) continue;

            const matches = appState.students.filter(s => s.Name.toLowerCase() === fullName);
            matches.forEach(student => {
                if (tamilNameCol >= 0 && row[tamilNameCol]) student["Tamil Name"] = String(row[tamilNameCol]).trim();
                if (emailIdCol >= 0 && row[emailIdCol]) student["Student Email"] = String(row[emailIdCol]).trim();
                
                let fFirst = fatherFirstCol >= 0 && row[fatherFirstCol] ? String(row[fatherFirstCol]).trim() : "";
                let fLast = fatherLastCol >= 0 && row[fatherLastCol] ? String(row[fatherLastCol]).trim() : "";
                if (fFirst || fLast) student["Father Name"] = `${fFirst} ${fLast}`.trim();
                
                if (fatherPhoneCol >= 0 && row[fatherPhoneCol]) student["Father Phone"] = String(row[fatherPhoneCol]).trim();
                if (fatherEmailCol >= 0 && row[fatherEmailCol]) student["Father Email"] = String(row[fatherEmailCol]).trim();
                
                let mFirst = motherFirstCol >= 0 && row[motherFirstCol] ? String(row[motherFirstCol]).trim() : "";
                let mLast = motherLastCol >= 0 && row[motherLastCol] ? String(row[motherLastCol]).trim() : "";
                if (mFirst || mLast) student["Mother Name"] = `${mFirst} ${mLast}`.trim();
                
                if (motherPhoneCol >= 0 && row[motherPhoneCol]) student["Mother Phone"] = String(row[motherPhoneCol]).trim();
                if (motherEmailCol >= 0 && row[motherEmailCol]) student["Mother Email"] = String(row[motherEmailCol]).trim();
            });
        }
    });
}

// Handle imported Excel File
function handleExcelFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            appState.workbook = workbook;

            buildRosterFromWorkbook(workbook);
            enhanceStudentsWithMasterList();
            parseAttendanceFromWorkbook(workbook);

            loadedFileName.textContent = file.name;
            fileInfoBar.style.display = "flex";
            dropZone.style.display = "none";

            logActivity(`Imported database spreadsheet: ${file.name}`);
            saveStateToLocalStorage();
            renderList();

            alert("Excel sheet loaded successfully!");
        } catch (err) {
            console.error(err);
            alert("Error loading spreadsheet. Make sure it matches our format.");
        }
    };
    reader.readAsArrayBuffer(file);
}

function loadDefaultWorkbook() {
    loadMasterList().then(() => {
        fetch("TBTA-2026-2027- RHS-Student_Attendance.xlsx")
            .then(response => {
                if (!response.ok) throw new Error("Local sheet not found");
                return response.arrayBuffer();
            })
            .then(ab => {
                const data = new Uint8Array(ab);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                appState.workbook = workbook;

                // Always rebuild from Excel so roster is always fresh
                buildRosterFromWorkbook(workbook);
                enhanceStudentsWithMasterList();
                parseAttendanceFromWorkbook(workbook);
                saveStateToLocalStorage();
                renderList();
            })
            .catch(err => {
                console.warn("Could not auto-load academic Excel sheet:", err);
            });
    });
}

// Build teachers and students arrays from Teacher sheet + class sheets
function buildRosterFromWorkbook(workbook) {
    // ---- 1. Build Teachers from "Teacher" sheet ----
    const teacherSheet = workbook.Sheets["Teacher"];
    const newTeachers = [];
    let tIdx = 1;
    if (teacherSheet) {
        const rows = XLSX.utils.sheet_to_json(teacherSheet, { header: 1 });
        for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row || !row[0]) continue;
            const name = String(row[0]).trim();
            const nilaiRaw = row[1] ? String(row[1]).trim() : "";
            const section = row[2] ? String(row[2]).trim() : "A";
            const roomNum = row[3] ? String(row[3]).replace('.0', '').trim() : "";

            if (!name || name === "Name") continue;

            let classAssign = nilaiRaw;
            const lcNilai = nilaiRaw.toLowerCase();
            if (lcNilai === "ilanthalir" || lcNilai.includes("ilanthalir")) {
                classAssign = "Ilanthalir";
            } else if (lcNilai === "mazhalai") {
                classAssign = "Mazhalai";
            } else if (lcNilai === "support") {
                classAssign = "Support";
            } else if (nilaiRaw.includes("Nilai")) {
                const gradeNum = nilaiRaw.replace("Nilai ", "").trim();
                if (["2","3","4"].includes(gradeNum)) {
                    classAssign = `Nilai ${gradeNum}${section}`;
                }
            }

            newTeachers.push({
                ID: `T${String(tIdx).padStart(3, '0')}`,
                Name: name,
                Location: "Riverview",
                "Class Assignment": classAssign,
                Section: section,
                Room: roomNum,
                Email: `${name.toLowerCase().replace(/\s+/g, '.')}@school.com`,
                Phone: `987-654-3${String(tIdx).padStart(3, '0')}`
            });
            tIdx++;
        }
    }
    appState.teachers = newTeachers;

    // ---- 2. Build Students from each class sheet ----
    const newStudents = [];
    let sIdx = 1;

    // Sheet name -> [gradeName, hasClassCol]
    const sheetMap = [
        ["illanthalir", "Ilanthalir", false],
        ["Mazhalai", "Mazhalai", false],
        ["Nilai-1", "Nilai 1", false],
        ["Nilai-2", "Nilai 2", true],   // has 2A/2B Class column
        ["Nilai-3", "Nilai 3", true],   // has 3A/3B Class column
        ["Nilai-4", "Nilai 4", true],   // has 4A/4B Class column
        ["Nilai-5", "Nilai 5", false],
        ["Nilai-6", "Nilai 6", false],
        ["Nilai-7", "Nilai 7", false],
        ["Nilai-8", "Nilai 8", false],
    ];

    const seenStudents = new Set();

    sheetMap.forEach(([sheetname, baseGrade, hasSections]) => {
        const sheet = workbook.Sheets[sheetname];
        if (!sheet) return;

        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        if (rows.length === 0) return;

        // Find relevant column indices from header
        const header = rows[0];
        let firstNameCol = -1, lastNameCol = -1, dobCol = -1, classCol = -1;
        
        let tamilNameCol = -1, emailIdCol = -1, nilaiCol = -1, sectionCol = -1;
        let fatherFirstCol = -1, fatherLastCol = -1, fatherPhoneCol = -1, fatherEmailCol = -1;
        let motherFirstCol = -1, motherLastCol = -1, motherPhoneCol = -1, motherEmailCol = -1;
        let phoneCount = 0;
        let emailCount = 0;

        header.forEach((h, idx) => {
            const hl = h ? String(h).toLowerCase().trim() : "";
            if (hl === "first name") firstNameCol = idx;
            else if (hl === "last name") lastNameCol = idx;
            else if (hl === "date of birth") dobCol = idx;
            else if (hl === "class") classCol = idx;
            else if (hl === "tamil names") tamilNameCol = idx;
            else if (hl === "email id") emailIdCol = idx;
            else if (hl === "nilai") nilaiCol = idx;
            else if (hl === "section") sectionCol = idx;
            else if (hl === "father first name") fatherFirstCol = idx;
            else if (hl === "father last name") fatherLastCol = idx;
            else if (hl === "mother first name") motherFirstCol = idx;
            else if (hl === "mother last name") motherLastCol = idx;
            else if (hl === "phone#" || hl === "phone") {
                if (phoneCount === 0) fatherPhoneCol = idx;
                else if (phoneCount === 1) motherPhoneCol = idx;
                phoneCount++;
            }
            else if (hl === "email") {
                if (emailCount === 0) fatherEmailCol = idx;
                else if (emailCount === 1) motherEmailCol = idx;
                emailCount++;
            }
        });

        let inStudentSection = true;

        for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.length === 0) continue;

            const firstVal = firstNameCol >= 0 && row[firstNameCol] ? String(row[firstNameCol]).trim() : "";
            if (!firstVal) continue;

            // Detect section breaks: "First Name" header row means teacher section
            if (firstVal.toLowerCase() === "first name") {
                inStudentSection = false;
                continue;
            }

            // Skip classroom markers
            if (firstVal.toLowerCase() === "class room #" || firstVal.toLowerCase().includes("class room")) {
                continue;
            }

            const lastVal = lastNameCol >= 0 && row[lastNameCol] ? String(row[lastNameCol]).trim() : "";
            const fullName = `${firstVal} ${lastVal}`.trim();

            // DOB-based student/teacher detection
            const dobVal = dobCol >= 0 ? row[dobCol] : null;
            let isTeacher = false;
            if (!inStudentSection) {
                isTeacher = true;
            } else if (dobVal) {
                const dobStr = String(dobVal).trim();
                // If DOB year >= 2025, it's likely a teacher entry (their date is class info)
                const yearMatch = dobStr.match(/(\d{4})/);
                if (yearMatch && parseInt(yearMatch[1]) >= 2025) {
                    isTeacher = true;
                }
            } else {
                // No DOB - likely a teacher (most students have DOB)
                // Unless it's a string date like "March 14th" (special cases in illanthalir)
                isTeacher = true;
            }

            if (isTeacher) continue;

            // Determine grade with section
            let grade = baseGrade;
            if (hasSections && classCol >= 0 && row[classCol]) {
                const classVal = String(row[classCol]).trim();
                if (classVal.match(/^\d[AB]$/)) {
                    grade = `Nilai ${classVal}`;
                }
            }

            const key = `${fullName}__${grade}`;
            if (seenStudents.has(key)) continue;
            seenStudents.add(key);

            newStudents.push({
                ID: `S${String(sIdx).padStart(3, '0')}`,
                Name: fullName,
                Location: "Riverview",
                Grade: grade,
                "Date of Birth": dobVal || "",
                Gender: (classCol >= 0 ? "" : ""),  // Will be set from Excel if available
                "Parent Name": "",
                "Parent Phone": "",
                "Parent Email": `parent${sIdx}@example.com`,
                "Tamil Name": tamilNameCol >= 0 && row[tamilNameCol] ? String(row[tamilNameCol]).trim() : "",
                "Student Email": emailIdCol >= 0 && row[emailIdCol] ? String(row[emailIdCol]).trim() : "",
                "Father Name": `${fatherFirstCol >= 0 && row[fatherFirstCol] ? String(row[fatherFirstCol]).trim() : ""} ${fatherLastCol >= 0 && row[fatherLastCol] ? String(row[fatherLastCol]).trim() : ""}`.trim(),
                "Father Phone": fatherPhoneCol >= 0 && row[fatherPhoneCol] ? String(row[fatherPhoneCol]).trim() : "",
                "Father Email": fatherEmailCol >= 0 && row[fatherEmailCol] ? String(row[fatherEmailCol]).trim() : "",
                "Mother Name": `${motherFirstCol >= 0 && row[motherFirstCol] ? String(row[motherFirstCol]).trim() : ""} ${motherLastCol >= 0 && row[motherLastCol] ? String(row[motherLastCol]).trim() : ""}`.trim(),
                "Mother Phone": motherPhoneCol >= 0 && row[motherPhoneCol] ? String(row[motherPhoneCol]).trim() : "",
                "Mother Email": motherEmailCol >= 0 && row[motherEmailCol] ? String(row[motherEmailCol]).trim() : ""
            });
            sIdx++;
        }
    });

    appState.students = newStudents;
    console.log(`Loaded ${appState.teachers.length} teachers and ${appState.students.length} students from Excel`);
}

function getCellDateStr(cell) {
    if (!cell || !cell.v) return "";
    if (cell.v instanceof Date) {
        return cell.v.toISOString().split('T')[0];
    }
    if (typeof cell.v === "number" && cell.t === "n") {
        const dateObj = XLSX.SSF.parse_date_code(cell.v);
        const y = dateObj.y;
        const m = String(dateObj.m).padStart(2, '0');
        const d = String(dateObj.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const s = String(cell.v).trim().split(" ")[0];
    return s.match(/^\d{4}-\d{2}-\d{2}$/) ? s : "";
}

function parseAttendanceFromWorkbook(workbook) {
    // Reset attendance
    appState.attendance = { Teachers: {}, Students: {} };

    const allSheets = ["illanthalir", "Mazhalai", "Nilai-1","Nilai-2","Nilai-3","Nilai-4","Nilai-5","Nilai-6","Nilai-7","Nilai-8"];

    allSheets.forEach(sheetname => {
        const sheet = workbook.Sheets[sheetname];
        if (!sheet) return;

        const range = XLSX.utils.decode_range(sheet['!ref']);

        // Find date columns in header row
        const dateCols = {}; // {colIdx: dateStr}
        for (let col = 0; col <= range.e.c; col++) {
            const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
            const ds = getCellDateStr(cell);
            if (ds) dateCols[col] = ds;
        }

        // Also check secondary header rows (teacher section headers)
        // We parse all rows, not just first section
        for (let r = 1; r <= range.e.r; r++) {
            const cellA = sheet[XLSX.utils.encode_cell({ r: r, c: 0 })];
            const cellB = sheet[XLSX.utils.encode_cell({ r: r, c: 1 })];
            if (!cellA || !cellA.v) continue;

            const firstName = String(cellA.v).trim();
            if (firstName.toLowerCase() === "first name" || firstName.toLowerCase().includes("class room")) {
                // Secondary header — update dateCols from this row
                for (let col = 0; col <= range.e.c; col++) {
                    const cell = sheet[XLSX.utils.encode_cell({ r: r, c: col })];
                    const ds = getCellDateStr(cell);
                    if (ds) dateCols[col] = ds;
                }
                continue;
            }

            const lastName = cellB && cellB.v ? String(cellB.v).trim() : "";
            const fullName = `${firstName} ${lastName}`.trim();

            // Find in students or teachers
            const student = appState.students.find(s => s.Name === fullName);
            const teacher = appState.teachers.find(t => t.Name === fullName);

            for (const [colIdxStr, dateStr] of Object.entries(dateCols)) {
                const colIdx = parseInt(colIdxStr);
                const cellRef = XLSX.utils.encode_cell({ r: r, c: colIdx });
                const cell = sheet[cellRef];
                if (cell && cell.v) {
                    const statusStr = String(cell.v).trim().toUpperCase();
                    const statusVal = statusStr === "P" ? "present" : statusStr === "A" ? "absent" : "";
                    if (statusVal) {
                        if (student) {
                            if (!appState.attendance.Students[dateStr]) appState.attendance.Students[dateStr] = {};
                            appState.attendance.Students[dateStr][student.ID] = statusVal;
                        } else if (teacher) {
                            if (!appState.attendance.Teachers[dateStr]) appState.attendance.Teachers[dateStr] = {};
                            appState.attendance.Teachers[dateStr][teacher.ID] = statusVal;
                        }
                    }
                }
            }
        }
    });
}

function updateWorkbookData() {
    if (!appState.workbook) return;
    const fridays = getFridaysInSchoolYear();

    const allSheets = ["illanthalir", "Mazhalai", "Nilai-1","Nilai-2","Nilai-3","Nilai-4","Nilai-5","Nilai-6","Nilai-7","Nilai-8"];

    allSheets.forEach(sheetname => {
        const sheet = appState.workbook.Sheets[sheetname];
        if (!sheet) return;

        const range = XLSX.utils.decode_range(sheet['!ref']);

        const dateCols = {};
        for (let col = 0; col <= range.e.c; col++) {
            const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
            const ds = getCellDateStr(cell);
            if (ds) dateCols[ds] = col;
        }

        for (let r = 1; r <= range.e.r; r++) {
            const cellA = sheet[XLSX.utils.encode_cell({ r: r, c: 0 })];
            const cellB = sheet[XLSX.utils.encode_cell({ r: r, c: 1 })];
            if (!cellA || !cellA.v) continue;

            const firstName = String(cellA.v).trim();
            if (firstName.toLowerCase() === "first name" || firstName.toLowerCase().includes("class room")) {
                // Secondary header — update dateCols from this row too
                for (let col = 0; col <= range.e.c; col++) {
                    const cell = sheet[XLSX.utils.encode_cell({ r: r, c: col })];
                    const ds = getCellDateStr(cell);
                    if (ds) dateCols[ds] = col;
                }
                continue;
            }

            const lastName = cellB && cellB.v ? String(cellB.v).trim() : "";
            const fullName = `${firstName} ${lastName}`.trim();

            const student = appState.students.find(s => s.Name === fullName);
            const teacher = appState.teachers.find(t => t.Name === fullName);

            if (student) {
                fridays.forEach(date => {
                    const status = appState.attendance.Students[date]?.[student.ID];
                    const colIdx = dateCols[date];
                    if (colIdx !== undefined) {
                        const cellRef = XLSX.utils.encode_cell({ r: r, c: colIdx });
                        sheet[cellRef] = { t: 's', v: status === "present" ? "P" : status === "absent" ? "A" : "" };
                    }
                });
            } else if (teacher) {
                fridays.forEach(date => {
                    const status = appState.attendance.Teachers[date]?.[teacher.ID];
                    const colIdx = dateCols[date];
                    if (colIdx !== undefined) {
                        const cellRef = XLSX.utils.encode_cell({ r: r, c: colIdx });
                        sheet[cellRef] = { t: 's', v: status === "present" ? "P" : status === "absent" ? "A" : "" };
                    }
                });
            }
        }
    });
}

function getActiveDateString() {
    let now;
    if (enableSimCheckbox.checked) {
        now = new Date(`${simDateInput.value}T${simTimeInput.value}:00`);
    } else {
        now = getEstDateTime(new Date());
    }

    const dayOfWeek = now.getDay();
    let effectiveDate = new Date(now);
    if (dayOfWeek !== 5) {
        const daysToFriday = (5 - dayOfWeek + 7) % 7;
        effectiveDate.setDate(now.getDate() + daysToFriday);
    }
    return effectiveDate.toISOString().split('T')[0];
}

// Set individual attendance status with Lock Bypass for Principals & VPs
function setAttendance(id, status) {
    const activeDate = getActiveDateString();
    const isLocked = appState.lockedDates.includes(activeDate);

    if (isLocked && !canBypassLock()) {
        alert("This record is locked and cannot be edited.");
        return;
    }

    const tab = appState.currentTab;
    const item = tab === "Students" ? appState.students.find(s => s.ID === id) : appState.teachers.find(t => t.ID === id);
    const oldStatus = appState.attendance[tab][activeDate]?.[id] || "Unmarked";

    if (!appState.attendance[tab][activeDate]) {
        appState.attendance[tab][activeDate] = {};
    }

    appState.attendance[tab][activeDate][id] = status;

    const displayStatus = status.charAt(0).toUpperCase() + status.slice(1);
    const displayOld = oldStatus.charAt(0).toUpperCase() + oldStatus.slice(1);

    if (isLocked && canBypassLock()) {
        logActivity(`🔒 LOCKED CORRECTION: ${appState.currentUserRole?.name} (${appState.currentUserRole?.role}) updated locked date ${activeDate} record of ${item.Name} (${id}) from ${displayOld} to ${displayStatus}`);
    } else {
        logActivity(`${appState.currentUserRole?.name} (${appState.currentUserRole?.role}) changed ${item.Name} (${id}) status from ${displayOld} to ${displayStatus} at ${appState.currentLocation}`);
    }

    saveStateToLocalStorage();
    renderList();
}

// Switch tabs
function switchTab(tabName) {
    appState.currentTab = tabName;

    document.getElementById("tab-students").classList.toggle("active", tabName === "Students");
    document.getElementById("tab-teachers").classList.toggle("active", tabName === "Teachers");
    document.getElementById("tab-committee").classList.toggle("active", tabName === "Committee");

    currentSheetTitle.textContent = tabName === "Students" ? "Students List" : tabName === "Teachers" ? "Teachers List" : "Committee Roster";
    thInfo.textContent = tabName === "Students" ? "Grade" : tabName === "Teachers" ? "Class Assignment" : "Role";

    const gridBar = document.getElementById("grid-controls-bar");
    const statusFiltersGroup = document.getElementById("status-filters-group");
    const selectionStatsGroup = document.getElementById("selection-stats-container");
    const thStatusCol = document.getElementById("th-status-col");

    if (tabName === "Committee") {
        gridBar.style.display = "none";
        selectionStatsGroup.style.display = "none";
        thStatusCol.textContent = "Status Check";
    } else {
        gridBar.style.display = "flex";
        statusFiltersGroup.style.display = "flex";
        selectionStatsGroup.style.display = "flex";
        thStatusCol.textContent = "Status";
    }

    renderList();
}

// Filter lists
function setFilter(filterType) {
    appState.currentFilter = filterType;
    document.querySelectorAll(".filters button").forEach(btn => {
        btn.classList.remove("active");
    });

    const targetIdx = filterType === 'all' ? 0 : filterType === 'present' ? 1 : filterType === 'absent' ? 2 : 3;
    document.querySelectorAll(".filters button")[targetIdx].classList.add("active");

    renderList();
}

function filterList() {
    appState.searchQuery = document.getElementById("search-input").value.toLowerCase();
    renderList();
}

function handleLocationChange() {
    appState.currentLocation = document.getElementById("location-select").value;
    renderList();
}

// Render list & stats
function renderList() {
    const tab = appState.currentTab;
    const activeDate = getActiveDateString();
    const isLocked = appState.lockedDates.includes(activeDate);

    // Populate assigned teachers info for teachers
    const teachersInfoDiv = document.getElementById("assigned-teachers-info");
    if (teachersInfoDiv) {
        if (appState.currentUserRole && appState.currentUserRole.role === "Teacher") {
            const grade = appState.currentUserRole.grade;
            const loc = appState.currentUserRole.location;
            const assigned = appState.teachers.filter(t => t.Location === loc && t["Class Assignment"] === grade);
            const teacherNames = assigned.map(t => t.Name).join(" & ");
            teachersInfoDiv.textContent = `Assigned Teachers: ${teacherNames || "None"}`;
            teachersInfoDiv.style.display = "block";
        } else {
            teachersInfoDiv.textContent = "";
            teachersInfoDiv.style.display = "none";
        }
    }

    let totalStudentsAtLoc = appState.students.filter(s => s.Location === appState.currentLocation).length;
    let totalTeachersAtLoc = appState.teachers.filter(t => t.Location === appState.currentLocation).length;
    if (appState.currentUserRole && appState.currentUserRole.role === "Teacher") {
        totalStudentsAtLoc = appState.students.filter(s => s.Location === appState.currentLocation && s.Grade === appState.currentUserRole.grade).length;
        totalTeachersAtLoc = appState.teachers.filter(t => t.Location === appState.currentLocation && t["Class Assignment"] === appState.currentUserRole.grade).length;
    }

    badgeStudents.textContent = totalStudentsAtLoc;
    badgeTeachers.textContent = totalTeachersAtLoc;
    badgeCommittee.textContent = COMMITTEE_ROSTER.length;

    if (tab === "Committee") {
        attendanceTbody.innerHTML = "";
        COMMITTEE_ROSTER.forEach(member => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${member.ID}</strong></td>
                <td>${member.Name}</td>
                <td>${member.Role}</td>
                <td class="center-align"><span class="locked-cell present">Registered</span></td>
            `;
            attendanceTbody.appendChild(tr);
        });
        document.getElementById("empty-state").style.display = "none";
        return;
    }

    const allItems = tab === "Students" ? appState.students : appState.teachers;
    let items = allItems.filter(item => item.Location === appState.currentLocation);
    if (appState.currentUserRole && appState.currentUserRole.role === "Teacher") {
        if (tab === "Students") {
            items = items.filter(item => item.Grade === appState.currentUserRole.grade);
        } else if (tab === "Teachers") {
            items = items.filter(item => item["Class Assignment"] === appState.currentUserRole.grade);
        }
    }

    let presentCount = 0;
    let absentCount = 0;
    let unmarkedCount = 0;

    items.forEach(item => {
        const status = appState.attendance[tab][activeDate]?.[item.ID];
        if (status === "present") presentCount++;
        else if (status === "absent") absentCount++;
        else unmarkedCount++;
    });

    statPresent.textContent = presentCount;
    statAbsent.textContent = absentCount;
    statUnmarked.textContent = unmarkedCount;

    attendanceTbody.innerHTML = "";
    let filteredCount = 0;

    items.forEach(item => {
        const status = appState.attendance[tab][activeDate]?.[item.ID];

        if (appState.currentFilter === "present" && status !== "present") return;
        if (appState.currentFilter === "absent" && status !== "absent") return;
        if (appState.currentFilter === "unmarked" && status) return;

        const matchName = item.Name.toLowerCase().includes(appState.searchQuery);
        const matchID = item.ID.toLowerCase().includes(appState.searchQuery);
        if (!matchName && !matchID) return;

        filteredCount++;
        const tr = document.createElement("tr");
        const infoVal = tab === "Students" ? item.Grade : item["Class Assignment"];

        let statusControlHtml = "";
        // Lock controls ONLY if date is locked AND logged in user is NOT Principal or VP
        if (isLocked && !canBypassLock()) {
            const displayStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unmarked";
            const statusClass = status ? status : "unmarked";
            statusControlHtml = `<span class="locked-cell ${statusClass}">${displayStatus}</span>`;
        } else {
            statusControlHtml = `
                <div class="status-selector">
                    <button class="status-opt present ${status === 'present' ? 'active' : ''}" onclick="setAttendance('${item.ID}', 'present')">P</button>
                    <button class="status-opt absent ${status === 'absent' ? 'active' : ''}" onclick="setAttendance('${item.ID}', 'absent')">A</button>
                </div>
            `;
        }

        let idHtml = `<strong>${item.ID}</strong>`;
        if (tab === "Students") {
            idHtml = `<strong style="cursor:pointer; color:var(--accent-color); text-decoration:underline;" onclick="openStudentModal('${item.ID}')">${item.ID}</strong>`;
        }

        tr.innerHTML = `
            <td>${idHtml}</td>
            <td>${item.Name}</td>
            <td>${infoVal}</td>
            <td class="center-align">${statusControlHtml}</td>
        `;
        attendanceTbody.appendChild(tr);
    });

    document.getElementById("empty-state").style.display = filteredCount === 0 ? "block" : "none";
}

// Generate blank template sheet with SheetJS
function generateSampleExcelTemplate() {
    const wb = XLSX.utils.book_new();
    const fridays = getFridaysInSchoolYear();

    const teachersData = DEFAULT_TEACHERS.map(t => {
        const row = { ID: t.ID, Name: t.Name, Location: t.Location, "Class Assignment": t["Class Assignment"], Email: t.Email, Phone: t.Phone };
        fridays.forEach(date => {
            row[date] = "";
        });
        return row;
    });

    const studentsData = DEFAULT_STUDENTS.map(s => {
        const row = { ID: s.ID, Name: s.Name, Location: s.Location, Grade: s.Grade, "Parent Email": s["Parent Email"] };
        fridays.forEach(date => {
            row[date] = "";
        });
        return row;
    });

    const wsTeachers = XLSX.utils.json_to_sheet(teachersData);
    const wsStudents = XLSX.utils.json_to_sheet(studentsData);
    const wsCommittee = XLSX.utils.json_to_sheet(COMMITTEE_ROSTER);

    XLSX.utils.book_append_sheet(wb, wsTeachers, "Teachers");
    XLSX.utils.book_append_sheet(wb, wsStudents, "Students");
    XLSX.utils.book_append_sheet(wb, wsCommittee, "Committee");

    XLSX.writeFile(wb, "tamil_school_template_v4.xlsx");
}

// Export excel with new date column + Audit Logs sheet added
function exportExcel() {
    const activeDate = getActiveDateString();

    if (appState.workbook) {
        updateWorkbookData();
        XLSX.writeFile(appState.workbook, `TBTA-2026-2027- RHS-Student_Attendance_${activeDate}.xlsx`);
        return;
    }

    const wb = XLSX.utils.book_new();
    const fridays = getFridaysInSchoolYear();

    // 1. Prepare teachers sheet
    const teachersData = appState.teachers.map(t => {
        const row = { ID: t.ID, Name: t.Name, Location: t.Location, "Class Assignment": t["Class Assignment"], Email: t.Email, Phone: t.Phone };
        fridays.forEach(date => {
            row[date] = appState.attendance.Teachers[date]?.[t.ID] || "";
        });
        return row;
    });

    // 2. Prepare students sheet
    const studentsData = appState.students.map(s => {
        const row = { ID: s.ID, Name: s.Name, Location: s.Location, Grade: s.Grade, "Parent Email": s["Parent Email"] };
        fridays.forEach(date => {
            row[date] = appState.attendance.Students[date]?.[s.ID] || "";
        });
        return row;
    });

    // 3. Prepare Audit Logs Sheet
    const logsData = appState.logs.map((logLine, index) => ({
        "Log Number": index + 1,
        "Activity Details": logLine
    }));

    const wsTeachers = XLSX.utils.json_to_sheet(teachersData);
    const wsStudents = XLSX.utils.json_to_sheet(studentsData);
    const wsLogs = XLSX.utils.json_to_sheet(logsData);
    const wsCommittee = XLSX.utils.json_to_sheet(COMMITTEE_ROSTER);

    XLSX.utils.book_append_sheet(wb, wsTeachers, "Teachers");
    XLSX.utils.book_append_sheet(wb, wsStudents, "Students");
    XLSX.utils.book_append_sheet(wb, wsLogs, "Audit Logs");
    XLSX.utils.book_append_sheet(wb, wsCommittee, "Committee");

    XLSX.writeFile(wb, `tamil_school_attendance_${activeDate}.xlsx`);
}

// Submit attendance
function submitAttendance() {
    const activeDate = getActiveDateString();

    if (appState.currentUserRole && appState.currentUserRole.role === "Teacher") {
        const cls = appState.currentUserRole.grade;
        const loc = appState.currentUserRole.location;
        const unmarkedClassStudents = appState.students.filter(s => s.Location === loc && s.Grade === cls && !appState.attendance.Students[activeDate]?.[s.ID]);
        const unmarkedClassTeachers = appState.teachers.filter(t => t.Location === loc && t["Class Assignment"] === cls && !appState.attendance.Teachers[activeDate]?.[t.ID]);

        if (unmarkedClassStudents.length > 0 || unmarkedClassTeachers.length > 0) {
            const confirmSubmit = confirm(`You have unmarked records (${unmarkedClassStudents.length} students, ${unmarkedClassTeachers.length} teachers). Do you want to submit anyway?`);
            if (!confirmSubmit) return;
        }

        logActivity(`Class attendance submitted for ${cls} at ${loc} by Teacher`);
        saveStateToLocalStorage();
        alert(`Class attendance for ${cls} at ${loc} has been submitted successfully! Please click Logout to log out.`);
        return;
    }

    const unmarkedTeachers = appState.teachers.filter(t => !appState.attendance.Teachers[activeDate]?.[t.ID]);
    const unmarkedStudents = appState.students.filter(s => !appState.attendance.Students[activeDate]?.[s.ID]);

    if (unmarkedTeachers.length > 0 || unmarkedStudents.length > 0) {
        const confirmSubmit = confirm(`Warning: You have unmarked records across locations (${unmarkedTeachers.length} teachers, ${unmarkedStudents.length} students). Do you want to submit anyway?`);
        if (!confirmSubmit) return;
    }

    const confirmPin = prompt("Enter your 4-digit authorization PIN to sign and submit today's attendance:");
    if (!confirmPin) {
        alert("Submission cancelled. PIN is required.");
        return;
    }

    if (!AUTHORIZED_PINS[confirmPin]) {
        alert("Invalid PIN. Submission aborted.");
        return;
    }

    const signingUser = AUTHORIZED_PINS[confirmPin];

    if (!appState.lockedDates.includes(activeDate)) {
        appState.lockedDates.push(activeDate);
    }

    logActivity(`Attendance submitted & locked for date ${activeDate} by ${signingUser.name} (${signingUser.role})`);
    saveStateToLocalStorage();

    // Prepare Email parameters
    let emailBody = `Tamil School Attendance Report - Friday ${activeDate}\n`;
    emailBody += `===========================================\n`;
    emailBody += `Submitted by: ${signingUser.name} (${signingUser.role})\n`;
    emailBody += `Status: Verified & Attested by VP & Principal\n`;
    emailBody += `===========================================\n\n`;

    LOCATIONS.forEach(loc => {
        const locTeachers = appState.teachers.filter(t => t.Location === loc);
        const locStudents = appState.students.filter(s => s.Location === loc);

        const pT = locTeachers.filter(t => appState.attendance.Teachers[activeDate]?.[t.ID] === "present");
        const aT = locTeachers.filter(t => appState.attendance.Teachers[activeDate]?.[t.ID] === "absent");
        const pS = locStudents.filter(s => appState.attendance.Students[activeDate]?.[s.ID] === "present");
        const aS = locStudents.filter(s => appState.attendance.Students[activeDate]?.[s.ID] === "absent");

        emailBody += `📍 LOCATION: ${loc}\n`;
        emailBody += `-------------------------------------------\n`;
        emailBody += `- Teachers: Present: ${pT.length}/${locTeachers.length} | Absent: ${aT.length}/${locTeachers.length}\n`;
        if (aT.length > 0) {
            emailBody += `  Absent Teachers: ${aT.map(t => t.Name).join(", ")}\n`;
        }
        emailBody += `- Students: Present: ${pS.length}/${locStudents.length} | Absent: ${aS.length}/${locStudents.length}\n`;
        if (aS.length > 0) {
            emailBody += `  Absent Students: ${aS.map(s => s.Name).join(", ")}\n`;
        }
        emailBody += `\n`;
    });

    emailBody += `===========================================\n`;
    emailBody += `Generated by Tamil School Attendance Portal.\n`;

    const subject = encodeURIComponent(`Tamil School Attendance & Auditing Report - Friday ${activeDate}`);
    const body = encodeURIComponent(emailBody);

    const mailtoUrl = `mailto:${TARGET_EMAIL}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;

    updateDateTimeAndRules();
    renderList();
    exportExcel();
}

// LocalStorage helpers
function saveStateToLocalStorage() {
    localStorage.setItem("attendance_tracker_state_v7", JSON.stringify({
        teachers: appState.teachers,
        students: appState.students,
        attendance: appState.attendance,
        lockedDates: appState.lockedDates,
        attestations: appState.attestations,
        currentUserRole: appState.currentUserRole,
        logs: appState.logs
    }));
}

function loadStateFromLocalStorage() {
    const saved = localStorage.getItem("attendance_tracker_state_v7");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed.teachers) appState.teachers = parsed.teachers;
            if (parsed.students) appState.students = parsed.students;
            if (parsed.attendance) appState.attendance = parsed.attendance;
            if (parsed.lockedDates) appState.lockedDates = parsed.lockedDates;
            if (parsed.attestations) appState.attestations = parsed.attestations;
            if (parsed.currentUserRole) appState.currentUserRole = parsed.currentUserRole;
            if (parsed.logs) appState.logs = parsed.logs;
        } catch (e) {
            console.error("Error loading LocalStorage state", e);
        }
    }
    renderAuditLogs();
}

function clearLoadedFile() {
    if (confirm("Are you sure you want to remove the loaded spreadsheet and revert to defaults? Any unsaved data will be lost.")) {
        localStorage.removeItem("attendance_tracker_state_v7");
        appState.teachers = [...DEFAULT_TEACHERS];
        appState.students = [...DEFAULT_STUDENTS];
        appState.attendance = { Teachers: {}, Students: {} };
        appState.lockedDates = [];
        appState.attestations = {};
        appState.currentUserRole = null;
        appState.logs = [];

        fileInfoBar.style.display = "none";
        dropZone.style.display = "flex";
        fileInput.value = "";

        checkAccessGate();
        renderList();
        renderAuditLogs();
    }
}

// Theme Toggle
function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("attendance_tracker_theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
    updateThemeButtonText();
}

function updateThemeButtonText() {
    const themeBtn = document.getElementById("theme-toggle-btn");
    if (!themeBtn) return;
    if (document.body.classList.contains("dark-mode")) {
        themeBtn.innerHTML = "☀️";
        themeBtn.title = "Switch to Light Mode";
    } else {
        themeBtn.innerHTML = "🌙";
        themeBtn.title = "Switch to Dark Mode";
    }
}

// Call on load once DOM is ready to set correct initial text
document.addEventListener("DOMContentLoaded", () => {
    updateThemeButtonText();
});

if (localStorage.getItem("attendance_tracker_theme") === "light") {
    document.body.classList.remove("dark-mode");
}
