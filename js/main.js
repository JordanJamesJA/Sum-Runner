/* 
   Sum Runner - Game Logic
   Modern JavaScript Implementation
    */

// Game Configuration Constants
const CONFIG = {
  INITIAL_TIME: 8000, // 8 seconds per question initially
  MIN_TIME: 3000, // Minimum time per question (3 seconds)
  TIME_DECREASE: 200, // Time decrease per level (200ms)
  POINTS_BASE: 100, // Base points per correct answer
  POINTS_SPEED_BONUS: 50, // Speed bonus points
  COMBO_MULTIPLIER: 1.2, // Combo multiplier
  COMBO_THRESHOLD: 3, // Consecutive correct answers for combo
  MAX_HIGH_SCORES: 5, // Maximum high scores to store
  DIFFICULTY_INCREASE: 5, // Questions per difficulty increase
  MAX_DIFFICULTY: 10, // Maximum difficulty level
  SOUND_ENABLED: true, // Default sound setting
  THEME: "light", // Default theme
  ACCESSIBILITY: {
    HIGH_CONTRAST: false,
    LARGE_TEXT: false,
  },
};

// Game State Management
class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.level = 1;
    this.streak = 0;
    this.maxStreak = 0;
    this.correctAnswers = 0;
    this.totalAnswers = 0;
    this.currentQuestion = null;
    this.timeRemaining = CONFIG.INITIAL_TIME;
    this.gameMode = "endless";
    this.operations = ["add", "sub"];
    this.difficulty = 1;
    this.isGameActive = false;
    this.isPaused = false;
    this.startTime = null;
    this.timer = null;
    this.customSettings = {
      operations: ["add", "sub"],
      difficulty: 1,
      timeLimit: 8,
    };
  }

  calculateAccuracy() {
    return this.totalAnswers > 0
      ? Math.round((this.correctAnswers / this.totalAnswers) * 100)
      : 0;
  }

  getTimeBonus() {
    const timeRatio = this.timeRemaining / this.getCurrentTimeLimit();
    return Math.floor(CONFIG.POINTS_SPEED_BONUS * timeRatio);
  }

  getCurrentTimeLimit() {
    const baseTime =
      this.gameMode === "custom"
        ? this.customSettings.timeLimit * 1000
        : CONFIG.INITIAL_TIME;
    return Math.max(
      CONFIG.MIN_TIME,
      baseTime - (this.level - 1) * CONFIG.TIME_DECREASE
    );
  }

  addScore(points) {
    this.score += points;
    this.updateDisplay();
  }

  updateDisplay() {
    const elements = {
      score: document.getElementById("current-score"),
      streak: document.getElementById("current-streak"),
      level: document.getElementById("current-level"),
    };

    if (elements.score)
      elements.score.textContent = this.score.toLocaleString();
    if (elements.streak) elements.streak.textContent = this.streak;
    if (elements.level) elements.level.textContent = this.level;
  }
}

// Math Problem Generator
class MathGenerator {
  static generateProblem(operations, difficulty) {
    const operation = operations[Math.floor(Math.random() * operations.length)];
    return this.generateByOperation(operation, difficulty);
  }

  static generateByOperation(operation, difficulty) {
    const range = this.getDifficultyRange(difficulty);
    let num1, num2, answer, question;

    switch (operation) {
      case "add":
        num1 = this.randomInt(range.min, range.max);
        num2 = this.randomInt(range.min, range.max);
        answer = num1 + num2;
        question = `${num1} + ${num2}`;
        break;

      case "sub":
        num1 = this.randomInt(range.min, range.max);
        num2 = this.randomInt(range.min, Math.min(num1, range.max));
        answer = num1 - num2;
        question = `${num1} − ${num2}`;
        break;

      case "multi":
        num1 = this.randomInt(range.min, Math.min(range.max, 12));
        num2 = this.randomInt(range.min, Math.min(range.max, 12));
        answer = num1 * num2;
        question = `${num1} × ${num2}`;
        break;

      case "div":
        // Generate division that results in whole numbers
        num2 = this.randomInt(range.min, Math.min(range.max, 12));
        answer = this.randomInt(range.min, Math.min(range.max, 20));
        num1 = num2 * answer;
        question = `${num1} ÷ ${num2}`;
        break;

      default:
        return this.generateByOperation("add", difficulty);
    }

    return {
      question,
      answer,
      operation,
      choices: this.generateChoices(answer, difficulty),
    };
  }

  static getDifficultyRange(difficulty) {
    const ranges = {
      1: { min: 1, max: 10 },
      2: { min: 1, max: 25 },
      3: { min: 1, max: 50 },
      4: { min: 1, max: 100 },
      5: { min: 10, max: 200 },
      6: { min: 25, max: 500 },
      7: { min: 50, max: 1000 },
      8: { min: 100, max: 2000 },
      9: { min: 200, max: 5000 },
      10: { min: 500, max: 10000 },
    };
    return ranges[Math.min(difficulty, 10)] || ranges[1];
  }

  static generateChoices(correctAnswer, difficulty) {
    const choices = [correctAnswer];
    const variance = Math.max(1, Math.floor(correctAnswer * 0.3));

    while (choices.length < 4) {
      let wrongAnswer;
      if (Math.random() < 0.5) {
        // Generate close wrong answers
        wrongAnswer = correctAnswer + this.randomInt(-variance, variance);
      } else {
        // Generate more distant wrong answers
        wrongAnswer =
          correctAnswer + this.randomInt(-variance * 2, variance * 2);
      }

      if (
        wrongAnswer !== correctAnswer &&
        wrongAnswer > 0 &&
        !choices.includes(wrongAnswer)
      ) {
        choices.push(wrongAnswer);
      }
    }

    return this.shuffleArray(choices);
  }

  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Sound Manager
class SoundManager {
  constructor() {
    this.enabled = this.loadSetting("soundEnabled", CONFIG.SOUND_ENABLED);
    this.audioContext = null;
    this.initAudioContext();
  }

  initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
    } catch (error) {
      console.warn("Audio context not supported:", error);
    }
  }

  playSound(type) {
    if (!this.enabled || !this.audioContext) return;

    const frequencies = {
      correct: [523.25, 659.25, 783.99], // C5, E5, G5 chord
      incorrect: [220, 185, 147], // A3, F#3, D3 chord
      countdown: [440], // A4
      gameOver: [261.63, 220, 196, 174.61], // C4, A3, G3, F3 descending
      newRecord: [523.25, 587.33, 659.25, 698.46, 783.99], // C5 major scale
    };

    const freq = frequencies[type] || [440];
    this.playTone(freq, type === "gameOver" ? 0.8 : 0.3);
  }

  playTone(frequencies, duration) {
    if (!this.audioContext) return;

    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        0.1,
        this.audioContext.currentTime + 0.01
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext.currentTime + duration
      );

      oscillator.start(this.audioContext.currentTime + index * 0.1);
      oscillator.stop(this.audioContext.currentTime + duration + index * 0.1);
    });
  }

  toggle() {
    this.enabled = !this.enabled;
    this.saveSetting("soundEnabled", this.enabled);
    return this.enabled;
  }

  loadSetting(key, defaultValue) {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  saveSetting(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Failed to save setting:", error);
    }
  }
}

// High Score Manager
class HighScoreManager {
  constructor() {
    this.scores = this.loadScores();
  }

  loadScores() {
    try {
      const saved = localStorage.getItem("sumRunnerHighScores");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  saveScores() {
    try {
      localStorage.setItem("sumRunnerHighScores", JSON.stringify(this.scores));
    } catch (error) {
      console.warn("Failed to save high scores:", error);
    }
  }

  addScore(score, accuracy, time, maxStreak) {
    const newScore = {
      score,
      accuracy,
      time,
      maxStreak,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
    };

    this.scores.push(newScore);
    this.scores.sort((a, b) => b.score - a.score);
    this.scores = this.scores.slice(0, CONFIG.MAX_HIGH_SCORES);
    this.saveScores();

    return this.scores[0].timestamp === newScore.timestamp;
  }

  getScores() {
    return [...this.scores];
  }

  clearScores() {
    this.scores = [];
    this.saveScores();
  }

  isHighScore(score) {
    return (
      this.scores.length < CONFIG.MAX_HIGH_SCORES ||
      score > this.scores[this.scores.length - 1].score
    );
  }
}

// Theme Manager
class ThemeManager {
  constructor() {
    this.currentTheme = this.loadSetting("theme", CONFIG.THEME);
    this.highContrast = this.loadSetting(
      "highContrast",
      CONFIG.ACCESSIBILITY.HIGH_CONTRAST
    );
    this.largeText = this.loadSetting(
      "largeText",
      CONFIG.ACCESSIBILITY.LARGE_TEXT
    );
    this.applyTheme();
  }

  applyTheme() {
    document.documentElement.setAttribute("data-theme", this.currentTheme);
    document.documentElement.setAttribute(
      "data-contrast",
      this.highContrast ? "high" : "normal"
    );
    document.documentElement.setAttribute(
      "data-large-text",
      this.largeText.toString()
    );
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === "light" ? "dark" : "light";
    this.saveSetting("theme", this.currentTheme);
    this.applyTheme();
    return this.currentTheme;
  }

  toggleHighContrast() {
    this.highContrast = !this.highContrast;
    this.saveSetting("highContrast", this.highContrast);
    this.applyTheme();
    return this.highContrast;
  }

  toggleLargeText() {
    this.largeText = !this.largeText;
    this.saveSetting("largeText", this.largeText);
    this.applyTheme();
    return this.largeText;
  }

  loadSetting(key, defaultValue) {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  saveSetting(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Failed to save setting:", error);
    }
  }
}

// Animation Manager
class AnimationManager {
  static showFloatingPoints(points, element) {
    const rect = element.getBoundingClientRect();
    const floatingEl = document.createElement("div");
    floatingEl.className = "floating-point";
    floatingEl.textContent = `+${points}`;
    floatingEl.style.left = `${rect.left + rect.width / 2}px`;
    floatingEl.style.top = `${rect.top}px`;

    document.getElementById("floating-animations").appendChild(floatingEl);

    setTimeout(() => {
      if (floatingEl.parentNode) {
        floatingEl.parentNode.removeChild(floatingEl);
      }
    }, 800);
  }

  static showFeedback(text, isCorrect) {
    const feedbackArea = document.getElementById("feedback-area");
    const feedbackText = document.getElementById("feedback-text");

    feedbackText.textContent = text;
    feedbackText.className = `feedback-text ${
      isCorrect ? "correct" : "incorrect"
    }`;

    feedbackArea.classList.remove("hidden");

    setTimeout(() => {
      feedbackArea.classList.add("hidden");
    }, 800);
  }

  static updateTimerBar(percentage) {
    const timerFill = document.getElementById("timer-fill");
    if (timerFill) {
      timerFill.style.width = `${percentage}%`;
    }
  }
}

// Screen Manager
class ScreenManager {
  static showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active");
      screen.classList.add("hidden");
    });

    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.remove("hidden");
      setTimeout(() => {
        targetScreen.classList.add("active");
      }, 50);
    }
  }

  static setupBackButtons() {
    document.querySelectorAll(".back-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const targetScreen = btn.getAttribute("data-back");
        if (targetScreen) {
          this.showScreen(targetScreen);
        }
      });
    });
  }
}

// Main Game Controller
class SumRunnerGame {
  constructor() {
    this.gameState = new GameState();
    this.soundManager = new SoundManager();
    this.highScoreManager = new HighScoreManager();
    this.themeManager = new ThemeManager();

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupKeyboardControls();
    ScreenManager.setupBackButtons();

    // Show loading screen briefly, then start screen
    setTimeout(() => {
      ScreenManager.showScreen("start-screen");
    }, 1500);

    // Load and display high scores
    this.updateHighScoresDisplay();
  }

  setupEventListeners() {
    // Main menu buttons
    document.getElementById("play-btn")?.addEventListener("click", () => {
      ScreenManager.showScreen("game-mode-screen");
    });

    document
      .getElementById("how-to-play-btn")
      ?.addEventListener("click", () => {
        ScreenManager.showScreen("how-to-play-screen");
      });

    document
      .getElementById("high-scores-btn")
      ?.addEventListener("click", () => {
        ScreenManager.showScreen("high-scores-screen");
      });

    document.getElementById("settings-btn")?.addEventListener("click", () => {
      ScreenManager.showScreen("settings-screen");
    });

    // Game mode buttons
    document
      .getElementById("endless-mode-btn")
      ?.addEventListener("click", () => {
        this.startGame("endless");
      });

    document
      .getElementById("time-attack-btn")
      ?.addEventListener("click", () => {
        this.startGame("timeAttack");
      });

    document
      .getElementById("custom-mode-btn")
      ?.addEventListener("click", () => {
        ScreenManager.showScreen("custom-settings-screen");
      });

    document
      .getElementById("start-custom-game-btn")
      ?.addEventListener("click", () => {
        this.applyCustomSettings();
        this.startGame("custom");
      });

    // Game control buttons
    document.getElementById("pause-btn")?.addEventListener("click", () => {
      this.pauseGame();
    });

    document.getElementById("resume-btn")?.addEventListener("click", () => {
      this.resumeGame();
    });

    document.getElementById("quit-btn")?.addEventListener("click", () => {
      this.endGame();
    });

    // End screen buttons
    document.getElementById("play-again-btn")?.addEventListener("click", () => {
      this.startGame(this.gameState.gameMode);
    });

    document.getElementById("main-menu-btn")?.addEventListener("click", () => {
      ScreenManager.showScreen("start-screen");
    });

    // Settings buttons
    this.setupSettingsListeners();

    // High scores
    document
      .getElementById("clear-scores-btn")
      ?.addEventListener("click", () => {
        if (confirm("Are you sure you want to clear all high scores?")) {
          this.highScoreManager.clearScores();
          this.updateHighScoresDisplay();
        }
      });
  }

  setupSettingsListeners() {
    document.getElementById("theme-toggle")?.addEventListener("click", (e) => {
      const newTheme = this.themeManager.toggleTheme();
      e.target.querySelector(".toggle-text").textContent =
        newTheme === "light" ? "Light" : "Dark";
      e.target.classList.toggle("active");
    });

    document.getElementById("sound-toggle")?.addEventListener("click", (e) => {
      const soundEnabled = this.soundManager.toggle();
      e.target.querySelector(".toggle-text").textContent = soundEnabled
        ? "On"
        : "Off";
      e.target.classList.toggle("active", soundEnabled);
    });

    document
      .getElementById("accessibility-toggle")
      ?.addEventListener("click", (e) => {
        const highContrast = this.themeManager.toggleHighContrast();
        e.target.querySelector(".toggle-text").textContent = highContrast
          ? "On"
          : "Off";
        e.target.classList.toggle("active", highContrast);
      });

    document
      .getElementById("large-text-toggle")
      ?.addEventListener("click", (e) => {
        const largeText = this.themeManager.toggleLargeText();
        e.target.querySelector(".toggle-text").textContent = largeText
          ? "On"
          : "Off";
        e.target.classList.toggle("active", largeText);
      });
  }

  setupKeyboardControls() {
    document.addEventListener("keydown", (e) => {
      if (!this.gameState.isGameActive || this.gameState.isPaused) return;

      // Number keys 1-4 for answer selection
      if (e.key >= "1" && e.key <= "4") {
        e.preventDefault();
        const answerButtons = document.querySelectorAll(".answer-btn");
        const buttonIndex = parseInt(e.key) - 1;
        if (answerButtons[buttonIndex]) {
          answerButtons[buttonIndex].click();
        }
      }

      // Space bar for pause
      if (e.key === " ") {
        e.preventDefault();
        this.pauseGame();
      }

      // Escape key for quit
      if (e.key === "Escape") {
        e.preventDefault();
        if (this.gameState.isGameActive) {
          this.pauseGame();
        }
      }
    });
  }

  applyCustomSettings() {
    const operations = [];
    if (document.getElementById("addition-toggle")?.checked)
      operations.push("add");
    if (document.getElementById("subtraction-toggle")?.checked)
      operations.push("sub");
    if (document.getElementById("multiplication-toggle")?.checked)
      operations.push("multi");
    if (document.getElementById("division-toggle")?.checked)
      operations.push("div");

    const difficulty =
      parseInt(document.getElementById("difficulty-slider")?.value) || 1;
    const timeLimit =
      parseInt(document.getElementById("time-limit-slider")?.value) || 8;

    this.gameState.customSettings = {
      operations: operations.length > 0 ? operations : ["add"],
      difficulty,
      timeLimit,
    };
  }

  startGame(mode) {
    this.gameState.reset();
    this.gameState.gameMode = mode;
    this.gameState.isGameActive = true;
    this.gameState.startTime = Date.now();

    if (mode === "custom") {
      this.gameState.operations = this.gameState.customSettings.operations;
      this.gameState.difficulty = this.gameState.customSettings.difficulty;
    }

    this.showCountdown();
  }

  showCountdown() {
    ScreenManager.showScreen("countdown-screen");
    let count = 3;

    const countdownElement = document.getElementById("countdown-number");
    const updateCountdown = () => {
      if (count > 0) {
        countdownElement.textContent = count;
        this.soundManager.playSound("countdown");
        count--;
        setTimeout(updateCountdown, 1000);
      } else {
        countdownElement.textContent = "GO!";
        this.soundManager.playSound("countdown");
        setTimeout(() => {
          ScreenManager.showScreen("game-screen");
          this.nextQuestion();
        }, 500);
      }
    };

    updateCountdown();
  }

  nextQuestion() {
    if (!this.gameState.isGameActive) return;

    // Increase difficulty every few questions
    if (
      this.gameState.totalAnswers > 0 &&
      this.gameState.totalAnswers % CONFIG.DIFFICULTY_INCREASE === 0
    ) {
      this.gameState.difficulty = Math.min(
        this.gameState.difficulty + 1,
        CONFIG.MAX_DIFFICULTY
      );
    }

    // Generate new question
    this.gameState.currentQuestion = MathGenerator.generateProblem(
      this.gameState.operations,
      this.gameState.difficulty
    );

    this.displayQuestion();
    this.startQuestionTimer();
  }

  displayQuestion() {
    const questionText = document.getElementById("question-text");
    const answerButtons = document.getElementById("answer-buttons");

    if (questionText) {
      questionText.textContent = `${this.gameState.currentQuestion.question} = ?`;
    }

    if (answerButtons) {
      answerButtons.innerHTML = "";
      this.gameState.currentQuestion.choices.forEach((choice, index) => {
        const button = document.createElement("button");
        button.className = "answer-btn";
        button.textContent = choice;
        button.setAttribute("data-answer", choice);
        button.addEventListener("click", () =>
          this.handleAnswer(choice, button)
        );
        answerButtons.appendChild(button);
      });
    }
  }

  startQuestionTimer() {
    this.gameState.timeRemaining = this.gameState.getCurrentTimeLimit();

    this.gameState.timer = setInterval(() => {
      this.gameState.timeRemaining -= 100;

      const percentage =
        (this.gameState.timeRemaining / this.gameState.getCurrentTimeLimit()) *
        100;
      AnimationManager.updateTimerBar(Math.max(0, percentage));

      if (this.gameState.timeRemaining <= 0) {
        this.handleAnswer(null, null); // Time's up
      }
    }, 100);
  }

  handleAnswer(selectedAnswer, buttonElement) {
    if (!this.gameState.isGameActive || this.gameState.isPaused) return;

    clearInterval(this.gameState.timer);
    this.gameState.totalAnswers++;

    const correctAnswer = this.gameState.currentQuestion.answer;
    const isCorrect = selectedAnswer === correctAnswer;

    // Update answer buttons visual state
    document.querySelectorAll(".answer-btn").forEach((btn) => {
      const answer = parseInt(btn.getAttribute("data-answer"));
      if (answer === correctAnswer) {
        btn.classList.add("correct");
      } else if (btn === buttonElement && !isCorrect) {
        btn.classList.add("incorrect");
      }
      btn.disabled = true;
    });

    if (isCorrect) {
      this.handleCorrectAnswer(buttonElement);
    } else {
      this.handleIncorrectAnswer();
    }

    // Move to next question after a delay
    setTimeout(() => {
      if (this.gameState.isGameActive) {
        this.gameState.level++;
        this.nextQuestion();
      }
    }, 1500);
  }

  handleCorrectAnswer(buttonElement) {
    this.gameState.correctAnswers++;
    this.gameState.streak++;
    this.gameState.maxStreak = Math.max(
      this.gameState.maxStreak,
      this.gameState.streak
    );

    // Calculate points
    let points = CONFIG.POINTS_BASE;
    points += this.gameState.getTimeBonus();

    // Apply combo multiplier
    if (this.gameState.streak >= CONFIG.COMBO_THRESHOLD) {
      points = Math.floor(points * CONFIG.COMBO_MULTIPLIER);
    }

    this.gameState.addScore(points);

    // Show feedback and animations
    const feedbackText =
      this.gameState.streak >= CONFIG.COMBO_THRESHOLD
        ? `Correct! +${points} (Combo x${this.gameState.streak}!)`
        : `Correct! +${points}`;

    AnimationManager.showFeedback(feedbackText, true);

    if (buttonElement) {
      AnimationManager.showFloatingPoints(points, buttonElement);
    }

    this.soundManager.playSound("correct");
  }

  handleIncorrectAnswer() {
    this.gameState.streak = 0;

    AnimationManager.showFeedback("Incorrect!", false);
    this.soundManager.playSound("incorrect");

    // In time attack mode, wrong answers end the game
    if (this.gameState.gameMode === "timeAttack") {
      setTimeout(() => this.endGame(), 1000);
    }
  }

  pauseGame() {
    if (!this.gameState.isGameActive || this.gameState.isPaused) return;

    this.gameState.isPaused = true;
    clearInterval(this.gameState.timer);

    // Update pause screen stats
    document.getElementById("pause-score").textContent =
      this.gameState.score.toLocaleString();
    document.getElementById("pause-streak").textContent = this.gameState.streak;
    document.getElementById(
      "pause-accuracy"
    ).textContent = `${this.gameState.calculateAccuracy()}%`;

    ScreenManager.showScreen("pause-screen");
  }

  resumeGame() {
    if (!this.gameState.isGameActive || !this.gameState.isPaused) return;

    this.gameState.isPaused = false;
    ScreenManager.showScreen("game-screen");
    this.startQuestionTimer();
  }

  endGame() {
    this.gameState.isGameActive = false;
    this.gameState.isPaused = false;
    clearInterval(this.gameState.timer);

    const finalTime = Math.floor(
      (Date.now() - this.gameState.startTime) / 1000
    );
    const isNewHighScore = this.highScoreManager.addScore(
      this.gameState.score,
      this.gameState.calculateAccuracy(),
      finalTime,
      this.gameState.maxStreak
    );

    this.displayEndScreen(finalTime, isNewHighScore);
    this.updateHighScoresDisplay();

    if (isNewHighScore) {
      this.soundManager.playSound("newRecord");
    } else {
      this.soundManager.playSound("gameOver");
    }
  }

  displayEndScreen(finalTime, isNewHighScore) {
    // Update end screen statistics
    document.getElementById("final-score").textContent =
      this.gameState.score.toLocaleString();
    document.getElementById(
      "final-accuracy"
    ).textContent = `${this.gameState.calculateAccuracy()}%`;
    document.getElementById("final-time").textContent = `${finalTime}s`;
    document.getElementById("max-streak").textContent =
      this.gameState.maxStreak;

    // Show new high score message
    const newHighScoreEl = document.getElementById("new-high-score");
    if (isNewHighScore && newHighScoreEl) {
      newHighScoreEl.classList.remove("hidden");
    } else if (newHighScoreEl) {
      newHighScoreEl.classList.add("hidden");
    }

    ScreenManager.showScreen("end-screen");
  }

  updateHighScoresDisplay() {
    const highScoresList = document.getElementById("high-scores-list");
    if (!highScoresList) return;

    const scores = this.highScoreManager.getScores();

    if (scores.length === 0) {
      highScoresList.innerHTML =
        '<div class="no-scores">No high scores yet. Play your first game!</div>';
      return;
    }

    highScoresList.innerHTML = scores
      .map(
        (score, index) => `
      <div class="score-item ${index === 0 ? "personal-best" : ""}">
        <div class="score-rank">#${index + 1}</div>
        <div class="score-details">
          <div class="score-points">${score.score.toLocaleString()} points</div>
          <div class="score-meta">
            ${score.accuracy}% accuracy • ${score.time}s • Streak: ${
          score.maxStreak
        } • ${score.date}
          </div>
        </div>
      </div>
    `
      )
      .join("");
  }
}

// Service Worker Registration for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .then((registration) => {
        console.log("Service Worker registered: ", registration);
      })
      .catch((registrationError) => {
        console.log("Service Worker registration failed: ", registrationError);
      });
  });
}

// Initialize the game when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.sumRunnerGame = new SumRunnerGame();
});

// Handle visibility change for pause functionality
document.addEventListener("visibilitychange", () => {
  if (
    window.sumRunnerGame &&
    window.sumRunnerGame.gameState.isGameActive &&
    !window.sumRunnerGame.gameState.isPaused &&
    document.visibilityState === "hidden"
  ) {
    window.sumRunnerGame.pauseGame();
  }
});

// Export for debugging (development only)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GameState,
    MathGenerator,
    SoundManager,
    HighScoreManager,
    ThemeManager,
    AnimationManager,
    ScreenManager,
    SumRunnerGame,
  };
}
