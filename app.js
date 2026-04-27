const screenOrder = ["intro", "details", "photos", "structural", "noise", "report"];
let currentIndex = 0;
let photosCaptured = 0;
let recording = false;
let noiseAnalyzed = false;

const screens = Object.fromEntries(
  screenOrder.map((id) => [id, document.getElementById(`screen-${id}`)])
);

const topTitle = document.getElementById("topTitle");
const stepPill = document.getElementById("stepPill");
const backBtn = document.getElementById("backBtn");

const reportCar = document.getElementById("reportCar");
const reportMeta = document.getElementById("reportMeta");
const photoReport = document.getElementById("photoReport");
const structuralReport = document.getElementById("structuralReport");
const flaggedReport = document.getElementById("flaggedReport");
const noiseReport = document.getElementById("noiseReport");
const negotiationReport = document.getElementById("negotiationReport");
const healthScore = document.getElementById("healthScore");
const decision = document.getElementById("decision");

const photoTiles = Array.from(document.querySelectorAll(".photo-tile"));
const photoStatus = document.getElementById("photoStatus");

const structuralItems = Array.from(document.querySelectorAll(".structural-item"));
const structuralStatus = document.getElementById("structuralStatus");

const waveWrap = document.getElementById("waveWrap");
const noiseText = document.getElementById("noiseText");
const noiseResult = document.getElementById("noiseResult");
const recordBtn = document.getElementById("recordBtn");

const carNameInput = document.getElementById("carName");
const regNoInput = document.getElementById("regNo");
const askingPriceInput = document.getElementById("askingPrice");
const odometerInput = document.getElementById("odometer");

function titleFromId(id) {
  if (id === "intro") return "Intro";
  if (id === "details") return "Car Details";
  if (id === "photos") return "Capture Photos";
  if (id === "structural") return "Structural Check";
  if (id === "noise") return "Engine Noise";
  return "Final Report";
}

function getStructuralStats() {
  const reviewed = structuralItems.filter((item) => item.dataset.review === "true").length;
  const flagged = structuralItems.filter((item) => item.dataset.flag === "true").length;
  const flaggedNames = structuralItems
    .filter((item) => item.dataset.flag === "true")
    .map((item) => item.dataset.item);

  return { reviewed, flagged, flaggedNames };
}

function updateStructuralStatus() {
  const { reviewed, flagged } = getStructuralStats();
  structuralStatus.textContent = `Reviewed ${reviewed}/10 | Flagged ${flagged}`;
}

function showScreen(index) {
  currentIndex = Math.max(0, Math.min(screenOrder.length - 1, index));
  const activeId = screenOrder[currentIndex];

  Object.entries(screens).forEach(([id, el]) => {
    el.classList.toggle("active", id === activeId);
  });

  topTitle.textContent = titleFromId(activeId);
  stepPill.textContent = `${currentIndex + 1}/${screenOrder.length}`;
  backBtn.disabled = currentIndex === 0;
  backBtn.style.opacity = currentIndex === 0 ? "0.4" : "1";

  if (activeId === "report") buildReport();
}

function buildReport() {
  const carName = carNameInput.value.trim() || "Selected Vehicle";
  const regNo = regNoInput.value.trim() || "Reg no not added";
  const price = askingPriceInput.value
    ? `₹${Number(askingPriceInput.value).toLocaleString("en-IN")}`
    : "Price not added";
  const odo = odometerInput.value ? `${odometerInput.value} km` : "Odometer not added";

  const { reviewed, flagged, flaggedNames } = getStructuralStats();

  reportCar.textContent = carName;
  reportMeta.textContent = `${regNo} | ${price} | ${odo}`;
  photoReport.textContent = `Photos captured: ${photosCaptured} / 6`;
  structuralReport.textContent = `Structural reviewed: ${reviewed} / 10`;
  flaggedReport.textContent =
    flagged === 0
      ? "Structural issues flagged: 0"
      : `Structural issues flagged: ${flagged} (${flaggedNames.slice(0, 2).join(", ")}${
          flagged > 2 ? ", ..." : ""
        })`;

  if (noiseAnalyzed) {
    noiseReport.textContent = "Engine noise: Mild anomaly detected";
  } else {
    noiseReport.textContent = "Engine noise: Not analyzed";
  }

  let score = 58 + photosCaptured * 4 + reviewed * 2;
  score -= flagged * 6;
  if (noiseAnalyzed) score -= 8;

  score = Math.max(20, Math.min(95, score));
  healthScore.textContent = String(score);

  decision.classList.remove("warn", "safe", "danger");
  if (score >= 82 && flagged <= 1) {
    decision.textContent = "BUY";
    decision.classList.add("safe");
    negotiationReport.textContent = "Recommended negotiation: Minimal, ask for preventive service package";
  } else if (score >= 66 && flagged <= 3) {
    decision.textContent = "NEGOTIATE";
    decision.classList.add("warn");
    negotiationReport.textContent = "Recommended negotiation: ₹30,000-₹70,000 lower + mechanic PPI";
  } else {
    decision.textContent = "AVOID";
    decision.classList.add("danger");
    negotiationReport.textContent = "Recommended negotiation: Walk away unless full structural proof is provided";
  }
}

function nextFromDataButton(event) {
  const btn = event.target.closest("[data-next]");
  if (!btn) return;
  const next = btn.dataset.next;
  const nextIndex = screenOrder.indexOf(next);
  if (nextIndex > -1) showScreen(nextIndex);
}

document.body.addEventListener("click", nextFromDataButton);

backBtn.addEventListener("click", () => showScreen(currentIndex - 1));

document.getElementById("restartBtn").addEventListener("click", () => {
  showScreen(0);
});

photoTiles.forEach((tile) => {
  tile.dataset.label = tile.textContent;

  tile.addEventListener("click", () => {
    if (tile.classList.contains("captured")) {
      tile.classList.remove("captured");
      tile.textContent = tile.dataset.label;
      photosCaptured -= 1;
    } else {
      tile.classList.add("captured");
      tile.textContent = `${tile.dataset.label} • Captured`;
      photosCaptured += 1;
    }

    photoStatus.textContent = `${photosCaptured} / 6 photos captured`;
  });
});

structuralItems.forEach((item) => {
  item.addEventListener("click", (event) => {
    const actionBtn = event.target.closest(".struct-btn");
    if (!actionBtn) return;

    const action = actionBtn.dataset.action;

    if (action === "review") {
      const nextReview = item.dataset.review !== "true";
      item.dataset.review = nextReview ? "true" : "false";
      item.classList.toggle("reviewed", nextReview);
      actionBtn.textContent = nextReview ? "Reviewed" : "Mark Reviewed";
    }

    if (action === "flag") {
      const nextFlag = item.dataset.flag !== "true";
      item.dataset.flag = nextFlag ? "true" : "false";
      item.classList.toggle("flagged", nextFlag);
      actionBtn.textContent = nextFlag ? "Flagged" : "Flag Issue";
    }

    updateStructuralStatus();
  });
});

recordBtn.addEventListener("click", () => {
  if (recording) return;

  recording = true;
  noiseResult.classList.add("hidden");
  waveWrap.classList.add("listening");
  noiseText.textContent = "Listening... capturing 20 sec sample";
  recordBtn.disabled = true;
  recordBtn.textContent = "Recording";

  setTimeout(() => {
    recording = false;
    noiseAnalyzed = true;
    waveWrap.classList.remove("listening");
    noiseText.textContent = "Analysis complete";
    noiseResult.classList.remove("hidden");
    recordBtn.disabled = false;
    recordBtn.textContent = "Record Again";
  }, 2200);
});

updateStructuralStatus();
showScreen(0);
