/**
 * =========================================================================
 * TBTA Attendance Portal - Google Sheets & Google Drive Live Sync Webhook
 * Version: 2.0 (High-Concurrency Safe, Server-Side Deep Merge & Recovery)
 * =========================================================================
 * 
 * UPDATE INSTRUCTIONS FOR GOOGLE SHEETS:
 * 1. Open your Google Sheet -> Extensions > Apps Script.
 * 2. Select everything in Code.gs and replace it with this script.
 * 3. Click "Deploy" > "Manage deployments".
 * 4. Click the Pencil icon (Edit) on the active Web App deployment.
 * 5. Change "Version" to "New version".
 * 6. Click "Deploy".
 * =========================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = false;

  try {
    // 1. Concurrency Control: Wait up to 30s to prevent concurrent write collisions
    try {
      hasLock = lock.tryLock(30000);
    } catch (lockErr) {
      hasLock = false;
    }

    if (!hasLock) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        code: "LOCK_TIMEOUT",
        message: "Google Sheets is currently processing another teacher's submission. Retrying automatically..."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No data payload received"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);

    // Handle connection test ping
    if (payload.test) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Connected successfully to TBTA Google Sheets Webhook v2.0",
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 2. Read existing Cloud State to perform non-destructive server-side merge
    var existingState = readCurrentState(ss);

    // 3. Deep-merge incoming changes with existing state
    var mergedState = mergeStates(existingState, payload);

    // 4. Write merged state back into App_State_JSON
    writeState(ss, mergedState);

    // 5. Append changes to Attendance_Log Sheet for audit trail & disaster recovery
    appendAttendanceLog(ss, payload);

    // 6. Return the fully unified merged state back to caller
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Attendance merged and saved to Google Sheets successfully!",
      timestamp: new Date().toISOString(),
      state: mergedState
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (hasLock) {
      try {
        lock.releaseLock();
      } catch (relErr) {}
    }
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "read";
    var targetDate = (e && e.parameter && e.parameter.date) ? e.parameter.date : "";

    // Action: Rebuild / Recover missing state from Attendance_Log
    if (action === "recover_from_log" || action === "rebuild") {
      var lock = LockService.getScriptLock();
      var hasLock = false;
      try { hasLock = lock.tryLock(30000); } catch(err) {}

      try {
        var recoveryResult = recoverFromAttendanceLog(ss, targetDate);
        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          message: "Recovered " + recoveryResult.recovered + " attendance records from Attendance_Log sheet.",
          recoveredCount: recoveryResult.recovered,
          state: recoveryResult.state
        })).setMimeType(ContentService.MimeType.JSON);
      } finally {
        if (hasLock) {
          try { lock.releaseLock(); } catch(e){}
        }
      }
    }

    // Action: Get summary of Attendance_Log
    if (action === "log_summary") {
      var logSheet = ss.getSheetByName("Attendance_Log");
      var count = logSheet ? Math.max(0, logSheet.getLastRow() - 1) : 0;
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        totalLogRows: count,
        sheetExists: Boolean(logSheet)
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Default: Read current State JSON
    var state = readCurrentState(ss);
    var stateSheet = ss.getSheetByName("App_State_JSON");
    var lastUpdated = stateSheet ? stateSheet.getRange("B1").getValue() : null;

    if (!state) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "empty",
        state: null
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      state: state,
      lastUpdated: lastUpdated
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Reads and parses the full JSON state from App_State_JSON
 */
function readCurrentState(ss) {
  var stateSheet = ss.getSheetByName("App_State_JSON");
  if (!stateSheet || stateSheet.getLastRow() === 0) return null;

  var lastRow = stateSheet.getLastRow();
  var values = stateSheet.getRange(1, 1, lastRow, 1).getValues();
  var fullJson = values.map(function(r) { return r[0]; }).join("");
  if (!fullJson) return null;

  try {
    return JSON.parse(fullJson);
  } catch (e) {
    return null;
  }
}

/**
 * Saves JSON state to App_State_JSON in 35k chunks (Google 50k cell limit safe)
 */
function writeState(ss, payload) {
  var stateSheet = ss.getSheetByName("App_State_JSON") || ss.insertSheet("App_State_JSON");
  stateSheet.clear();

  var jsonStr = JSON.stringify(payload);
  var chunkSize = 35000;
  var chunks = [];
  for (var i = 0; i < jsonStr.length; i += chunkSize) {
    chunks.push([jsonStr.substring(i, i + chunkSize)]);
  }

  if (chunks.length > 0) {
    stateSheet.getRange(1, 1, chunks.length, 1).setValues(chunks);
  }
  stateSheet.getRange("B1").setValue(new Date().toISOString());
  stateSheet.getRange("B2").setValue(payload.updatedBy || "Teacher");
}

/**
 * True server-side non-destructive deep merge.
 * Never wipes out records when different teachers or admin submit concurrently.
 */
function mergeStates(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;

  var merged = JSON.parse(JSON.stringify(existing));

  // 1. Basic Metadata
  if (incoming.activeDate) merged.activeDate = incoming.activeDate;
  merged.updatedAt = new Date().toISOString();
  if (incoming.updatedBy) merged.updatedBy = incoming.updatedBy;

  // 2. Attendance Deep Merge (Students & Teachers)
  if (!merged.attendance) merged.attendance = { Students: {}, Teachers: {} };
  if (!merged.attendance.Students) merged.attendance.Students = {};
  if (!merged.attendance.Teachers) merged.attendance.Teachers = {};

  if (incoming.attendance) {
    if (incoming.attendance.Students) {
      for (var dt in incoming.attendance.Students) {
        if (!merged.attendance.Students[dt]) merged.attendance.Students[dt] = {};
        var inMap = incoming.attendance.Students[dt];
        for (var sid in inMap) {
          if (inMap[sid] !== undefined && inMap[sid] !== null && inMap[sid] !== "") {
            merged.attendance.Students[dt][sid] = inMap[sid];
          }
        }
      }
    }

    if (incoming.attendance.Teachers) {
      for (var dt in incoming.attendance.Teachers) {
        if (!merged.attendance.Teachers[dt]) merged.attendance.Teachers[dt] = {};
        var inMap = incoming.attendance.Teachers[dt];
        for (var tid in inMap) {
          if (inMap[tid] !== undefined && inMap[tid] !== null && inMap[tid] !== "") {
            merged.attendance.Teachers[dt][tid] = inMap[tid];
          }
        }
      }
    }
  }

  // 3. Homework & Tests Deep Merge
  if (incoming.homework) {
    if (!merged.homework) merged.homework = {};
    for (var dt in incoming.homework) {
      if (!merged.homework[dt]) merged.homework[dt] = {};
      for (var sid in incoming.homework[dt]) {
        merged.homework[dt][sid] = incoming.homework[dt][sid];
      }
    }
  }

  if (incoming.tests) {
    if (!merged.tests) merged.tests = {};
    for (var dt in incoming.tests) {
      if (!merged.tests[dt]) merged.tests[dt] = {};
      for (var sid in incoming.tests[dt]) {
        merged.tests[dt][sid] = incoming.tests[dt][sid];
      }
    }
  }

  // 4. Submitted Classes Flags
  if (incoming.submittedClasses) {
    if (!merged.submittedClasses) merged.submittedClasses = {};
    for (var dt in incoming.submittedClasses) {
      if (!merged.submittedClasses[dt]) merged.submittedClasses[dt] = {};
      for (var cls in incoming.submittedClasses[dt]) {
        merged.submittedClasses[dt][cls] = incoming.submittedClasses[dt][cls];
      }
    }
  }

  // 5. Teacher Cutoff Time
  if (incoming.teacherCutoffTime) {
    merged.teacherCutoffTime = incoming.teacherCutoffTime;
  }

  // 6. Locked Dates & Attestations
  if (incoming.lockedDates && Array.isArray(incoming.lockedDates)) {
    var lockedSet = {};
    (merged.lockedDates || []).forEach(function(d) { lockedSet[d] = true; });
    incoming.lockedDates.forEach(function(d) { lockedSet[d] = true; });
    merged.lockedDates = Object.keys(lockedSet);
  }

  if (incoming.attestations) {
    merged.attestations = Object.assign(merged.attestations || {}, incoming.attestations);
  }

  // 7. CLASS_ROOMS Dictionary Mapping
  if (incoming.classRooms) {
    if (!merged.classRooms) merged.classRooms = {};
    for (var cls in incoming.classRooms) {
      if (incoming.classRooms[cls]) merged.classRooms[cls] = incoming.classRooms[cls];
    }
  }

  // 8. Teachers Roster (Update Room, Class Assignment, etc. without deleting)
  if (incoming.teachers && Array.isArray(incoming.teachers) && incoming.teachers.length > 0) {
    if (!merged.teachers || !Array.isArray(merged.teachers) || merged.teachers.length === 0) {
      merged.teachers = incoming.teachers;
    } else {
      var tMap = {};
      merged.teachers.forEach(function(t, idx) { tMap[t.ID] = idx; });
      incoming.teachers.forEach(function(inT) {
        if (tMap[inT.ID] !== undefined) {
          var idx = tMap[inT.ID];
          merged.teachers[idx] = Object.assign({}, merged.teachers[idx], inT);
        } else {
          merged.teachers.push(inT);
        }
      });
    }
  }

  // 9. Students Roster
  if (incoming.students && Array.isArray(incoming.students) && incoming.students.length > 0) {
    if (!merged.students || !Array.isArray(merged.students) || merged.students.length === 0) {
      merged.students = incoming.students;
    } else {
      var sMap = {};
      merged.students.forEach(function(s, idx) { sMap[s.ID] = idx; });
      incoming.students.forEach(function(inS) {
        if (sMap[inS.ID] !== undefined) {
          var idx = sMap[inS.ID];
          merged.students[idx] = Object.assign({}, merged.students[idx], inS);
        } else {
          merged.students.push(inS);
        }
      });
    }
  }

  return merged;
}

/**
 * Appends attendance to Attendance_Log for audit trail
 */
function appendAttendanceLog(ss, payload) {
  try {
    var logSheet = ss.getSheetByName("Attendance_Log");
    if (!logSheet) {
      logSheet = ss.insertSheet("Attendance_Log");
      logSheet.appendRow(["Timestamp", "Date", "Class", "Type", "ID", "Name", "Status"]);
      logSheet.getRange("A1:G1").setFontWeight("bold").setBackground("#1E293B").setFontColor("#FFFFFF");
    }

    var activeDate = payload.activeDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    var att = payload.attendance || {};
    var studentsAtt = (att.Students && att.Students[activeDate]) || {};
    var teachersAtt = (att.Teachers && att.Teachers[activeDate]) || {};

    var students = payload.students || [];
    var teachers = payload.teachers || [];
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

    var rows = [];
    students.forEach(function(s) {
      if (studentsAtt[s.ID]) {
        rows.push([nowStr, activeDate, s.Grade || "", "Student", s.ID, s.Name || "", studentsAtt[s.ID]]);
      }
    });

    teachers.forEach(function(t) {
      if (teachersAtt[t.ID]) {
        rows.push([nowStr, activeDate, t["Class Assignment"] || "", "Teacher", t.ID, t.Name || "", teachersAtt[t.ID]]);
      }
    });

    if (rows.length > 0) {
      logSheet.getRange(logSheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
    }
  } catch (e) {
    // Audit logging error should not block attendance saving
  }
}

/**
 * Disaster Recovery: Scans Attendance_Log sheet and rebuilds state
 */
function recoverFromAttendanceLog(ss, targetDate) {
  var logSheet = ss.getSheetByName("Attendance_Log");
  if (!logSheet || logSheet.getLastRow() <= 1) {
    return { recovered: 0, state: readCurrentState(ss) };
  }

  var lastRow = logSheet.getLastRow();
  // Columns: Timestamp (A), Date (B), Class (C), Type (D), ID (E), Name (F), Status (G)
  var data = logSheet.getRange(2, 1, lastRow - 1, 7).getValues();

  var state = readCurrentState(ss) || { attendance: { Students: {}, Teachers: {} } };
  if (!state.attendance) state.attendance = { Students: {}, Teachers: {} };
  if (!state.attendance.Students) state.attendance.Students = {};
  if (!state.attendance.Teachers) state.attendance.Teachers = {};

  var recoveredCount = 0;
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var dt = "";
    if (row[1] instanceof Date) {
      dt = Utilities.formatDate(row[1], Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else if (row[1]) {
      dt = String(row[1]).trim().slice(0, 10);
    }

    if (targetDate && dt !== targetDate) continue;

    var type = String(row[3] || "").trim().toLowerCase();
    var id = String(row[4] || "").trim();
    var status = String(row[6] || "").toLowerCase().trim();

    if (!dt || !id || !status) continue;

    if (type === "student") {
      if (!state.attendance.Students[dt]) state.attendance.Students[dt] = {};
      state.attendance.Students[dt][id] = status;
      recoveredCount++;
    } else if (type === "teacher") {
      if (!state.attendance.Teachers[dt]) state.attendance.Teachers[dt] = {};
      state.attendance.Teachers[dt][id] = status;
      recoveredCount++;
    }
  }

  writeState(ss, state);
  return { recovered: recoveredCount, state: state };
}
