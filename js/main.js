// ✅ Sum Runner Structure: Free Play vs. Adventure Mode

let currentLevel = 1;
let currentAnswer = null;
let currentOperation = "add";
let gameMode = "free"; // "free" or "adventure"
let mistakes = 0;
const levelsPerMode = 15;

let progressData = JSON.parse(localStorage.getItem("sumRunnerProgress")) || {};
if (!progressData[currentOperation]) progressData[currentOperation] = {};

function goToScreen(screen) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(`${screen}-screen`).classList.add("active");
}

function startFreePlay(op) {
  gameMode = "free";
  currentOperation = op;
  goToScreen("game");
  currentLevel = 1;
  updateLevelUI();
  generateQuestion();
}

function enterAdventureMode(op) {
  gameMode = "adventure";
  currentOperation = op;
  if (!progressData[op]) progressData[op] = {};

  const allCompleted = Array.from({ length: levelsPerMode }, (_, i) => i + 1)
    .every((level) => progressData[op][level] > 0);

  goToScreen("level-select");
  renderLevelButtons();

  if (allCompleted) {
    showTopicCompletePopup(op);
  }
}

function playAdventureLevel(level) {
  const unlocked = isLevelUnlocked(currentOperation, level);
  if (!unlocked) return;
  currentLevel = level;
  mistakes = 0;
  goToScreen("game");
  updateLevelUI();
  generateQuestion();
}

function updateLevelUI() {
  document.getElementById("operation-heading").textContent = `${formatOp(currentOperation)} - Level ${currentLevel}`;
  document.getElementById("level").textContent = currentLevel;
  updateProgress();
}

function formatOp(op) {
  switch (op) {
    case "add": return "Addition";
    case "sub": return "Subtraction";
    case "multi": return "Multiplication";
    case "div": return "Division";
    case "mixed": return "Mixed Mode";
    default: return "";
  }
}

function generateQuestion() {
  const questionEl = document.getElementById("question");
  const choicesEl = document.getElementById("choices");
  const feedback = document.getElementById("feedback");

  let op = currentOperation;
  if (op === "mixed") {
    const ops = ["add", "sub", "multi", "div"];
    op = ops[Math.floor(Math.random() * ops.length)];
  }

  const [a, b] = getOperands(op, currentLevel);
  const symbol = getSymbol(op);
  currentAnswer = evaluate(a, b, op);

  questionEl.textContent = `What is ${a} ${symbol} ${b}?`;
  feedback.textContent = "";

  let wrong;
  do {
    const offset = Math.floor(Math.random() * 5) + 1;
    wrong = Math.random() > 0.5 ? currentAnswer + offset : currentAnswer - offset;
  } while (wrong === currentAnswer || wrong < 0);

  choicesEl.innerHTML = "";
  [currentAnswer, wrong]
    .sort(() => Math.random() - 0.5)
    .forEach((ans) => {
      const btn = document.createElement("button");
      btn.textContent = ans;
      btn.onclick = () => handleAnswer(ans);
      choicesEl.appendChild(btn);
    });
}

function handleAnswer(selected) {
  const feedback = document.getElementById("feedback");

  if (selected === currentAnswer) {
    feedback.textContent = "✅ Correct!";

    if (gameMode === "adventure") {
      const stars = Math.max(1, 3 - mistakes);
      progressData[currentOperation][currentLevel] = stars;

      const next = currentLevel + 1;
      if (next <= levelsPerMode && !progressData[currentOperation][next]) {
        progressData[currentOperation][next] = 0;
      }

      localStorage.setItem("sumRunnerProgress", JSON.stringify(progressData));

      if (checkIfTopicCompleted(currentOperation)) {
        showTopicCompletePopup(currentOperation);
        return;
      }
    }

    setTimeout(() => {
      if (gameMode === "adventure") {
        goToScreen("level-select");
        renderLevelButtons();
      } else {
        generateQuestion();
      }
    }, 800);
  } else {
    feedback.textContent = "❌ Oops! Try again.";
    mistakes++;
    setTimeout(generateQuestion, 800);
  }
}

function checkIfTopicCompleted(op) {
  for (let i = 1; i <= levelsPerMode; i++) {
    if (!progressData[op][i] || progressData[op][i] === 0) return false;
  }
  return true;
}

// ✅ Unified popup function
function showTopicCompletePopup(op) {
  document.getElementById("topic-complete-message").textContent =
    `${formatOp(op)} is now fully completed! ⭐️🎉`;
  document.getElementById("topic-complete-popup").classList.remove("hidden");
}

// ✅ Popup Close Handler
document.getElementById("close-popup-btn").addEventListener("click", () => {
  document.getElementById("topic-complete-popup").classList.add("hidden");
  goToScreen("level-select");
  renderLevelButtons();
});

function updateProgress() {
  const fill = document.getElementById("progress-fill");
  const percent = Math.min(currentLevel * 10, 100);
  fill.style.width = percent + "%";
}

function getOperands(op, level) {
  let min, max;
  switch (op) {
    case "add":
    case "sub":
      min = Math.floor(level / 2);
      max = min + 10 + level;
      break;
    case "multi":
      min = Math.max(1, Math.floor(level / 3));
      max = min + 5 + Math.floor(level / 2);
      break;
    case "div":
      min = Math.max(2, Math.floor(level / 3));
      max = min + 5 + Math.floor(level / 2);
      break;
  }

  let a = getRandomInt(min, max);
  let b = getRandomInt(min, max);

  if (op === "sub" && b > a) [a, b] = [b, a];
  if (op === "div") a = a * b;

  return [a, b];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getSymbol(op) {
  switch (op) {
    case "add": return "+";
    case "sub": return "-";
    case "multi": return "×";
    case "div": return "÷";
    default: return "?";
  }
}

function evaluate(a, b, op) {
  switch (op) {
    case "add": return a + b;
    case "sub": return a - b;
    case "multi": return a * b;
    case "div": return a / b;
    default: return null;
  }
}

function isLevelUnlocked(op, level) {
  if (level === 1) return true;
  return progressData[op] && progressData[op][level - 1] > 0;
}

function renderLevelButtons() {
  const container = document.getElementById("level-buttons");
  container.innerHTML = "";

  for (let i = 1; i <= levelsPerMode; i++) {
    const btn = document.createElement("button");
    btn.textContent = `Level ${i}`;
    const passed = progressData[currentOperation]?.[i];
    const unlocked = isLevelUnlocked(currentOperation, i);

    if (!unlocked) {
      btn.disabled = true;
      btn.classList.add("locked");
    }

    if (passed > 0) {
      const stars = "⭐️".repeat(passed);
      btn.setAttribute("data-stars", stars);
    }

    btn.classList.add("level-btn");
    btn.onclick = () => playAdventureLevel(i);
    container.appendChild(btn);
  }
}

// ✅ Initial load logic
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("start-button").addEventListener("click", () => {
    goToScreen("difficulty");
  });

  document.querySelectorAll(".back-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const to = btn.dataset.backTo.replace("-screen", "");
      goToScreen(to);
    });
  });

  goToScreen("landing");
});
