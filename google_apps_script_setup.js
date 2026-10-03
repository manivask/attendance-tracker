/**
 * =========================================================================
 * TBTA Attendance Portal - Google Sheets & Google Drive Live Sync Webhook
 * =========================================================================
 * 
 * HOW TO SET UP (Takes 1 Minute - 100% Free - No tokens required for teachers!):
 * 
 * 1. Open Google Sheets (https://sheets.new) or your existing Google Sheet.
 * 2. Rename the spreadsheet to: "TBTA Student Attendance 2026-2027".
 * 3. Click menu: Extensions > Apps Script.
 * 4. Delete any code in Code.gs and paste ALL the code below.
 * 5. Click "Deploy" (top right) > "New deployment".
 * 6. Click the gear icon (⚙️) next to "Select type" > choose "Web app".
 * 7. Set:
 *    - Description: TBTA Attendance Webhook
 *    - Execute as: "Me" (your Google account)
 *    - Who has access: "Anyone" (allows school portal to save without logins)
 * 8. Click "Deploy" > Click "Authorize access" > Select your Google account > Allow.
 * 9. Copy the "Web app URL" (starts with https://script.google.com/macros/s/.../exec).
 * 10. Paste this URL into the Attendance Portal (Cloud Sync Modal > Google Drive Webhook URL) 
 *     or in sync-config.js!
 * =========================================================================
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No data received" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Save full JSON backup sheet
    var stateSheet = ss.getSheetByName("App_State_JSON") || ss.insertSheet("App_State_JSON");
    stateSheet.getRange("A1").setValue(JSON.stringify(payload));
    stateSheet.getRange("A2").setValue(new Date().toISOString());
    stateSheet.getRange("A3").setValue(payload.updatedBy || "Teacher");

    // Also populate friendly attendance log sheet
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
    if (!stateSheet) {
      return ContentService.createTextOutput(JSON.stringify({ status: "empty", state: null })).setMimeType(ContentService.MimeType.JSON);
    }
    var raw = stateSheet.getRange("A1").getValue();
    var parsed = raw ? JSON.parse(raw) : null;
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      state: parsed,
      lastUpdated: stateSheet.getRange("A2").getValue()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
