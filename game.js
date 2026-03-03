// ─── CONFIG ─────────────────────────────────────────────────────────────────
const WORDS = {
  4: [
    "axon","flux","node","path","grid","wave","core","mind","zone","link",
    "data","scan","loop","task","goal","sync","edge","peak","bias","mode"
  ],

  5: [
    "focus","brain","logic","react","adapt","speed","alert","drive","shift","learn",
    "trace","input","trial","boost","match","prime","clear","think","sense","skill"
  ],

  6: [
    "memory","vision","signal","neural","reflex","cortex","stream","matrix","filter","recall",
    "target","timing","stable","active","strain","output","update","growth","switch","effort"
  ],

  7: [
    "synapse","trigger","process","pattern","analyze","monitor","control","balance","improve","predict",
    "connect","clarity","perform","optimize","insight","develop","execute","measure","compute","respond"
  ],

  8: [
    "reaction","stimulus","feedback","training","cognitive","strategy","accuracy","velocity","progress","capacity",
    "learning","adaptive","precision","response","attention","function","reaction","practice","stability","analysis"
  ]
};

const ALL_WORDS = Object.values(WORDS).flat();

const DIFFICULTY = {
  easy: ALL_WORDS.filter(w => w.length <= 5),
  medium: ALL_WORDS.filter(w => w.length > 5 && w.length <= 7),
  hard: ALL_WORDS.filter(w => w.length > 7)
};

const correctSound = new Audio("correct.mp3");
const wrongSound = new Audio("wrong.mp3");
const levelUpSound = new Audio("level_up.mp3");

const GAME_DURATION = 60; // total game seconds
let dynamicWordTime = 5;

let brainProfile = {
  totalSessions: 0,
  averageCognitive: 0,
  peakCognitive: 0,
  bestClass: "Unranked",
  level: 1
};

let currentTimeLimit = 2600;

function loadBrainProfile() {
  const saved = localStorage.getItem("brainProfile");
  if (saved) {
    brainProfile = JSON.parse(saved);
  }
}
loadBrainProfile();
// ─── STATE ───────────────────────────────────────────────────────────────────
let state = {
  reactionHistory: [],
  wpmHistory: [],
  accuracyHistory: [],
  cognitiveScore: 50,
  running: false,
  difficultyLevel: 50,
  currentWord: "",
  score: 0,
  timeLeft: dynamicWordTime,
  gameTimeLeft: GAME_DURATION,
  wordStartTime: 0,
  streak: 0,
  bestStreak: 0,
  totalReaction: 0,
  wordCount: 0,
  correctWords: 0,
  totalWords: 0,
  correctCharsTotal: 0,
  totalCharsTyped: 0,
  lastWPMs: [],
  wordTimer: null,
  gameTimer: null,
  flowState: false,
  paused: false,
  combo: 0,
  comboMultiplier: 1,
};

// ─── DOM ─────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const wordDisplay   = $("wordDisplay");
const wordInput     = $("wordInput");
const timeLeftEl    = $("timeLeft");
const scoreEl       = $("score");
const startBtn      = $("startBtn");
const pauseBtn      = $("pauseBtn");
const reactionEl    = $("reaction");
const accuracyEl    = $("accuracy");
const wpmEl         = $("wpm");
const timerBar      = $("timerBar");
const streakDisplay = $("streakDisplay");
const streakCount   = $("streakCount");
const comboFlash    = $("comboFlash");
const comboDisplay  = $("comboDisplay");
const gameOverlay   = $("gameOverlay");
const restartBtn    = $("restartBtn");
const cogCanvas     = $("cogChart");
const exportBtn     = $("exportBtn");
const cogCtx = cogCanvas.getContext("2d");

let cognitiveHistory = [];

// ─── PARTICLE SYSTEM ─────────────────────────────────────────────────────────
const canvas = $("particleCanvas");
const ctx = canvas.getContext("2d");
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

class Particle {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    this.color = color;
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = (Math.random() - 0.5) * 6 - 2;
    this.life = 1;
    this.decay = 0.02 + Math.random() * 0.03;
    this.size = 2 + Math.random() * 4;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1;
    this.life -= this.decay;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function burst(x, y, color, count = 20) {
  const multiplier = state.flowState ? 1.8 : 1;
  for (let i = 0; i < count * multiplier; i++) {
    particles.push(new Particle(x, y, color));
  }
}

function animParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animParticles);
}
animParticles();

// ─── GAME LOGIC ───────────────────────────────────────────────────────────────
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", () => { gameOverlay.classList.remove("show"); startGame(); });

pauseBtn.addEventListener("click", () => {
  if (!state.running) return;

  if (state.paused) {
    resumeGame();
  } else {
    pauseGame();
  }
});

function startGame() {

const difficulty = getDifficultySettings(brainProfile.level);

  Object.assign(state, {
    difficultyLevel: 50,
    cognitiveScore: 50,
    reactionHistory: [],
    wpmHistory: [],
    accuracyHistory: [],
    flowState: false,
    running: true, score: 0, streak: 0, bestStreak: 0,
    totalReaction: 0, wordCount: 0, correctCharsTotal: 0,
    totalCharsTyped: 0, lastWPMs: [], gameTimeLeft: GAME_DURATION
  });

  cognitiveHistory = [];
  drawCognitiveGraph();
  scoreEl.textContent = "0";
  reactionEl.textContent = "—";
  accuracyEl.textContent = "—";
  wpmEl.textContent = "—";
  wordInput.disabled = false;
  wordInput.value = "";
  wordInput.focus();
  startBtn.disabled = true;

  // Game countdown
  clearInterval(state.gameTimer);
  state.gameTimer = setInterval(() => {
    state.gameTimeLeft--;
    if (state.gameTimeLeft <= 0) {
      clearInterval(state.gameTimer);
      endGame();
    }
  }, 1000);

  nextWord();
}

function pauseGame() {
  state.paused = true;
  clearInterval(state.wordTimer);
  clearInterval(state.gameTimer);
  wordInput.disabled = true;
  pauseBtn.textContent = "Resume";
  wordDisplay.textContent = "// PAUSED //";
}

function resumeGame() {
  state.paused = false;
  wordInput.disabled = false;
  pauseBtn.textContent = "Pause";
  nextWord();

  // Restart global timer
  state.gameTimer = setInterval(() => {
    state.gameTimeLeft--;
    if (state.gameTimeLeft <= 0) {
      clearInterval(state.gameTimer);
      endGame();
    }
  }, 1000);
}

function getLevelTimeMultiplier(level) {
  if (level <= 2) return 1.2;
  if (level <= 4) return 1.0;
  if (level <= 6) return 0.9;
  if (level <= 7) return 0.8;
  return 0.7;
}

function getWordByLevel(level) {
  let length;

  if (level <= 2) length = 4;
  else if (level <= 4) length = 5;
  else if (level <= 6) length = 6;
  else if (level <= 7) length = 7;
  else length = 8;

  const list = WORDS[length];

  return list[Math.floor(Math.random() * list.length)];
}

function nextWord() {
  clearInterval(state.wordTimer);

  const adaptiveLevel = Math.round(state.difficultyLevel / 15);
  const effectiveLevel = Math.max(brainProfile.level, adaptiveLevel);

  const timeMultiplier = getLevelTimeMultiplier(effectiveLevel);  
  const adjustedTime = dynamicWordTime * timeMultiplier;

  state.timeLeft = adjustedTime;
  const durationMs = adjustedTime * 1000;

  timeLeftEl.textContent = adjustedTime.toFixed(1);
  timerBar.style.width = "100%";
  timerBar.classList.remove("warning");
  state.currentWord = getWordByLevel(effectiveLevel);

  wordDisplay.className = "";
  wordDisplay.textContent = state.currentWord;
  wordInput.value = "";
  wordInput.classList.remove("correct-typing","wrong-typing");

  state.wordStartTime = Date.now();

  state.wordTimer = setInterval(() => {
    const elapsed = Date.now() - state.wordStartTime;
    const remaining = Math.max(0, durationMs - elapsed);

    state.timeLeft = remaining / 1000;
    timeLeftEl.textContent = state.timeLeft.toFixed(1);

    const pct = (remaining / durationMs) * 100;
    timerBar.style.width = pct + "%";

    if (state.timeLeft <= 2) {
      timerBar.classList.add("warning");
    }

if (remaining <= 0) {
  clearInterval(state.wordTimer);

  const typed = wordInput.value.toLowerCase();

  // Count only what user actually typed
  state.totalCharsTyped += typed.length;

  // No correct chars added (because word failed)

  const accuracy = state.totalCharsTyped > 0
    ? (state.correctCharsTotal / state.totalCharsTyped) * 100
    : 100;

  accuracyEl.textContent = accuracy.toFixed(0) + "%";
  pushWithLimit(state.accuracyHistory, accuracy);

  updateCognitiveScore();

  state.totalWords++;
  state.streak = 0;
  state.combo = 0;
  state.comboMultiplier = 1;
  comboDisplay.textContent = "Combo: x1";
  updateStreak();

  wordDisplay.classList.add("wrong-flash");
  setTimeout(nextWord, 300);
  wrongSound.currentTime = 0;
  wrongSound.play();
}
  }, 50);
}

wordInput.addEventListener("input", () => {
  if (!state.running) return;
  const typed = wordInput.value.toLowerCase();
  const target = state.currentWord;

  // Live feedback
  let allCorrect = true;
  for (let i = 0; i < typed.length; i++) {
    if (typed[i] !== target[i]) { allCorrect = false; break; }
  }
  wordInput.classList.toggle("correct-typing", allCorrect && typed.length > 0);
  wordInput.classList.toggle("wrong-typing", !allCorrect);

if (!allCorrect && typed.length > 0) {
  state.combo = 0;
  state.comboMultiplier = 1;
  comboDisplay.textContent = "Combo: x1";
}

  if (typed === target) {
    const rect = wordDisplay.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    burst(cx, cy, "#00f5ff", 30);


    state.combo++;

    if (state.combo >= 20) {
      state.comboMultiplier = 2.5;
    } else if (state.combo >= 15) {
      state.comboMultiplier = 2;
    } else if (state.combo >= 10) {
      state.comboMultiplier = 1.8;
    } else if (state.combo >= 5) {
      state.comboMultiplier = 1.5;
    } else {
      state.comboMultiplier = 1;
    }
    comboDisplay.textContent = "Combo: x" + state.comboMultiplier;

    calculateMetrics(typed);
    state.totalWords++;
    state.correctWords++;
    state.score += state.comboMultiplier;
    state.streak++;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    scoreEl.textContent = Math.round(state.score);
    updateStreak();
    checkCombo();

    wordDisplay.classList.add("correct-flash");
    nextWord();
  }
});

function pushWithLimit(arr, value, limit = 10) {
  arr.push(value);
  if (arr.length > limit) arr.shift();
}

function calculateMetrics(typed) {
  const now = Date.now();
  const reactionTime = now - state.wordStartTime;
  state.totalReaction += reactionTime;
  state.wordCount++;

  // Accuracy per word
  let correct = 0;
  for (let i = 0; i < typed.length; i++) {
    if (typed[i] === state.currentWord[i]) correct++;
  }
  state.correctCharsTotal += correct;
  state.totalCharsTyped += typed.length;

  const accuracy = state.totalWords > 0
  ? (state.correctWords / state.totalWords) * 100
  : 100;

correctSound.currentTime = 0;
correctSound.play();

  const minutes = reactionTime / 60000;
  const wpm = (typed.length / 5) / minutes;
  pushWithLimit(state.lastWPMs, wpm);
  const avgWPM = state.lastWPMs.reduce((a,b)=>a+b,0) / state.lastWPMs.length;

  reactionEl.textContent = reactionTime + "ms";
  accuracyEl.textContent = accuracy.toFixed(0) + "%";
  wpmEl.textContent = avgWPM.toFixed(0);
  // Store history
pushWithLimit(state.reactionHistory, reactionTime);
pushWithLimit(state.wpmHistory, wpm);
pushWithLimit(state.accuracyHistory, accuracy);

// Update Cognitive Engine
updateCognitiveScore();
}

function normalize(value, min, max) {
  if (max - min === 0) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function average(arr) {
  return arr.reduce((a,b)=>a+b,0) / arr.length;
}

function variance(arr) {
  const avg = average(arr);
  return average(arr.map(v => (v - avg) ** 2));
}

function updateCognitiveScore() {
  if (state.reactionHistory.length < 3) return;

  const avgReaction = average(state.reactionHistory);
  const avgWPM = average(state.wpmHistory);
  const avgAccuracy = average(state.accuracyHistory);

  const reactionScore = 100 - normalize(avgReaction, 300, 3000);
  const typingScore = normalize(avgWPM, 10, 120);
  const accuracyScore = normalize(avgAccuracy, 60, 100);

  const stability = 100 - normalize(variance(state.reactionHistory), 0, 800000);
  
  const reactionTrend = getTrend(state.reactionHistory);
  const wpmTrend = getTrend(state.wpmHistory);
  
  let flowBonus = 0;

// Flow conditions
const highAccuracy = accuracyScore > 90;
const goodStability = stability > 80;
const reactionImproving = reactionTrend < -100;
const typingImproving = wpmTrend > 3;

if (highAccuracy && goodStability && reactionImproving && typingImproving) {
  state.flowState = true;
  flowBonus = 8;
} else {
  state.flowState = false;
}

  let fatiguePenalty = 0;

  if (reactionTrend > 150) fatiguePenalty += 5; // reaction slowing
  if (wpmTrend < -5) fatiguePenalty += 5;       // typing slowing

if (state.flowState) {
  document.body.classList.add("flow-active");
} else {
  document.body.classList.remove("flow-active");
}

const cognitive =
  reactionScore * 0.35 +
  typingScore * 0.30 +
  accuracyScore * 0.20 +
  stability * 0.15 -
  fatiguePenalty +
  flowBonus;

  state.cognitiveScore = Math.max(0, Math.min(100, Math.round(cognitive)));
  cognitiveHistory.push(state.cognitiveScore);
  if (cognitiveHistory.length > 20) cognitiveHistory.shift();

  drawCognitiveGraph();
    state.reactionScore = Math.round(reactionScore);
    state.typingScore = Math.round(typingScore);
    state.accuracyScore = Math.round(accuracyScore);
    state.stabilityScore = Math.round(stability);

  updateDevPanel({
    reactionScore: Math.round(reactionScore),
    typingScore: Math.round(typingScore),
    accuracyScore: Math.round(accuracyScore),
    stability: Math.round(stability),
    cognitive: state.cognitiveScore
  });
    // Smooth difficulty adjustment
    const adaptSpeed = 0.05; // smaller = slower adaptation
    state.difficultyLevel +=
    (state.cognitiveScore - state.difficultyLevel) * adaptSpeed;
    updateDifficultyParameters();
}

function updateDifficultyParameters() {

  const d = state.difficultyLevel; // 0–100

  // Base scaling (6s → 3s)
  dynamicWordTime = 6 - (d / 100) * 3;

  // Combo pressure boost
  if (state.combo >= 5) {
    dynamicWordTime *= 0.95;
  }

  if (state.combo >= 10) {
    dynamicWordTime *= 0.9;
  }

  // Never go below 2.2 seconds
  dynamicWordTime = Math.max(2.2, dynamicWordTime);
}

function updateStreak() {
  streakCount.textContent = state.streak;
  streakDisplay.classList.toggle("visible", state.streak >= 3);
}

function checkCombo() {
  const milestones = { 5: ["COMBO!", "#ffe600"], 10: ["BLAZING!", "#00f5ff"], 15: ["NEURAL LINK!", "#ff00c8"], 20: ["GODMODE", "#00ff88"] };
  if (milestones[state.streak]) {
    const [text, color] = milestones[state.streak];
    showComboFlash(text, color);
  }
}

function showComboFlash(text, color) {
  comboFlash.textContent = text;
  comboFlash.style.color = color;
  comboFlash.style.opacity = "1";
  comboFlash.style.transform = "translate(-50%, -50%) scale(1)";
  comboFlash.style.transition = "none";

  setTimeout(() => {
    comboFlash.style.transition = "all 0.6s ease";
    comboFlash.style.opacity = "0";
    comboFlash.style.transform = "translate(-50%, -80%) scale(1.3)";
  }, 600);
}

function endGame() {
  clearInterval(state.wordTimer);
  state.running = false;
  wordInput.disabled = true;
  startBtn.disabled = false;

  const avgAcc = state.totalCharsTyped > 0
    ? ((state.correctCharsTotal / state.totalCharsTyped) * 100).toFixed(0)
    : 100;

  const avgWPM = state.lastWPMs.length > 0
    ? (state.lastWPMs.reduce((a,b)=>a+b,0)/state.lastWPMs.length).toFixed(0)
    : 0;

  $("finalScore").textContent = Math.round(state.score);
  $("finalStreak").textContent = state.bestStreak;
  $("finalWPM").textContent = avgWPM;
  $("finalAcc").textContent = avgAcc + "%";

  wordDisplay.classList.remove("correct-flash","wrong-flash");
  wordDisplay.className = "idle";
  wordDisplay.textContent = "// SESSION COMPLETE //";

  const sessionSummary = {
    reaction: state.reactionScore || 0,
    typing: state.typingScore || 0,
    accuracy: state.accuracyScore || 0,
    stability: state.stabilityScore || 0,
    cognitive: state.cognitiveScore || 0,
    flowReached: state.flowState
  };

  const resultType = classifySession(sessionSummary);
  document.getElementById("sessionType").textContent = resultType;

  // ✅ Update persistent brain profile
  updateBrainProfile(sessionSummary, resultType);

  // Refresh dev panel so lifetime stats update immediately
  updateDevPanel({
    reactionScore: state.reactionScore,
    typingScore: state.typingScore,
    accuracyScore: state.accuracyScore,
    stability: state.stabilityScore,
    cognitive: state.cognitiveScore
  });

  // Big burst effect
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  burst(cx, cy, "#00f5ff", 40);
  burst(cx, cy, "#ff00c8", 30);
  burst(cx, cy, "#ffe600", 20);

  setTimeout(() => gameOverlay.classList.add("show"), 400);
}

// ─── IDLE ANIMATIONS ─────────────────────────────────────────────────────────
// Subtle random particles on idle
setInterval(() => {
  if (!state.running) {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    const colors = ["#00f5ff","#ff00c8","#ffe600"];
    particles.push(new Particle(x, y, colors[Math.floor(Math.random()*3)]));
  }
}, 300);

const devPanel = document.getElementById("devPanel");


function updateDevPanel(data) {
  if (!data) return;

  document.getElementById("devReaction").textContent = data.reactionScore;
  document.getElementById("devTyping").textContent = data.typingScore;
  document.getElementById("devAccuracy").textContent = data.accuracyScore;
  document.getElementById("devStability").textContent = data.stability;
  document.getElementById("devCognitive").textContent = data.cognitive;

  document.getElementById("devFlow").textContent =
    state.flowState ? "YES" : "NO";

    document.getElementById("devSessions").textContent = brainProfile.totalSessions;
    document.getElementById("devAvgCog").textContent =
        brainProfile.averageCognitive.toFixed(1);
    document.getElementById("devPeakCog").textContent =
        brainProfile.peakCognitive;
    document.getElementById("devBestClass").textContent =
        brainProfile.bestClass;

document.getElementById("devLevel").textContent =
  brainProfile.level;

const nextThreshold = getNextLevelThreshold(brainProfile.level);
document.getElementById("devNextLevel").textContent =
  nextThreshold;

const currentThreshold = getCurrentLevelThreshold(brainProfile.level);
const progress =
  ((brainProfile.averageCognitive - currentThreshold) /
   (nextThreshold - currentThreshold)) * 100;

document.getElementById("devProgress").textContent =
  Math.min(100, progress).toFixed(0) + "%";
}


document.addEventListener("keydown", (e) => {
  // Only toggle on Ctrl + D (or Cmd + D on Mac)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
    e.preventDefault(); // prevents browser bookmark shortcut

    devPanel.style.display =
      devPanel.style.display === "none" ? "block" : "none";
  }
});



function getTrend(arr) {
  if (arr.length < 5) return 0;

  const firstHalf = arr.slice(0, Math.floor(arr.length / 2));
  const secondHalf = arr.slice(Math.floor(arr.length / 2));

  const avg1 = average(firstHalf);
  const avg2 = average(secondHalf);

  return avg2 - avg1; // positive = rising, negative = dropping
}

function classifySession(summary) {
  if (summary.cognitive >= 80 && summary.flowReached) {
    return "Cognitive Peak";
  }

  if (summary.accuracy === 100 && summary.stability > 70) {
    return "Precision Operator";
  }

  if (summary.typing > 70 && summary.stability < 40) {
    return "Erratic Reactor";
  }

  if (summary.reaction < 30 && summary.stability < 40) {
    return "Fatigued State";
  }

  return "Focused Performer";
}
function updateBrainProfile(sessionSummary, classResult) {
  brainProfile.totalSessions++;

brainProfile.averageCognitive =
  ((brainProfile.averageCognitive * (brainProfile.totalSessions - 1)) +
    sessionSummary.cognitive) /
  brainProfile.totalSessions;

// Update level
const previousLevel = brainProfile.level;
brainProfile.level = getCognitiveLevel(brainProfile.averageCognitive);
if (brainProfile.level > previousLevel) {
  showLevelUp(brainProfile.level);
}
  // Peak update
  if (sessionSummary.cognitive > brainProfile.peakCognitive) {
    brainProfile.peakCognitive = sessionSummary.cognitive;
  }

  // Ranking map MUST match classifySession()
  const classRank = {
    "Fatigued State": 1,
    "Erratic Reactor": 2,
    "Focused Performer": 3,
    "Precision Operator": 4,
    "Cognitive Peak": 5
  };

  // Initialize if first real session
  if (brainProfile.bestClass === "Unranked") {
    brainProfile.bestClass = classResult;
  } else if (classRank[classResult] > classRank[brainProfile.bestClass]) {
    brainProfile.bestClass = classResult;
  }

  localStorage.setItem("brainProfile", JSON.stringify(brainProfile));
}

function getCognitiveLevel(avgScore) {
  if (avgScore < 30) return 1;
  if (avgScore < 40) return 2;
  if (avgScore < 50) return 3;
  if (avgScore < 60) return 4;
  if (avgScore < 70) return 5;
  if (avgScore < 80) return 6;
  if (avgScore < 90) return 7;
  return 8;
}

function getNextLevelThreshold(level) {
  const thresholds = {
    1: 30,
    2: 40,
    3: 50,
    4: 60,
    5: 70,
    6: 80,
    7: 90,
    8: 100
  };

  return thresholds[level] || 100;
}

function getCurrentLevelThreshold(level) {
  const thresholds = {
    1: 0,
    2: 30,
    3: 40,
    4: 50,
    5: 60,
    6: 70,
    7: 80,
    8: 90
  };

  return thresholds[level] || 0;
}

function showLevelUp(level) {
  levelUpSound.currentTime = 0;
  levelUpSound.play();

  const el = document.createElement("div");
  el.textContent = "LEVEL UP → " + level;
  el.className = "level-up-popup";
  document.body.appendChild(el);

  setTimeout(() => el.remove(), 2000);
}

function getDifficultySettings(level) {
  if (level <= 2) {
    return { wordLength: 4, timeLimit: 3000 };
  }
  if (level <= 4) {
    return { wordLength: 5, timeLimit: 2600 };
  }
  if (level <= 6) {
    return { wordLength: 6, timeLimit: 2200 };
  }
  if (level <= 7) {
    return { wordLength: 7, timeLimit: 1800 };
  }
  return { wordLength: 8, timeLimit: 1500 };
}


function drawCognitiveGraph() {
  cogCanvas.width = cogCanvas.offsetWidth;
  cogCanvas.height = cogCanvas.offsetHeight;
  const ctx = cogCtx;
  const width = cogCanvas.width;
  const height = cogCanvas.height;

  ctx.clearRect(0, 0, width, height);

  if (cognitiveHistory.length < 2) return;

  // Draw grid line (middle 50%)
  ctx.strokeStyle = "rgba(0,245,255,0.2)";
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  // Draw line
  ctx.strokeStyle = "#00f5ff";
  ctx.lineWidth = 2;
  ctx.beginPath();

  cognitiveHistory.forEach((value, index) => {
    const x = (index / (cognitiveHistory.length - 1)) * width;
    const y = height - (value / 100) * height;

    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}

exportBtn.addEventListener("click", () => {
  const data = {
    cognitive: state.cognitiveScore,
    reaction: state.reactionScore,
    typing: state.typingScore,
    accuracy: state.accuracyScore,
    stability: state.stabilityScore,
    level: brainProfile.level,
    date: new Date().toLocaleString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "session-summary.json";
  a.click();

  URL.revokeObjectURL(url);
});