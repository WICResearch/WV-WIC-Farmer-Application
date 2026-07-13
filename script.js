// -----------------------------
// WV WIC Farmer Portal
// -----------------------------

const CONFIG = {
  // Paste your deployed Google Apps Script Web App URL here.
  // Example: https://script.google.com/macros/s/XXXX/exec
  submissionEndpoint: "",
  storageKey: "wvWicFarmerApplicationDraftV1",
  totalSteps: 7
};

const WV_COUNTIES = [
  "Barbour","Berkeley","Boone","Braxton","Brooke","Cabell","Calhoun","Clay",
  "Doddridge","Fayette","Gilmer","Grant","Greenbrier","Hampshire","Hancock",
  "Hardy","Harrison","Jackson","Jefferson","Kanawha","Lewis","Lincoln","Logan",
  "Marion","Marshall","Mason","McDowell","Mercer","Mineral","Mingo","Monongalia",
  "Monroe","Morgan","Nicholas","Ohio","Pendleton","Pleasants","Pocahontas",
  "Preston","Putnam","Raleigh","Randolph","Ritchie","Roane","Summers","Taylor",
  "Tucker","Tyler","Upshur","Wayne","Webster","Wetzel","Wirt","Wood","Wyoming"
];

const form = document.getElementById("applicationForm");
const steps = [...document.querySelectorAll(".form-step")];
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const stepLabel = document.getElementById("stepLabel");
const progressPercent = document.getElementById("progressPercent");
const progressBar = document.getElementById("progressBar");
const statusMessage = document.getElementById("statusMessage");
const locationsContainer = document.getElementById("locationsContainer");
const addLocationBtn = document.getElementById("addLocationBtn");
const connectivityWarning = document.getElementById("connectivityWarning");
const reviewPanel = document.getElementById("reviewPanel");
const successPanel = document.getElementById("successPanel");
const confirmationText = document.getElementById("confirmationText");

let currentStep = 1;
let locationCounter = 0;
let lastSubmittedData = null;

document.addEventListener("DOMContentLoaded", () => {
  addLocation();
  restoreDraft();
  setDefaultSignatureDate();
  updateStepUI();
  bindEvents();
});

function bindEvents() {
  backBtn.addEventListener("click", goBack);
  nextBtn.addEventListener("click", goNext);
  addLocationBtn.addEventListener("click", () => addLocation());

  document.getElementById("saveExitBtn").addEventListener("click", () => {
    saveDraft(true);
  });

  form.addEventListener("input", () => {
    saveDraft(false);
  });

  form.addEventListener("change", event => {
    if (event.target.name === "connectivity") {
      connectivityWarning.classList.toggle("hidden", event.target.value !== "No");
    }
    saveDraft(false);
  });

  form.addEventListener("submit", handleSubmit);

  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("downloadBtn").addEventListener("click", downloadApplicationCopy);
  document.getElementById("newApplicationBtn").addEventListener("click", resetApplication);
}

function goNext() {
  if (!validateStep(currentStep)) return;

  if (currentStep < CONFIG.totalSteps) {
    currentStep += 1;
    if (currentStep === CONFIG.totalSteps) {
      renderReview();
    }
    updateStepUI();
    focusStepHeading();
  }
}

function goBack() {
  if (currentStep > 1) {
    currentStep -= 1;
    updateStepUI();
    focusStepHeading();
  }
}

function updateStepUI() {
  steps.forEach(step => {
    step.classList.toggle("is-active", Number(step.dataset.step) === currentStep);
  });

  const percent = Math.round((currentStep / CONFIG.totalSteps) * 100);
  stepLabel.textContent = `Step ${currentStep} of ${CONFIG.totalSteps}`;
  progressPercent.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;

  backBtn.classList.toggle("hidden", currentStep === 1);
  nextBtn.classList.toggle("hidden", currentStep === CONFIG.totalSteps);
  submitBtn.classList.toggle("hidden", currentStep !== CONFIG.totalSteps);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function focusStepHeading() {
  const heading = document.querySelector(`.form-step[data-step="${currentStep}"] h2`);
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus();
  }
}

function validateStep(stepNumber) {
  clearErrors();

  const step = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
  const requiredFields = [...step.querySelectorAll("[required]")];
  let firstInvalid = null;

  requiredFields.forEach(field => {
    if (!field.checkValidity()) {
      markInvalid(field, field.validationMessage || "Please complete this field.");
      if (!firstInvalid) firstInvalid = field;
    }
  });

  if (stepNumber === 3) {
    const locationCards = [...document.querySelectorAll(".location-card")];
    if (locationCards.length === 0) {
      statusMessage.textContent = "Please add at least one selling location.";
      return false;
    }
  }

  if (firstInvalid) {
    statusMessage.textContent = "Please correct the highlighted fields before continuing.";
    firstInvalid.focus();
    return false;
  }

  statusMessage.textContent = "";
  return true;
}

function markInvalid(field, message) {
  field.setAttribute("aria-invalid", "true");
  const fieldWrap = field.closest(".field") || field.closest("fieldset") || field.parentElement;
  const error = document.createElement("div");
  error.className = "field-error";
  error.textContent = message;
  fieldWrap.appendChild(error);
}

function clearErrors() {
  document.querySelectorAll(".field-error").forEach(el => el.remove());
  document.querySelectorAll('[aria-invalid="true"]').forEach(el => {
    el.removeAttribute("aria-invalid");
  });
}

function addLocation(data = {}) {
  locationCounter += 1;

  const card = document.createElement("section");
  card.className = "location-card";
  card.dataset.locationId = String(locationCounter);

  const countyOptions = WV_COUNTIES
    .map(county => `<option value="${escapeHtml(county)}"${data.county === county ? " selected" : ""}>${escapeHtml(county)}</option>`)
    .join("");

  card.innerHTML = `
    <div class="location-card-header">
      <h3>Selling location ${locationCounter}</h3>
      <button class="remove-location" type="button" aria-label="Remove selling location ${locationCounter}">
        Remove
      </button>
    </div>

    <div class="form-grid two-column">
      <div class="field">
        <label>County <span aria-hidden="true">*</span></label>
        <select name="locationCounty" required>
          <option value="">Select county</option>
          ${countyOptions}
          <option value="Outside WV"${data.county === "Outside WV" ? " selected" : ""}>Outside West Virginia</option>
        </select>
      </div>

      <div class="field">
        <label>Street address or market location <span aria-hidden="true">*</span></label>
        <input name="locationAddress" type="text" value="${escapeHtml(data.address || "")}" required />
      </div>

      <div class="field">
        <label>Day(s) of operation <span aria-hidden="true">*</span></label>
        <input name="locationDays" type="text" placeholder="Example: Tuesday and Saturday"
               value="${escapeHtml(data.days || "")}" required />
      </div>

      <div class="field">
        <label>Time(s) of operation <span aria-hidden="true">*</span></label>
        <input name="locationTimes" type="text" placeholder="Example: 8:00 AM–1:00 PM"
               value="${escapeHtml(data.times || "")}" required />
      </div>
    </div>
  `;

  card.querySelector(".remove-location").addEventListener("click", () => {
    const cards = document.querySelectorAll(".location-card");
    if (cards.length === 1) {
      statusMessage.textContent = "At least one selling location is required.";
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
  [...document.querySelectorAll(".location-card")].forEach((card, index) => {
    card.querySelector("h3").textContent = `Selling location ${index + 1}`;
    card.querySelector(".remove-location").setAttribute(
      "aria-label",
      `Remove selling location ${index + 1}`
    );
  });
}

function collectFormData() {
  const raw = Object.fromEntries(new FormData(form).entries());

  const locations = [...document.querySelectorAll(".location-card")].map(card => ({
    county: card.querySelector('[name="locationCounty"]').value,
    address: card.querySelector('[name="locationAddress"]').value.trim(),
    days: card.querySelector('[name="locationDays"]').value.trim(),
    times: card.querySelector('[name="locationTimes"]').value.trim()
  }));

  return {
    applicationVersion: "2026",
    submittedAt: new Date().toISOString(),
    role: raw.role || "",
    applicant: {
      managerName: raw.managerName || "",
      farmName: raw.farmName || "",
      mailingAddress: raw.mailingAddress || "",
      city: raw.city || "",
      state: raw.state || "",
      zip: raw.zip || "",
      telephone: raw.telephone || "",
      email: raw.email || ""
    },
    locations,
    training: {
      date: raw.trainingDate || "",
      trainerName: raw.trainerName || "",
      type: raw.trainingType || "",
      connectivity: raw.connectivity || ""
    },
    certifications: {
      agreementAccepted: Boolean(raw.agreementAccepted),
      civilRightsAccepted: Boolean(raw.civilRightsAccepted),
      truthCertification: Boolean(raw.truthCertification)
    },
    signature: {
      name: raw.signatureName || "",
      date: raw.signatureDate || ""
    }
  };
}

function renderReview() {
  const data = collectFormData();

  const locationItems = data.locations.map((location, index) => `
    <li>
      <strong>Location ${index + 1}:</strong>
      ${escapeHtml(location.address)}, ${escapeHtml(location.county)} County —
      ${escapeHtml(location.days)}, ${escapeHtml(location.times)}
    </li>
  `).join("");

  reviewPanel.innerHTML = `
    <section class="review-section">
      <h3>Applicant</h3>
      <p><strong>Role:</strong> ${escapeHtml(data.role)}</p>
      <p><strong>Name:</strong> ${escapeHtml(data.applicant.managerName)}</p>
      <p><strong>Farm or market:</strong> ${escapeHtml(data.applicant.farmName)}</p>
      <p><strong>Mailing address:</strong>
        ${escapeHtml(data.applicant.mailingAddress)},
        ${escapeHtml(data.applicant.city)},
        ${escapeHtml(data.applicant.state)}
        ${escapeHtml(data.applicant.zip)}
      </p>
      <p><strong>Phone:</strong> ${escapeHtml(data.applicant.telephone)}</p>
      <p><strong>Email:</strong> ${escapeHtml(data.applicant.email)}</p>
    </section>

    <section class="review-section">
      <h3>Selling locations</h3>
      <ul class="review-list">${locationItems}</ul>
    </section>

    <section class="review-section">
      <h3>Training and connectivity</h3>
      <p><strong>Training date:</strong> ${escapeHtml(data.training.date || "Not provided")}</p>
      <p><strong>Trainer:</strong> ${escapeHtml(data.training.trainerName || "Not provided")}</p>
      <p><strong>Training type:</strong> ${escapeHtml(data.training.type || "Not provided")}</p>
      <p><strong>Cellular service/Wi-Fi:</strong> ${escapeHtml(data.training.connectivity)}</p>
    </section>
  `;
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!validateStep(CONFIG.totalSteps)) return;

  const data = collectFormData();
  const applicationId = createApplicationId();
  data.applicationId = applicationId;

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    if (CONFIG.submissionEndpoint) {
      const response = await fetch(CONFIG.submissionEndpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Submission failed with status ${response.status}`);
      }

      const result = await response.json();
      if (result.status !== "success") {
        throw new Error(result.message || "Submission was not accepted.");
      }
    } else {
      // Development mode: saves locally when no endpoint has been configured.
      console.warn("No submission endpoint configured. Application stored locally only.");
      localStorage.setItem("wvWicLastSubmittedApplication", JSON.stringify(data));
    }

    lastSubmittedData = data;
    localStorage.removeItem(CONFIG.storageKey);

    form.classList.add("hidden");
    successPanel.classList.remove("hidden");
    confirmationText.textContent =
      `Your confirmation number is ${applicationId}. Keep this number for your records.`;
    successPanel.focus();
  } catch (error) {
    console.error(error);
    statusMessage.textContent =
      "We could not submit your application. Your progress is still saved on this device. Please try again.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit application";
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
    statusMessage.textContent = "Your progress was saved on this device.";
    setTimeout(() => {
      if (statusMessage.textContent.includes("saved")) statusMessage.textContent = "";
    }, 3500);
  }
}

function restoreDraft() {
  const saved = localStorage.getItem(CONFIG.storageKey);
  if (!saved) return;

  try {
    const draft = JSON.parse(saved);
    const data = draft.data || {};

    setRadioValue("role", data.role);
    setValue("managerName", data.applicant?.managerName);
    setValue("farmName", data.applicant?.farmName);
    setValue("mailingAddress", data.applicant?.mailingAddress);
    setValue("city", data.applicant?.city);
    setValue("state", data.applicant?.state || "WV");
    setValue("zip", data.applicant?.zip);
    setValue("telephone", data.applicant?.telephone);
    setValue("email", data.applicant?.email);

    locationsContainer.innerHTML = "";
    locationCounter = 0;
    (data.locations?.length ? data.locations : [{}]).forEach(location => addLocation(location));

    setValue("trainingDate", data.training?.date);
    setValue("trainerName", data.training?.trainerName);
    setRadioValue("trainingType", data.training?.type);
    setRadioValue("connectivity", data.training?.connectivity);

    document.getElementById("agreementAccepted").checked =
      Boolean(data.certifications?.agreementAccepted);
    document.getElementById("civilRightsAccepted").checked =
      Boolean(data.certifications?.civilRightsAccepted);
    document.getElementById("truthCertification").checked =
      Boolean(data.certifications?.truthCertification);

    setValue("signatureName", data.signature?.name);
    setValue("signatureDate", data.signature?.date);

    currentStep = Math.min(
      Math.max(Number(draft.currentStep) || 1, 1),
      CONFIG.totalSteps
    );

    connectivityWarning.classList.toggle(
      "hidden",
      data.training?.connectivity !== "No"
    );

    statusMessage.textContent = "A saved application was restored.";
  } catch (error) {
    console.warn("Saved draft could not be restored.", error);
  }
}

function setValue(id, value) {
  if (value === undefined || value === null) return;
  const element = document.getElementById(id);
  if (element) element.value = value;
}

function setRadioValue(name, value) {
  if (!value) return;
  const radio = document.querySelector(`input[name="${name}"][value="${CSS.escape(value)}"]`);
  if (radio) radio.checked = true;
}

function setDefaultSignatureDate() {
  const signatureDate = document.getElementById("signatureDate");
  if (!signatureDate.value) {
    signatureDate.value = new Date().toISOString().slice(0, 10);
  }
}

function downloadApplicationCopy() {
  if (!lastSubmittedData) return;

  const blob = new Blob(
    [JSON.stringify(lastSubmittedData, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${lastSubmittedData.applicationId}-wv-wic-farmer-application.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function resetApplication() {
  localStorage.removeItem(CONFIG.storageKey);
  localStorage.removeItem("wvWicLastSubmittedApplication");
  window.location.reload();
}

function createApplicationId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `WVFMNP-${datePart}-${randomPart}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
