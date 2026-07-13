// -----------------------------
// WV WIC Farmer Portal
// -----------------------------
const CONFIG = {
// Paste your deployed Google Apps Script Web App URL here.
// Example: https://script.google.com/macros/s/XXXX/exec
submissionEndpoint: &quot;&quot;,
storageKey: &quot;wvWicFarmerApplicationDraftV1&quot;,
totalSteps: 7
};
const WV_COUNTIES = [
&quot;Barbour&quot;,&quot;Berkeley&quot;,&quot;Boone&quot;,&quot;Braxton&quot;,&quot;Brooke&quot;,&quot;Cabell&quot;,&quot;Calhoun&quot;,&quot;Clay&quot;,
&quot;Doddridge&quot;,&quot;Fayette&quot;,&quot;Gilmer&quot;,&quot;Grant&quot;,&quot;Greenbrier&quot;,&quot;Hampshire&quot;,&quot;Hancock&quot;,
&quot;Hardy&quot;,&quot;Harrison&quot;,&quot;Jackson&quot;,&quot;Jefferson&quot;,&quot;Kanawha&quot;,&quot;Lewis&quot;,&quot;Lincoln&quot;,&quot;Logan&quot;,
&quot;Marion&quot;,&quot;Marshall&quot;,&quot;Mason&quot;,&quot;McDowell&quot;,&quot;Mercer&quot;,&quot;Mineral&quot;,&quot;Mingo&quot;,&quot;Monongalia&quot;,
&quot;Monroe&quot;,&quot;Morgan&quot;,&quot;Nicholas&quot;,&quot;Ohio&quot;,&quot;Pendleton&quot;,&quot;Pleasants&quot;,&quot;Pocahontas&quot;,
&quot;Preston&quot;,&quot;Putnam&quot;,&quot;Raleigh&quot;,&quot;Randolph&quot;,&quot;Ritchie&quot;,&quot;Roane&quot;,&quot;Summers&quot;,&quot;Taylor&quot;,
&quot;Tucker&quot;,&quot;Tyler&quot;,&quot;Upshur&quot;,&quot;Wayne&quot;,&quot;Webster&quot;,&quot;Wetzel&quot;,&quot;Wirt&quot;,&quot;Wood&quot;,&quot;Wyoming&quot;
];
const form = document.getElementById(&quot;applicationForm&quot;);
const steps = [...document.querySelectorAll(&quot;.form-step&quot;)];
const backBtn = document.getElementById(&quot;backBtn&quot;);
const nextBtn = document.getElementById(&quot;nextBtn&quot;);
const submitBtn = document.getElementById(&quot;submitBtn&quot;);
const stepLabel = document.getElementById(&quot;stepLabel&quot;);
const progressPercent = document.getElementById(&quot;progressPercent&quot;);
const progressBar = document.getElementById(&quot;progressBar&quot;);
const statusMessage = document.getElementById(&quot;statusMessage&quot;);
const locationsContainer = document.getElementById(&quot;locationsContainer&quot;);
const addLocationBtn = document.getElementById(&quot;addLocationBtn&quot;);
const connectivityWarning = document.getElementById(&quot;connectivityWarning&quot;);
const reviewPanel = document.getElementById(&quot;reviewPanel&quot;);
const successPanel = document.getElementById(&quot;successPanel&quot;);
const confirmationText = document.getElementById(&quot;confirmationText&quot;);
let currentStep = 1;
let locationCounter = 0;
let lastSubmittedData = null;
document.addEventListener(&quot;DOMContentLoaded&quot;, () =&gt; {
addLocation();
restoreDraft();
setDefaultSignatureDate();
updateStepUI();
bindEvents();
});
function bindEvents() {
backBtn.addEventListener(&quot;click&quot;, goBack);
nextBtn.addEventListener(&quot;click&quot;, goNext);
addLocationBtn.addEventListener(&quot;click&quot;, () =&gt; addLocation());
document.getElementById(&quot;saveExitBtn&quot;).addEventListener(&quot;click&quot;, () =&gt; {
saveDraft(true);
});
form.addEventListener(&quot;input&quot;, () =&gt; {

saveDraft(false);
});
form.addEventListener(&quot;change&quot;, event =&gt; {
if (event.target.name === &quot;connectivity&quot;) {
connectivityWarning.classList.toggle(&quot;hidden&quot;, event.target.value !== &quot;No&quot;);
}
saveDraft(false);
});
form.addEventListener(&quot;submit&quot;, handleSubmit);
document.getElementById(&quot;printBtn&quot;).addEventListener(&quot;click&quot;, () =&gt; window.print());
document.getElementById(&quot;downloadBtn&quot;).addEventListener(&quot;click&quot;,
downloadApplicationCopy);
document.getElementById(&quot;newApplicationBtn&quot;).addEventListener(&quot;click&quot;,
resetApplication);
}
function goNext() {
if (!validateStep(currentStep)) return;
if (currentStep &lt; CONFIG.totalSteps) {
currentStep += 1;
if (currentStep === CONFIG.totalSteps) {
renderReview();
}
updateStepUI();
focusStepHeading();
}
}
function goBack() {
if (currentStep &gt; 1) {
currentStep -= 1;
updateStepUI();
focusStepHeading();
}
}
function updateStepUI() {
steps.forEach(step =&gt; {
step.classList.toggle(&quot;is-active&quot;, Number(step.dataset.step) === currentStep);
});
const percent = Math.round((currentStep / CONFIG.totalSteps) * 100);
stepLabel.textContent = `Step ${currentStep} of ${CONFIG.totalSteps}`;
progressPercent.textContent = `${percent}%`;
progressBar.style.width = `${percent}%`;
backBtn.classList.toggle(&quot;hidden&quot;, currentStep === 1);
nextBtn.classList.toggle(&quot;hidden&quot;, currentStep === CONFIG.totalSteps);
submitBtn.classList.toggle(&quot;hidden&quot;, currentStep !== CONFIG.totalSteps);
window.scrollTo({ top: 0, behavior: &quot;smooth&quot; });
}
function focusStepHeading() {
const heading = document.querySelector(`.form-step[data-step=&quot;${currentStep}&quot;] h2`);
if (heading) {
heading.setAttribute(&quot;tabindex&quot;, &quot;-1&quot;);
heading.focus();

}
}
function validateStep(stepNumber) {
clearErrors();
const step = document.querySelector(`.form-step[data-step=&quot;${stepNumber}&quot;]`);
const requiredFields = [...step.querySelectorAll(&quot;[required]&quot;)];
let firstInvalid = null;
requiredFields.forEach(field =&gt; {
if (!field.checkValidity()) {
markInvalid(field, field.validationMessage || &quot;Please complete this field.&quot;);
if (!firstInvalid) firstInvalid = field;
}
});
if (stepNumber === 3) {
const locationCards = [...document.querySelectorAll(&quot;.location-card&quot;)];
if (locationCards.length === 0) {
statusMessage.textContent = &quot;Please add at least one selling location.&quot;;
return false;
}
}
if (firstInvalid) {
statusMessage.textContent = &quot;Please correct the highlighted fields before
continuing.&quot;;
firstInvalid.focus();
return false;
}
statusMessage.textContent = &quot;&quot;;
return true;
}
function markInvalid(field, message) {
field.setAttribute(&quot;aria-invalid&quot;, &quot;true&quot;);
const fieldWrap = field.closest(&quot;.field&quot;) || field.closest(&quot;fieldset&quot;) ||
field.parentElement;
const error = document.createElement(&quot;div&quot;);
error.className = &quot;field-error&quot;;
error.textContent = message;
fieldWrap.appendChild(error);
}
function clearErrors() {
document.querySelectorAll(&quot;.field-error&quot;).forEach(el =&gt; el.remove());
document.querySelectorAll(&#39;[aria-invalid=&quot;true&quot;]&#39;).forEach(el =&gt; {
el.removeAttribute(&quot;aria-invalid&quot;);
});
}
function addLocation(data = {}) {
locationCounter += 1;
const card = document.createElement(&quot;section&quot;);
card.className = &quot;location-card&quot;;
card.dataset.locationId = String(locationCounter);
const countyOptions = WV_COUNTIES

.map(county =&gt; `&lt;option value=&quot;${escapeHtml(county)}&quot;${data.county === county ? &quot;
selected&quot; : &quot;&quot;}&gt;${escapeHtml(county)}&lt;/option&gt;`)
.join(&quot;&quot;);
card.innerHTML = `
&lt;div class=&quot;location-card-header&quot;&gt;
&lt;h3&gt;Selling location ${locationCounter}&lt;/h3&gt;
&lt;button class=&quot;remove-location&quot; type=&quot;button&quot; aria-label=&quot;Remove selling location
${locationCounter}&quot;&gt;
Remove
&lt;/button&gt;
&lt;/div&gt;
&lt;div class=&quot;form-grid two-column&quot;&gt;
&lt;div class=&quot;field&quot;&gt;
&lt;label&gt;County &lt;span aria-hidden=&quot;true&quot;&gt;*&lt;/span&gt;&lt;/label&gt;
&lt;select name=&quot;locationCounty&quot; required&gt;
&lt;option value=&quot;&quot;&gt;Select county&lt;/option&gt;
${countyOptions}
&lt;option value=&quot;Outside WV&quot;${data.county === &quot;Outside WV&quot; ? &quot; selected&quot; :
&quot;&quot;}&gt;Outside West Virginia&lt;/option&gt;
&lt;/select&gt;
&lt;/div&gt;
&lt;div class=&quot;field&quot;&gt;
&lt;label&gt;Street address or market location &lt;span aria-
hidden=&quot;true&quot;&gt;*&lt;/span&gt;&lt;/label&gt;
&lt;input name=&quot;locationAddress&quot; type=&quot;text&quot; value=&quot;${escapeHtml(data.address ||
&quot;&quot;)}&quot; required /&gt;
&lt;/div&gt;
&lt;div class=&quot;field&quot;&gt;
&lt;label&gt;Day(s) of operation &lt;span aria-hidden=&quot;true&quot;&gt;*&lt;/span&gt;&lt;/label&gt;
&lt;input name=&quot;locationDays&quot; type=&quot;text&quot; placeholder=&quot;Example: Tuesday and
Saturday&quot;
value=&quot;${escapeHtml(data.days || &quot;&quot;)}&quot; required /&gt;
&lt;/div&gt;
&lt;div class=&quot;field&quot;&gt;
&lt;label&gt;Time(s) of operation &lt;span aria-hidden=&quot;true&quot;&gt;*&lt;/span&gt;&lt;/label&gt;
&lt;input name=&quot;locationTimes&quot; type=&quot;text&quot; placeholder=&quot;Example: 8:00 AM–1:00 PM&quot;
value=&quot;${escapeHtml(data.times || &quot;&quot;)}&quot; required /&gt;
&lt;/div&gt;
&lt;/div&gt;
`;
card.querySelector(&quot;.remove-location&quot;).addEventListener(&quot;click&quot;, () =&gt; {
const cards = document.querySelectorAll(&quot;.location-card&quot;);
if (cards.length === 1) {
statusMessage.textContent = &quot;At least one selling location is required.&quot;;
return;
}
card.remove();
renumberLocations();
saveDraft(false);
});
locationsContainer.appendChild(card);
renumberLocations();
}
function renumberLocations() {

[...document.querySelectorAll(&quot;.location-card&quot;)].forEach((card, index) =&gt; {
card.querySelector(&quot;h3&quot;).textContent = `Selling location ${index + 1}`;
card.querySelector(&quot;.remove-location&quot;).setAttribute(
&quot;aria-label&quot;,
`Remove selling location ${index + 1}`
);
});
}
function collectFormData() {
const raw = Object.fromEntries(new FormData(form).entries());
const locations = [...document.querySelectorAll(&quot;.location-card&quot;)].map(card =&gt; ({
county: card.querySelector(&#39;[name=&quot;locationCounty&quot;]&#39;).value,
address: card.querySelector(&#39;[name=&quot;locationAddress&quot;]&#39;).value.trim(),
days: card.querySelector(&#39;[name=&quot;locationDays&quot;]&#39;).value.trim(),
times: card.querySelector(&#39;[name=&quot;locationTimes&quot;]&#39;).value.trim()
}));
return {
applicationVersion: &quot;2026&quot;,
submittedAt: new Date().toISOString(),
role: raw.role || &quot;&quot;,
applicant: {
managerName: raw.managerName || &quot;&quot;,
farmName: raw.farmName || &quot;&quot;,
mailingAddress: raw.mailingAddress || &quot;&quot;,
city: raw.city || &quot;&quot;,
state: raw.state || &quot;&quot;,
zip: raw.zip || &quot;&quot;,
telephone: raw.telephone || &quot;&quot;,
email: raw.email || &quot;&quot;
},
locations,
training: {
date: raw.trainingDate || &quot;&quot;,
trainerName: raw.trainerName || &quot;&quot;,
type: raw.trainingType || &quot;&quot;,
connectivity: raw.connectivity || &quot;&quot;
},
certifications: {
agreementAccepted: Boolean(raw.agreementAccepted),
civilRightsAccepted: Boolean(raw.civilRightsAccepted),
truthCertification: Boolean(raw.truthCertification)
},
signature: {
name: raw.signatureName || &quot;&quot;,
date: raw.signatureDate || &quot;&quot;
}
};
}
function renderReview() {
const data = collectFormData();
const locationItems = data.locations.map((location, index) =&gt; `
&lt;li&gt;
&lt;strong&gt;Location ${index + 1}:&lt;/strong&gt;
${escapeHtml(location.address)}, ${escapeHtml(location.county)} County —
${escapeHtml(location.days)}, ${escapeHtml(location.times)}
&lt;/li&gt;
`).join(&quot;&quot;);

reviewPanel.innerHTML = `
&lt;section class=&quot;review-section&quot;&gt;
&lt;h3&gt;Applicant&lt;/h3&gt;
&lt;p&gt;&lt;strong&gt;Role:&lt;/strong&gt; ${escapeHtml(data.role)}&lt;/p&gt;
&lt;p&gt;&lt;strong&gt;Name:&lt;/strong&gt; ${escapeHtml(data.applicant.managerName)}&lt;/p&gt;
&lt;p&gt;&lt;strong&gt;Farm or market:&lt;/strong&gt; ${escapeHtml(data.applicant.farmName)}&lt;/p&gt;
&lt;p&gt;&lt;strong&gt;Mailing address:&lt;/strong&gt;
${escapeHtml(data.applicant.mailingAddress)},
${escapeHtml(data.applicant.city)},
${escapeHtml(data.applicant.state)}
${escapeHtml(data.applicant.zip)}
&lt;/p&gt;
&lt;p&gt;&lt;strong&gt;Phone:&lt;/strong&gt; ${escapeHtml(data.applicant.telephone)}&lt;/p&gt;
&lt;p&gt;&lt;strong&gt;Email:&lt;/strong&gt; ${escapeHtml(data.applicant.email)}&lt;/p&gt;
&lt;/section&gt;
&lt;section class=&quot;review-section&quot;&gt;
&lt;h3&gt;Selling locations&lt;/h3&gt;
&lt;ul class=&quot;review-list&quot;&gt;${locationItems}&lt;/ul&gt;
&lt;/section&gt;
&lt;section class=&quot;review-section&quot;&gt;
&lt;h3&gt;Training and connectivity&lt;/h3&gt;
&lt;p&gt;&lt;strong&gt;Training date:&lt;/strong&gt; ${escapeHtml(data.training.date || &quot;Not
provided&quot;)}&lt;/p&gt;
&lt;p&gt;&lt;strong&gt;Trainer:&lt;/strong&gt; ${escapeHtml(data.training.trainerName || &quot;Not
provided&quot;)}&lt;/p&gt;
&lt;p&gt;&lt;strong&gt;Training type:&lt;/strong&gt; ${escapeHtml(data.training.type || &quot;Not
provided&quot;)}&lt;/p&gt;
&lt;p&gt;&lt;strong&gt;Cellular service/Wi-Fi:&lt;/strong&gt;
${escapeHtml(data.training.connectivity)}&lt;/p&gt;
&lt;/section&gt;
`;
}
async function handleSubmit(event) {
event.preventDefault();
if (!validateStep(CONFIG.totalSteps)) return;
const data = collectFormData();
const applicationId = createApplicationId();
data.applicationId = applicationId;
submitBtn.disabled = true;
submitBtn.textContent = &quot;Submitting...&quot;;
try {
if (CONFIG.submissionEndpoint) {
const response = await fetch(CONFIG.submissionEndpoint, {
method: &quot;POST&quot;,
headers: { &quot;Content-Type&quot;: &quot;text/plain;charset=utf-8&quot; },
body: JSON.stringify(data)
});
if (!response.ok) {
throw new Error(`Submission failed with status ${response.status}`);
}
const result = await response.json();
if (result.status !== &quot;success&quot;) {

throw new Error(result.message || &quot;Submission was not accepted.&quot;);
}
} else {
// Development mode: saves locally when no endpoint has been configured.
console.warn(&quot;No submission endpoint configured. Application stored locally
only.&quot;);
localStorage.setItem(&quot;wvWicLastSubmittedApplication&quot;, JSON.stringify(data));
}
lastSubmittedData = data;
localStorage.removeItem(CONFIG.storageKey);
form.classList.add(&quot;hidden&quot;);
successPanel.classList.remove(&quot;hidden&quot;);
confirmationText.textContent =
`Your confirmation number is ${applicationId}. Keep this number for your records.`;
successPanel.focus();
} catch (error) {
console.error(error);
statusMessage.textContent =
&quot;We could not submit your application. Your progress is still saved on this device.
Please try again.&quot;;
} finally {
submitBtn.disabled = false;
submitBtn.textContent = &quot;Submit application&quot;;
}
}
function saveDraft(showMessage = false) {
const draft = {
currentStep,
savedAt: new Date().toISOString(),
data: collectFormData()
};
localStorage.setItem(CONFIG.storageKey, JSON.stringify(draft));
if (showMessage) {
statusMessage.textContent = &quot;Your progress was saved on this device.&quot;;
setTimeout(() =&gt; {
if (statusMessage.textContent.includes(&quot;saved&quot;)) statusMessage.textContent = &quot;&quot;;
}, 3500);
}
}
function restoreDraft() {
const saved = localStorage.getItem(CONFIG.storageKey);
if (!saved) return;
try {
const draft = JSON.parse(saved);
const data = draft.data || {};
setRadioValue(&quot;role&quot;, data.role);
setValue(&quot;managerName&quot;, data.applicant?.managerName);
setValue(&quot;farmName&quot;, data.applicant?.farmName);
setValue(&quot;mailingAddress&quot;, data.applicant?.mailingAddress);
setValue(&quot;city&quot;, data.applicant?.city);
setValue(&quot;state&quot;, data.applicant?.state || &quot;WV&quot;);
setValue(&quot;zip&quot;, data.applicant?.zip);
setValue(&quot;telephone&quot;, data.applicant?.telephone);
setValue(&quot;email&quot;, data.applicant?.email);

locationsContainer.innerHTML = &quot;&quot;;
locationCounter = 0;
(data.locations?.length ? data.locations : [{}]).forEach(location =&gt;
addLocation(location));
setValue(&quot;trainingDate&quot;, data.training?.date);
setValue(&quot;trainerName&quot;, data.training?.trainerName);
setRadioValue(&quot;trainingType&quot;, data.training?.type);
setRadioValue(&quot;connectivity&quot;, data.training?.connectivity);
document.getElementById(&quot;agreementAccepted&quot;).checked =
Boolean(data.certifications?.agreementAccepted);
document.getElementById(&quot;civilRightsAccepted&quot;).checked =
Boolean(data.certifications?.civilRightsAccepted);
document.getElementById(&quot;truthCertification&quot;).checked =
Boolean(data.certifications?.truthCertification);
setValue(&quot;signatureName&quot;, data.signature?.name);
setValue(&quot;signatureDate&quot;, data.signature?.date);
currentStep = Math.min(
Math.max(Number(draft.currentStep) || 1, 1),
CONFIG.totalSteps
);
connectivityWarning.classList.toggle(
&quot;hidden&quot;,
data.training?.connectivity !== &quot;No&quot;
);
statusMessage.textContent = &quot;A saved application was restored.&quot;;
} catch (error) {
console.warn(&quot;Saved draft could not be restored.&quot;, error);
}
}
function setValue(id, value) {
if (value === undefined || value === null) return;
const element = document.getElementById(id);
if (element) element.value = value;
}
function setRadioValue(name, value) {
if (!value) return;
const radio =
document.querySelector(`input[name=&quot;${name}&quot;][value=&quot;${CSS.escape(value)}&quot;]`);
if (radio) radio.checked = true;
}
function setDefaultSignatureDate() {
const signatureDate = document.getElementById(&quot;signatureDate&quot;);
if (!signatureDate.value) {
signatureDate.value = new Date().toISOString().slice(0, 10);
}
}
function downloadApplicationCopy() {
if (!lastSubmittedData) return;
const blob = new Blob(
[JSON.stringify(lastSubmittedData, null, 2)],

{ type: &quot;application/json&quot; }
);
const url = URL.createObjectURL(blob);
const link = document.createElement(&quot;a&quot;);
link.href = url;
link.download = `${lastSubmittedData.applicationId}-wv-wic-farmer-application.json`;
link.click();
URL.revokeObjectURL(url);
}
function resetApplication() {
localStorage.removeItem(CONFIG.storageKey);
localStorage.removeItem(&quot;wvWicLastSubmittedApplication&quot;);
window.location.reload();
}
function createApplicationId() {
const now = new Date();
const datePart = now.toISOString().slice(0, 10).replaceAll(&quot;-&quot;, &quot;&quot;);
const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
return `WVFMNP-${datePart}-${randomPart}`;
}
function escapeHtml(value) {
return String(value ?? &quot;&quot;)
.replaceAll(&quot;&amp;&quot;, &quot;&amp;amp;&quot;)
.replaceAll(&quot;&lt;&quot;, &quot;&amp;lt;&quot;)
.replaceAll(&quot;&gt;&quot;, &quot;&amp;gt;&quot;)
.replaceAll(&#39;&quot;&#39;, &quot;&amp;quot;&quot;)
.replaceAll(&quot;&#39;&quot;, &quot;&amp;#039;&quot;);
}
