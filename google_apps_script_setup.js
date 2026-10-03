/**
 * =========================================================================
 * TBTA Attendance Portal - Google Sheets & Google Drive Live Sync Webhook
 * =========================================================================
 * 
 * Update instructions for Google Sheets:
 * 1. Open your Google Sheet -> Extensions > Apps Script.
 * 2. Replace Code.gs with the script below.
 * 3. Click "Deploy" > "Manage deployments" > Edit (pencil icon) > Version: "New version" > Click "Deploy".
 * =========================================================================
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No data received" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Save JSON State in chunks to avoid Google 50k character cell limit
    var stateSheet = ss.getSheetByName("App_State_JSON") || ss.insertSheet("App_State_JSON");
    stateSheet.clear();
    
    var jsonStr = JSON.stringify(payload);
    var chunkSize = 35000;
    var chunks = [];
    for (var i = 0; i < jsonStr.length; i += chunkSize) {
      chunks.push([jsonStr.substring(i, i + chunkSize)]);
    }
    
    stateSheet.getRange(1, 1, chunks.length, 1).setValues(chunks);
    stateSheet.getRange("B1").setValue(new Date().toISOString());
    stateSheet.getRange("B2").setValue(payload.updatedBy || "Teacher");

    // 2. Append Attendance to Attendance_Log Sheet
    var logSheet = ss.getSheetByName("Attendance_Log");
    if (!logSheet) {
      logSheet = ss.insertSheet("Attendance_Log");
      logSheet.appendRow(["Timestamp", "Date", "Class", "Type", "ID", "Name", "Status"]);
      logSheet.getRange("A1:G1").setFontWeight("bold").setBackground("#1E293B").setFontColor("#FFFFFF");
    }

    var activeDate = payload.activeDate || new Date().toISOString().slice(0, 10);
    var att = payload.attendance || {};
    var studentsAtt = (att.Students && att.Students[activeDate]) || {};
    var teachersAtt = (att.Teachers && att.Teachers[activeDate]) || {};

    var students = payload.students || [];
    var teachers = payload.teachers || [];
    var nowStr = new Date().toLocaleString();

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

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Attendance saved to Google Drive & Sheets successfully!",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var stateSheet = ss.getSheetByName("App_State_JSON");
    if (!stateSheet || stateSheet.getLastRow() === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: "empty", state: null })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var lastRow = stateSheet.getLastRow();
    var values = stateSheet.getRange(1, 1, lastRow, 1).getValues();
    var fullJson = values.map(function(r) { return r[0]; }).join("");
    var parsed = fullJson ? JSON.parse(fullJson) : null;
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      state: parsed,
      lastUpdated: stateSheet.getRange("B1").getValue()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
