/**
* WV WIC Farmer Authorization Portal
* Google Apps Script backend
*
* SETUP
* 1. Create a Google Sheet.
* 2. Open Extensions &gt; Apps Script.
* 3. Paste this file into Code.gs.
* 4. Change SHEET_NAME if desired.
* 5. Deploy &gt; New deployment &gt; Web app.
* 6. Execute as: Me.
* 7. Who has access: choose the setting approved by your organization.
* 8. Copy the Web App URL into CONFIG.submissionEndpoint in script.js.
*/
const SHEET_NAME = &quot;Applications&quot;;
function doPost(e) {
try {
const payload = JSON.parse(e.postData.contents || &quot;{}&quot;);
validatePayload_(payload);
const sheet = getOrCreateSheet_();
const row = flattenPayload_(payload);
ensureHeaders_(sheet, Object.keys(row));
appendObject_(sheet, row);

return jsonResponse_({
status: &quot;success&quot;,
applicationId: payload.applicationId
});
} catch (error) {
console.error(error);
return jsonResponse_({
status: &quot;error&quot;,
message: error.message || &quot;Unknown error&quot;
});
}
}
function doGet() {
return jsonResponse_({
status: &quot;ok&quot;,
service: &quot;WV WIC Farmer Authorization Portal&quot;
});
}
function validatePayload_(payload) {
const required = [
payload.applicationId,
payload.role,
payload.applicant &amp;&amp; payload.applicant.managerName,
payload.applicant &amp;&amp; payload.applicant.farmName,
payload.applicant &amp;&amp; payload.applicant.email,
payload.training &amp;&amp; payload.training.connectivity,
payload.signature &amp;&amp; payload.signature.name,
payload.signature &amp;&amp; payload.signature.date
];
if (required.some(value =&gt; !value)) {
throw new Error(&quot;Required application information is missing.&quot;);
}
if (!Array.isArray(payload.locations) || payload.locations.length === 0) {
throw new Error(&quot;At least one selling location is required.&quot;);
}
if (!payload.certifications ||
!payload.certifications.agreementAccepted ||
!payload.certifications.civilRightsAccepted ||
!payload.certifications.truthCertification) {
throw new Error(&quot;All certifications must be accepted.&quot;);
}
}
function getOrCreateSheet_() {
const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
return spreadsheet.getSheetByName(SHEET_NAME) ||
spreadsheet.insertSheet(SHEET_NAME);
}
function flattenPayload_(payload) {
return {
&quot;Application ID&quot;: payload.applicationId,
&quot;Submitted At&quot;: payload.submittedAt,
&quot;Application Version&quot;: payload.applicationVersion,
&quot;Role&quot;: payload.role,
&quot;Manager Name&quot;: payload.applicant.managerName,

&quot;Farm or Market Name&quot;: payload.applicant.farmName,
&quot;Mailing Address&quot;: payload.applicant.mailingAddress,
&quot;City&quot;: payload.applicant.city,
&quot;State&quot;: payload.applicant.state,
&quot;ZIP&quot;: payload.applicant.zip,
&quot;Telephone&quot;: payload.applicant.telephone,
&quot;Email&quot;: payload.applicant.email,
&quot;Selling Locations JSON&quot;: JSON.stringify(payload.locations),
&quot;Training Date&quot;: payload.training.date,
&quot;Trainer Name&quot;: payload.training.trainerName,
&quot;Training Type&quot;: payload.training.type,
&quot;Connectivity&quot;: payload.training.connectivity,
&quot;Agreement Accepted&quot;: payload.certifications.agreementAccepted,
&quot;Civil Rights Accepted&quot;: payload.certifications.civilRightsAccepted,
&quot;Truth Certification&quot;: payload.certifications.truthCertification,
&quot;Electronic Signature&quot;: payload.signature.name,
&quot;Signature Date&quot;: payload.signature.date,
&quot;Review Status&quot;: &quot;New&quot;,
&quot;Reviewer Notes&quot;: &quot;&quot;
};
}
function ensureHeaders_(sheet, headers) {
if (sheet.getLastRow() === 0) {
sheet.appendRow(headers);
sheet.getRange(1, 1, 1, headers.length).setFontWeight(&quot;bold&quot;);
sheet.setFrozenRows(1);
}
}
function appendObject_(sheet, rowObject) {
const headers = sheet
.getRange(1, 1, 1, sheet.getLastColumn())
.getValues()[0];
const row = headers.map(header =&gt; rowObject[header] ?? &quot;&quot;);
sheet.appendRow(row);
}
function jsonResponse_(data) {
return ContentService
.createTextOutput(JSON.stringify(data))
.setMimeType(ContentService.MimeType.JSON);
}
