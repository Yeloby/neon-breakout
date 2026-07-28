import { addLeaderboardEntry, applyPowerUp, bounceOffWalls, calculateBrickScore, capBallVelocity, collideWithPaddle, getBrickCrackLines, getBrickHealth, getLaunchVelocityFromPointer, getLevelLayout, getMultiballVelocities, pickWeightedPowerUp, qualifiesForLeaderboard, resolveBrickCollision, setBallSpeed } from './breakoutGameLogic.js';
import { getDefaultLanguage, translate } from './translations.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const startForm = document.getElementById('startForm');
const gameShell = document.getElementById('gameShell');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const statusEl = document.getElementById('status');
const restartButton = document.getElementById('restartButton');
const fullscreenButton = document.getElementById('fullscreenButton');
const highScoreEl = document.getElementById('highScore');
const leaderboardEl = document.getElementById('leaderboard');
const menuButton = document.getElementById('menuButton');
const menuDialog = document.getElementById('menuDialog');
const closeMenuButton = document.getElementById('closeMenuButton');
const difficultySelect = document.getElementById('difficultySelect');
const soundToggle = document.getElementById('soundToggle');
const effectsToggle = document.getElementById('effectsToggle');
const languageSelect = document.getElementById('languageSelect');
const menuLeaderboardEl = document.getElementById('menuLeaderboard');
const highScoreDialog = document.getElementById('highScoreDialog');
const highScoreForm = document.getElementById('highScoreForm');
const highScorePlayerNameInput = document.getElementById('highScorePlayerName');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PADDLE_HEIGHT = 14;
const PADDLE_Y = HEIGHT - 36;
const BALL_RADIUS = 7;
const MAX_PADDLE_WIDTH = 160;
const POWER_UP_RADIUS = 18;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_WIDTH = 46;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 8;
const DIFFICULTIES = {
  easy: { paddleWidth: 88, launchSpeed: 4.2, maxSpeed: 4.9, scoreMultiplier: 0.8, boosterChance: 0.38 },
  normal: { paddleWidth: 72, launchSpeed: 5.2, maxSpeed: 6.1, scoreMultiplier: 1, boosterChance: 0.32 },
  hard: { paddleWidth: 60, launchSpeed: 6.3, maxSpeed: 7.5, scoreMultiplier: 1.4, boosterChance: 0.26 }
};
const SPEED_EFFECT_DURATIONS = {
  turtle: 240,
  feather: 360,
  turbo: 300
};
const settings = loadSettings();
const t = (key, values) => translate(settings.language, key, values);

let score = 0;
let level = 1;
let lives = 3;
let gameActive = true;
let animationFrameId = null;
let keys = { left: false, right: false };
let gamepadAxis = 0;
let previousGamepadButtons = [];
let highScore = Number(localStorage.getItem('neon-breakout-high-score') || 0);
const storedHighScoreName = localStorage.getItem('neon-breakout-high-score-name') || '';
let highScoreName = !storedHighScoreName || storedHighScoreName === 'ANON'
  ? t('defaultPlayerName')
  : storedHighScoreName;
let audioContext = null;
let ballLaunched = false;
let pointerAim = null;
let combo = 0;
let comboTimer = 0;
let scoreMultiplier = 1;
let multiplierTimer = 0;
let lightningTimer = 0;
let catchCharges = 0;
let piercingHits = 0;
let shieldCharges = 0;
let speedEffect = null;
let speedEffectTimer = 0;
let gamePaused = false;
let paddlePulse = 0;
let ballPulse = 0;
let leaderboard = loadLeaderboard();
const storedPlayerName = localStorage.getItem('neon-breakout-player-name') || '';
const legacyDefaultNames = new Set(['anon', 'johan', 'johan slåttavik']);
let activePlayerName = legacyDefaultNames.has(storedPlayerName.trim().toLowerCase())
  ? ''
  : storedPlayerName;
let currentStatus = { key: null, values: {} };
let boosterHudMessages = [];
let boosterCelebration = null;
let pendingScoreEntry = null;

const paddle = {
  x: WIDTH / 2 - DIFFICULTIES[settings.difficulty].paddleWidth / 2,
  y: PADDLE_Y,
  width: DIFFICULTIES[settings.difficulty].paddleWidth,
  height: PADDLE_HEIGHT
};
const ball = { x: WIDTH / 2, y: HEIGHT / 2, radius: BALL_RADIUS, vx: 4, vy: -4 };
const extraBalls = [];
const bricks = [];
const particles = [];
const powerUps = [];
const floatingTexts = [];
const shockwaves = [];
const ballTrail = [];
const stars = Array.from({ length: 90 }, () => ({
  x: Math.random() * WIDTH,
  y: Math.random() * HEIGHT,
  size: Math.random() * 2 + 0.5,
  alpha: Math.random() * 0.7 + 0.3,
  twinkle: Math.random() * 0.02 + 0.01
}));

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem('neon-breakout-settings') || '{}');
    return {
      difficulty: DIFFICULTIES[stored.difficulty] ? stored.difficulty : 'normal',
      language: stored.language === 'no' || stored.language === 'en'
        ? stored.language
        : getDefaultLanguage(navigator.language),
      sound: stored.sound !== false,
      effects: stored.effects !== false
    };
  } catch {
    return {
      difficulty: 'normal',
      language: getDefaultLanguage(navigator.language),
      sound: true,
      effects: true
    };
  }
}

function saveSettings() {
  try {
    localStorage.setItem('neon-breakout-settings', JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Could not save game settings:', error);
    return false;
  }
}

function setStatus(key = null, values = {}) {
  currentStatus = { key, values };
  statusEl.textContent = key ? t(key, values) : '';
}

function applyTranslations() {
  document.documentElement.lang = settings.language;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
  });
  if (currentStatus.key) statusEl.textContent = t(currentStatus.key, currentStatus.values);
  if (fullscreenButton) updateFullscreenButton();
  renderLeaderboard();
}

function playTone(frequency, duration, type = 'sine') {
  if (!settings.sound) return;
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.025;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
  oscillator.stop(audioContext.currentTime + duration);
}

function randomColor() {
  const palette = ['#20dff5', '#ff3b91', '#ff5364', '#9b63f6', '#ffc928'];
  return palette[Math.floor(Math.random() * palette.length)];
}

function saveLeaderboard() {
  localStorage.setItem('neon-breakout-leaderboard', JSON.stringify(leaderboard));
}

function loadLeaderboard() {
  try {
    const stored = JSON.parse(localStorage.getItem('neon-breakout-leaderboard') || '[]');
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((entry) => entry && typeof entry.name === 'string' && Number.isFinite(entry.score))
      .map((entry, index) => ({
        id: typeof entry.id === 'string' ? entry.id : `legacy-${index}-${entry.score}`,
        name: entry.name.slice(0, 12),
        score: entry.score,
        difficulty: DIFFICULTIES[entry.difficulty] ? entry.difficulty : 'unknown'
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch {
    return [];
  }
}

function renderLeaderboard() {
  renderLeaderboardInto(leaderboardEl, 3);
  renderLeaderboardInto(menuLeaderboardEl, 10);
}

function renderLeaderboardInto(target, limit) {
  if (!target) return;
  target.replaceChildren();
  if (leaderboard.length === 0) {
    const emptyEntry = document.createElement('li');
    emptyEntry.textContent = t('noScore');
    target.append(emptyEntry);
    return;
  }

  leaderboard.slice(0, limit).forEach((entry, index) => {
    const item = document.createElement('li');
    const rank = document.createElement('span');
    const name = document.createElement('strong');
    const difficulty = document.createElement('span');
    const entryScore = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = `#${index + 1}`;
    name.textContent = entry.name;
    difficulty.className = 'difficulty';
    difficulty.textContent = t(entry.difficulty);
    entryScore.textContent = String(entry.score);
    item.append(rank, name, difficulty, entryScore);
    target.append(item);
  });
}

function spawnParticles(x, y, color) {
  if (!settings.effects) return;
  for (let i = 0; i < 14; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 3.8,
      vy: (Math.random() - 0.5) * 3.8,
      life: 30,
      maxLife: 30,
      color
    });
  }
}

function spawnImpactFeedback(x, y, text, color, emoji = false, duration = 42) {
  if (!settings.effects) return;
  floatingTexts.push({ x, y, text, color, emoji, life: duration, maxLife: duration });
  shockwaves.push({ x, y, radius: 4, life: 24, maxLife: 24, color });
}

function celebrateLevel() {
  if (!settings.effects) return;
  const colors = ['#22d3ee', '#f472b6', '#facc15', '#a78bfa', '#34d399'];
  for (let i = 0; i < 90; i += 1) {
    const color = colors[i % colors.length];
    particles.push({
      x: Math.random() * WIDTH,
      y: -10 - Math.random() * 80,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      life: 70 + Math.random() * 35,
      maxLife: 105,
      color
    });
  }
  floatingTexts.push({
    x: WIDTH / 2,
    y: HEIGHT / 2,
    text: t('levelCelebration', { level }),
    color: '#facc15',
    life: 90,
    maxLife: 90,
    large: true
  });
}

function spawnPowerUp(x, y) {
  const types = [
    { type: 'wide', symbol: '↔️', color: '#ff4d6d', weight: 5 },
    { type: 'slow', symbol: '🐢', color: '#38bdf8', weight: 4 },
    { type: 'score', symbol: '💎', color: '#facc15', weight: 5 },
    { type: 'bonus', symbol: '⚡', color: '#c084fc', weight: 4 },
    { type: 'multi', symbol: '🚀', color: '#fb7185', weight: 3 },
    { type: 'multiball', symbol: '🫧', color: '#60a5fa', weight: 2 },
    { type: 'shield', symbol: '🛡️', color: '#34d399', weight: 2 },
    { type: 'gravity', symbol: '🪶', color: '#f59e0b', weight: 3 },
    { type: 'focus', symbol: '🎯', color: '#818cf8', weight: 3 },
    { type: 'catch', symbol: '🧲', color: '#2dd4bf', weight: 3 },
    { type: 'fireball', symbol: '🔥', color: '#fb923c', weight: 2 },
    { type: 'double', symbol: '2️⃣', color: '#e879f9', weight: 2 },
    { type: 'jackpot', symbol: '🎰', color: '#fde047', weight: 1 },
    { type: 'life', symbol: '💖', color: '#ff2d8d', weight: 1 }
  ];
  const availableTypes = lives < 5 ? types : types.filter((powerUp) => powerUp.type !== 'life');
  const powerUp = pickWeightedPowerUp(availableTypes);
  powerUps.push({ x, y, vy: 1.8, type: powerUp.type, symbol: powerUp.symbol, color: powerUp.color });
}

function createBricks() {
  bricks.length = 0;
  const layout = getLevelLayout(level, BRICK_COLS, BRICK_ROWS);
  const startX = 24;
  const startY = 70;

  for (let row = 0; row < BRICK_ROWS; row += 1) {
    for (let col = 0; col < BRICK_COLS; col += 1) {
      if (!layout[row][col]) continue;
      const health = getBrickHealth(level, row, col);
      bricks.push({
        x: startX + col * (BRICK_WIDTH + BRICK_GAP),
        y: startY + row * (BRICK_HEIGHT + BRICK_GAP),
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        color: randomColor(),
        alive: true,
        health,
        maxHealth: health,
        crackSeed: level * 41 + row * 17 + col * 29,
        hitFlash: 0,
        hitCooldown: 0
      });
    }
  }
}

function resetGame() {
  if (highScoreDialog?.open) highScoreDialog.close();
  pendingScoreEntry = null;
  score = 0;
  level = 1;
  lives = 3;
  gameActive = true;
  ballLaunched = false;
  pointerAim = null;
  combo = 0;
  comboTimer = 0;
  scoreMultiplier = 1;
  multiplierTimer = 0;
  lightningTimer = 0;
  catchCharges = 0;
  piercingHits = 0;
  shieldCharges = 0;
  speedEffect = null;
  speedEffectTimer = 0;
  boosterHudMessages = [];
  boosterCelebration = null;
  const startingPaddleWidth = DIFFICULTIES[settings.difficulty].paddleWidth;
  paddle.x = WIDTH / 2 - startingPaddleWidth / 2;
  paddle.width = startingPaddleWidth;
  ball.x = WIDTH / 2;
  ball.y = HEIGHT - 50;
  ball.vx = 0;
  ball.vy = 0;
  particles.length = 0;
  floatingTexts.length = 0;
  shockwaves.length = 0;
  ballTrail.length = 0;
  powerUps.length = 0;
  extraBalls.length = 0;
  createBricks();
  updateHud();
  setStatus();
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(loop);
}

function updateHud() {
  scoreEl.textContent = score;
  levelEl.textContent = level;
  livesEl.textContent = lives;
  highScoreEl.textContent = highScore;
  renderLeaderboard();
}

function drawBackground() {
  const gradient = ctx.createRadialGradient(WIDTH * 0.3, HEIGHT * 0.2, 0, WIDTH * 0.3, HEIGHT * 0.2, WIDTH * 0.95);
  gradient.addColorStop(0, '#06101f');
  gradient.addColorStop(0.3, '#0b1630');
  gradient.addColorStop(0.7, '#040914');
  gradient.addColorStop(1, '#01040b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const theme = (level - 1) % 8;
  const levelHue = (195 + level * 24) % 360;
  ctx.fillStyle = `hsla(${levelHue}, 90%, 65%, 0.14)`;
  ctx.beginPath();
  if (theme % 2 === 0) ctx.ellipse(WIDTH * 0.25, HEIGHT * 0.22, 110, 70, -0.25, 0, Math.PI * 2);
  else ctx.ellipse(WIDTH * 0.7, HEIGHT * 0.7, 150, 68, 0.5, 0, Math.PI * 2);
  ctx.fill();

  if (theme === 1 || theme === 5) {
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.17)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(WIDTH * 0.2, HEIGHT * 0.72, 82, 0.15, Math.PI * 1.25);
    ctx.stroke();
  } else if (theme === 2 || theme === 6) {
    ctx.fillStyle = 'rgba(45, 212, 191, 0.1)';
    ctx.beginPath();
    ctx.ellipse(WIDTH * 0.72, HEIGHT * 0.76, 145, 92, 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else if (theme === 3 || theme === 7) {
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.18)';
    ctx.lineWidth = 3;
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath();
      ctx.ellipse(WIDTH * 0.78, HEIGHT * 0.2, 42 + ring * 16, 14 + ring * 6, -0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = 'rgba(146, 189, 255, 0.16)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i += 1) {
    const y = 80 + i * 95;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(WIDTH * 0.3, y - 30, WIDTH, y + 14);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  if (settings.effects) {
    stars.forEach((star) => {
      const pulse = 0.75 + Math.sin((star.x + star.y) * 0.025 + performance.now() * 0.00005) * 0.3;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * pulse, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const planetColors = ['#5b7cff', '#ec4899', '#14b8a6', '#f59e0b'];
  const planetX = theme < 4 ? WIDTH * 0.82 : WIDTH * 0.16;
  const planetY = theme % 3 === 0 ? HEIGHT * 0.16 : HEIGHT * 0.28;
  ctx.fillStyle = planetColors[theme % planetColors.length];
  ctx.beginPath();
  ctx.arc(planetX, planetY, 25 + (theme % 3) * 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(planetX + 10, planetY - 10, 7, 0, Math.PI * 2);
  ctx.fill();
}

function drawPaddle() {
  const pulse = 1 + Math.sin(paddlePulse) * 0.03;
  const width = paddle.width * pulse;
  const x = paddle.x + (paddle.width - width) / 2;
  const magnetActive = catchCharges > 0;
  const paddleGradient = ctx.createLinearGradient(x, paddle.y, x + width, paddle.y);
  if (magnetActive) {
    paddleGradient.addColorStop(0, '#fb7185');
    paddleGradient.addColorStop(0.24, '#f43f5e');
    paddleGradient.addColorStop(0.42, '#f8fafc');
    paddleGradient.addColorStop(0.58, '#f8fafc');
    paddleGradient.addColorStop(0.76, '#22d3ee');
    paddleGradient.addColorStop(1, '#38bdf8');
  } else {
    paddleGradient.addColorStop(0, '#22d3ee');
    paddleGradient.addColorStop(1, '#38bdf8');
  }
  ctx.save();
  if (magnetActive) {
    ctx.shadowColor = '#e879f9';
    ctx.shadowBlur = 18;
  }
  ctx.fillStyle = paddleGradient;
  ctx.beginPath();
  ctx.roundRect(x, paddle.y, width, paddle.height, 10);
  ctx.fill();
  ctx.strokeStyle = magnetActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)';
  ctx.stroke();
  ctx.restore();

  if (!magnetActive) return;

  const centerX = paddle.x + paddle.width / 2;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.6;
  for (let arc = 0; arc < 2; arc += 1) {
    const spread = 13 + arc * 9;
    ctx.beginPath();
    ctx.arc(centerX, paddle.y - 1, spread, Math.PI * 1.12, Math.PI * 1.88);
    ctx.strokeStyle = arc === 0 ? 'rgba(248,250,252,0.9)' : 'rgba(232,121,249,0.65)';
    ctx.stroke();
  }
  ctx.font = '15px "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = '#e879f9';
  ctx.shadowBlur = 8;
  ctx.fillText('🧲', centerX, paddle.y - 3);
  ctx.restore();
}

function drawBall(gameBall = ball) {
  const glow = 1 + Math.sin(ballPulse) * 0.12;
  const fireballActive = piercingHits > 0;
  const lightningActive = lightningTimer > 0;
  const drawRadius = fireballActive && gameBall === ball ? gameBall.radius * 1.45 : gameBall.radius;
  const gradient = ctx.createRadialGradient(gameBall.x - 2, gameBall.y - 2, 2, gameBall.x, gameBall.y, drawRadius * glow);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.3, fireballActive || lightningActive ? '#fde047' : '#fef3c7');
  gradient.addColorStop(1, fireballActive ? '#f97316' : lightningActive ? '#a855f7' : '#fb7185');
  ctx.save();
  if (fireballActive || lightningActive) {
    ctx.shadowColor = fireballActive ? '#fb923c' : '#fde047';
    ctx.shadowBlur = lightningActive ? 24 : 18;
  }
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(gameBall.x, gameBall.y, drawRadius * glow, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLightningEffect() {
  if (!settings.effects || lightningTimer <= 0) return;

  const time = performance.now() * 0.012;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';

  for (let arcIndex = 0; arcIndex < 4; arcIndex += 1) {
    const angle = time * 0.35 + arcIndex * (Math.PI / 2);
    const radius = 19 + Math.sin(time + arcIndex) * 5;
    const endX = ball.x + Math.cos(angle) * radius;
    const endY = ball.y + Math.sin(angle) * radius;
    const perpendicularX = -Math.sin(angle);
    const perpendicularY = Math.cos(angle);

    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    for (let segment = 1; segment <= 4; segment += 1) {
      const progress = segment / 4;
      const jitter = Math.sin(time * 2.3 + arcIndex * 7 + segment * 5) * 4;
      ctx.lineTo(
        ball.x + (endX - ball.x) * progress + perpendicularX * jitter,
        ball.y + (endY - ball.y) * progress + perpendicularY * jitter
      );
    }
    ctx.strokeStyle = arcIndex % 2 === 0 ? 'rgba(253, 224, 71, 0.95)' : 'rgba(192, 132, 252, 0.9)';
    ctx.lineWidth = arcIndex % 2 === 0 ? 1.8 : 1.2;
    ctx.shadowColor = arcIndex % 2 === 0 ? '#fde047' : '#c084fc';
    ctx.shadowBlur = 10;
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 13 + Math.sin(time * 1.7) * 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawActivePowerUpEffects() {
  if (!settings.effects) return;
  const time = performance.now() * 0.008;
  const activeBalls = [ball, ...extraBalls];

  if (speedEffect) {
    activeBalls.forEach((gameBall) => {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (speedEffect === 'turtle') {
        ctx.strokeStyle = 'rgba(134, 239, 172, 0.82)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.arc(gameBall.x, gameBall.y, 15 + Math.sin(time) * 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (speedEffect === 'feather') {
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.88)';
        ctx.lineWidth = 2;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(gameBall.x + side * 7, gameBall.y);
          ctx.quadraticCurveTo(
            gameBall.x + side * 20,
            gameBall.y - 9 + Math.sin(time * 1.4) * 3,
            gameBall.x + side * 25,
            gameBall.y + 5
          );
          ctx.stroke();
        }
      } else if (speedEffect === 'turbo') {
        const speed = Math.max(0.001, Math.hypot(gameBall.vx, gameBall.vy));
        const tailX = gameBall.x - (gameBall.vx / speed) * 34;
        const tailY = gameBall.y - (gameBall.vy / speed) * 34;
        const turboGradient = ctx.createLinearGradient(gameBall.x, gameBall.y, tailX, tailY);
        turboGradient.addColorStop(0, 'rgba(255,255,255,0.95)');
        turboGradient.addColorStop(0.35, 'rgba(250,204,21,0.9)');
        turboGradient.addColorStop(1, 'rgba(244,63,94,0)');
        ctx.strokeStyle = turboGradient;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(gameBall.x, gameBall.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  if (shieldCharges > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.88)';
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(18, HEIGHT - 7);
    ctx.quadraticCurveTo(WIDTH / 2, HEIGHT - 15 - Math.sin(time) * 2, WIDTH - 18, HEIGHT - 7);
    ctx.stroke();
    ctx.restore();
  }

  if (scoreMultiplier > 1) {
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(time * 0.35);
    ctx.fillStyle = '#e879f9';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#e879f9';
    ctx.shadowBlur = 8;
    ctx.fillText('2×', 0, -20);
    ctx.restore();
  }

  if (!boosterCelebration) return;
  const progress = 1 - boosterCelebration.life / boosterCelebration.maxLife;
  const alpha = Math.min(1, boosterCelebration.life / 22);
  const centerX = boosterCelebration.type === 'wide' ? paddle.x + paddle.width / 2 : ball.x;
  const centerY = boosterCelebration.type === 'wide' ? paddle.y : ball.y;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = boosterCelebration.color;
  ctx.shadowColor = boosterCelebration.color;
  ctx.shadowBlur = 16;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 18 + progress * 44, 0, Math.PI * 2);
  ctx.stroke();

  const rays = ['score', 'jackpot', 'life', 'bonus'].includes(boosterCelebration.type) ? 12 : 7;
  for (let ray = 0; ray < rays; ray += 1) {
    const angle = (Math.PI * 2 * ray) / rays + progress;
    const inner = 20 + progress * 12;
    const outer = inner + 9 + progress * 12;
    ctx.beginPath();
    ctx.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
    ctx.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.font = '30px "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(boosterCelebration.symbol, centerX, centerY - 28 - progress * 12);
  ctx.restore();
}

function drawBricks() {
  bricks.forEach((brick) => {
    if (!brick.alive) return;
    const damage = brick.maxHealth - brick.health;
    const damageRatio = damage / Math.max(1, brick.maxHealth - 1);
    const shakeX = brick.hitFlash > 0 ? Math.sin(brick.hitFlash * 2.4) * 1.5 : 0;
    ctx.save();
    ctx.translate(shakeX, 0);
    if (settings.effects) {
      ctx.shadowColor = brick.color;
      ctx.shadowBlur = Math.max(1, 4 - damage);
    }
    if (brick.maxHealth > 1) {
      const armoredSurface = ctx.createLinearGradient(
        brick.x,
        brick.y,
        brick.x,
        brick.y + brick.height
      );
      armoredSurface.addColorStop(0, brick.maxHealth === 3 ? '#1e293b' : '#334155');
      armoredSurface.addColorStop(0.48, brick.maxHealth === 3 ? '#0f172a' : '#1e293b');
      armoredSurface.addColorStop(1, brick.maxHealth === 3 ? '#020617' : '#0f172a');
      ctx.fillStyle = armoredSurface;
    } else {
      const neonSurface = ctx.createLinearGradient(
        brick.x,
        brick.y,
        brick.x,
        brick.y + brick.height
      );
      neonSurface.addColorStop(0, '#ffffff');
      neonSurface.addColorStop(0.13, brick.color);
      neonSurface.addColorStop(0.72, brick.color);
      neonSurface.addColorStop(1, '#071225');
      ctx.fillStyle = neonSurface;
    }
    ctx.beginPath();
    ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = brick.maxHealth > 1 ? brick.color : 'rgba(235, 251, 255, 0.98)';
    ctx.lineWidth = 1.7 + (brick.maxHealth - 1) * 0.65;
    ctx.stroke();

    if (brick.maxHealth > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(brick.x + 1.5, brick.y + 1.5, brick.width - 3, brick.height - 3, 4.5);
      ctx.clip();

      const armorShade = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
      armorShade.addColorStop(0, `rgba(255,255,255,${brick.maxHealth === 3 ? 0.34 : 0.24})`);
      armorShade.addColorStop(0.42, 'rgba(255,255,255,0.04)');
      armorShade.addColorStop(0.55, 'rgba(2,6,23,0.06)');
      armorShade.addColorStop(1, `rgba(2,6,23,${brick.maxHealth === 3 ? 0.4 : 0.28})`);
      ctx.fillStyle = armorShade;
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
      ctx.restore();

      const inset = brick.maxHealth === 3 ? 3.5 : 4.5;
      ctx.beginPath();
      ctx.roundRect(
        brick.x + inset,
        brick.y + inset,
        brick.width - inset * 2,
        brick.height - inset * 2,
        3
      );
      ctx.strokeStyle = brick.maxHealth === 3
        ? 'rgba(15,23,42,0.72)'
        : 'rgba(15,23,42,0.5)';
      ctx.lineWidth = brick.maxHealth === 3 ? 1.8 : 1.2;
      ctx.stroke();
    }
    drawBrickBoxArtTexture(brick);

    if (damage > 0) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(2, 6, 23, ${0.22 + damageRatio * 0.28})`;
      ctx.beginPath();
      ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 6);
      ctx.fill();
      ctx.strokeStyle = brick.maxHealth > 1
        ? `rgba(224, 242, 254, ${0.78 + damageRatio * 0.2})`
        : `rgba(15, 23, 42, ${0.75 + damageRatio * 0.2})`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      if (settings.effects && brick.maxHealth > 1) {
        ctx.shadowColor = '#bae6fd';
        ctx.shadowBlur = 4;
      }
      getBrickCrackLines(brick.crackSeed, damage).forEach((line) => {
        ctx.beginPath();
        line.forEach(([x, y], index) => {
          const pointX = brick.x + brick.width * x;
          const pointY = brick.y + brick.height * y;
          if (index === 0) ctx.moveTo(pointX, pointY);
          else ctx.lineTo(pointX, pointY);
        });
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
    }

    if (brick.hitFlash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${brick.hitFlash / 14})`;
      ctx.beginPath();
      ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 6);
      ctx.fill();
      brick.hitFlash -= 1;
    }
    ctx.restore();
  });
}

function seededBrickValue(seed, index) {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function drawBrickBoxArtTexture(brick) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(brick.x + 1.5, brick.y + 1.5, brick.width - 3, brick.height - 3, 4.5);
  ctx.clip();

  const paintedLight = ctx.createLinearGradient(
    brick.x,
    brick.y,
    brick.x + brick.width,
    brick.y + brick.height
  );
  paintedLight.addColorStop(0, 'rgba(255,255,255,0.52)');
  paintedLight.addColorStop(0.2, 'rgba(255,255,255,0.12)');
  paintedLight.addColorStop(0.64, 'rgba(255,255,255,0)');
  paintedLight.addColorStop(1, 'rgba(2,6,23,0.42)');
  ctx.fillStyle = paintedLight;
  ctx.fillRect(brick.x, brick.y, brick.width, brick.height);

  ctx.lineCap = 'round';
  for (let strokeIndex = 0; strokeIndex < 9; strokeIndex += 1) {
    const startX = brick.x + 4 + seededBrickValue(brick.crackSeed, strokeIndex * 4) * (brick.width - 12);
    const startY = brick.y + 3 + seededBrickValue(brick.crackSeed, strokeIndex * 4 + 1) * (brick.height - 7);
    const length = 5 + seededBrickValue(brick.crackSeed, strokeIndex * 4 + 2) * 13;
    const slope = (seededBrickValue(brick.crackSeed, strokeIndex * 4 + 3) - 0.5) * 3.5;
    ctx.strokeStyle = strokeIndex % 3 === 0
      ? 'rgba(255,255,255,0.28)'
      : strokeIndex % 3 === 1
        ? 'rgba(2,6,23,0.18)'
        : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 0.65 + seededBrickValue(brick.crackSeed, strokeIndex + 40) * 0.75;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(Math.min(brick.x + brick.width - 3, startX + length), startY + slope);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.72)';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(brick.x + 7, brick.y + 4);
  ctx.lineTo(brick.x + brick.width - 9, brick.y + 4);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(2,6,23,0.58)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(brick.x + 7, brick.y + brick.height - 3);
  ctx.lineTo(brick.x + brick.width - 7, brick.y + brick.height - 3);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = brick.maxHealth > 1 ? 'rgba(186,230,253,0.34)' : `${brick.color}cc`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(brick.x + 3.5, brick.y + 3.5, brick.width - 7, brick.height - 7, 3.5);
  ctx.stroke();
  ctx.restore();
}

function drawBallTrail() {
  if (!settings.effects) return;
  ballTrail.forEach((point) => {
    ctx.globalAlpha = point.life / point.maxLife;
    ctx.fillStyle = piercingHits > 0 ? '#fb923c' : lightningTimer > 0 ? '#fde047' : '#7dd3fc';
    ctx.beginPath();
    ctx.arc(point.x, point.y, ball.radius * (point.life / point.maxLife), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function addBallTrailPoint(gameBall) {
  if (!settings.effects) return;
  ballTrail.push({ x: gameBall.x, y: gameBall.y, life: 12, maxLife: 12 });
  const maximumTrailPoints = 18 * (extraBalls.length + 1);
  while (ballTrail.length > maximumTrailPoints) ballTrail.shift();
}

function drawImpactEffects() {
  if (!settings.effects) return;
  shockwaves.forEach((wave) => {
    ctx.globalAlpha = wave.life / wave.maxLife;
    ctx.strokeStyle = wave.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  floatingTexts.forEach((item) => {
    ctx.save();
    ctx.globalAlpha = Math.min(1, item.life / 12);
    ctx.fillStyle = item.color;
    const isScoreText = /^\+\d/.test(item.text);
    ctx.font = item.large
      ? 'bold 30px sans-serif'
      : item.emoji
        ? '22px "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
      : isScoreText
        ? 'bold 20px sans-serif'
        : 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = item.color;
    ctx.shadowBlur = 10;
    ctx.fillText(item.text, item.x, item.y);
    ctx.restore();
  });
}

function drawGameOverScreen() {
  if (gameActive) return;

  const panelX = 54;
  const panelY = 205;
  const panelWidth = WIDTH - panelX * 2;
  const panelHeight = 232;
  const time = performance.now() * 0.003;

  ctx.save();
  ctx.fillStyle = 'rgba(1, 4, 11, 0.78)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.shadowColor = '#ec4899';
  ctx.shadowBlur = 28;
  ctx.fillStyle = 'rgba(7, 18, 37, 0.96)';
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 24);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(panelX + 8, panelY + 8, panelWidth - 16, panelHeight - 16, 18);
  ctx.stroke();

  const decorations = [
    { symbol: '✨', x: panelX + 34, y: panelY + 42 },
    { symbol: '💥', x: panelX + panelWidth - 38, y: panelY + 50 },
    { symbol: '🫧', x: panelX + 42, y: panelY + panelHeight - 32 },
    { symbol: '🎮', x: panelX + panelWidth - 42, y: panelY + panelHeight - 34 }
  ];
  ctx.font = '24px "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  decorations.forEach(({ symbol, x, y }, index) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time + index) * 0.12);
    ctx.fillText(symbol, 0, 0);
    ctx.restore();
  });

  const titleGradient = ctx.createLinearGradient(panelX + 80, 0, panelX + panelWidth - 80, 0);
  titleGradient.addColorStop(0, '#22d3ee');
  titleGradient.addColorStop(0.5, '#facc15');
  titleGradient.addColorStop(1, '#f472b6');
  ctx.fillStyle = titleGradient;
  ctx.font = '900 30px sans-serif';
  ctx.shadowColor = '#db2777';
  ctx.shadowBlur = 12;
  ctx.fillText(t('gameOverTitle'), WIDTH / 2, panelY + 64);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText(t('gameOverScore', { score }), WIDTH / 2, panelY + 112);
  ctx.fillStyle = '#a5f3fc';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(t('gameOverLevel', { level }), WIDTH / 2, panelY + 142);

  ctx.fillStyle = '#fbcfe8';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(t('gameOverPrompt'), WIDTH / 2, panelY + 188);
  ctx.restore();
}

function drawParticles() {
  if (!settings.effects) return;
  particles.forEach((particle) => {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0.1, particle.life / particle.maxLife);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawPowerUps() {
  powerUps.forEach((powerUp) => {
    ctx.save();
    ctx.translate(powerUp.x, powerUp.y);
    ctx.shadowColor = powerUp.color;
    ctx.shadowBlur = powerUp.type === 'bonus' ? 24 : 17;
    const tokenGradient = ctx.createRadialGradient(-5, -6, 2, 0, 0, POWER_UP_RADIUS);
    tokenGradient.addColorStop(0, 'rgba(255,255,255,0.9)');
    tokenGradient.addColorStop(0.16, '#172554');
    tokenGradient.addColorStop(0.72, '#020617');
    tokenGradient.addColorStop(1, powerUp.color);
    ctx.fillStyle = tokenGradient;
    ctx.beginPath();
    ctx.arc(0, 0, POWER_UP_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = powerUp.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.72)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(-2, -3, POWER_UP_RADIUS - 4, Math.PI * 1.08, Math.PI * 1.76);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '29px "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(powerUp.symbol, 0, 0);
    ctx.restore();
  });
}

function updatePaddle() {
  const keyboardDirection = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const direction = keyboardDirection || gamepadAxis;
  if (direction) {
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, paddle.x + direction * 8));
  }

  if (ballLaunched === false) {
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - 10;
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 1;
    if (particle.life <= 0) particles.splice(i, 1);
  }

  for (let i = floatingTexts.length - 1; i >= 0; i -= 1) {
    floatingTexts[i].y -= floatingTexts[i].large ? 0.25 : 0.7;
    floatingTexts[i].life -= 1;
    if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
  }

  for (let i = shockwaves.length - 1; i >= 0; i -= 1) {
    shockwaves[i].radius += 2.2;
    shockwaves[i].life -= 1;
    if (shockwaves[i].life <= 0) shockwaves.splice(i, 1);
  }

  for (let i = ballTrail.length - 1; i >= 0; i -= 1) {
    ballTrail[i].life -= 1;
    if (ballTrail[i].life <= 0) ballTrail.splice(i, 1);
  }

  paddlePulse += 0.16;
  ballPulse += 0.25;
  comboTimer = Math.max(0, comboTimer - 1);
  if (comboTimer === 0) combo = 0;
  multiplierTimer = Math.max(0, multiplierTimer - 1);
  if (multiplierTimer === 0) scoreMultiplier = 1;
  lightningTimer = Math.max(0, lightningTimer - 1);
  if (speedEffectTimer > 0) {
    speedEffectTimer -= 1;
    if (speedEffectTimer === 0) {
      speedEffect = null;
      const normalSpeed = DIFFICULTIES[settings.difficulty].launchSpeed;
      if (ballLaunched) Object.assign(ball, setBallSpeed(ball, normalSpeed));
      extraBalls.forEach((extraBall) => Object.assign(extraBall, setBallSpeed(extraBall, normalSpeed)));
    }
  }
  boosterHudMessages = boosterHudMessages
    .map((message) => ({ ...message, timer: message.timer - 1 }))
    .filter((message) => message.timer > 0);
  if (boosterCelebration) {
    boosterCelebration.life -= 1;
    if (boosterCelebration.life <= 0) boosterCelebration = null;
  }
}

function getActiveSpeedTarget() {
  const difficulty = DIFFICULTIES[settings.difficulty];
  if (speedEffect === 'turtle') return Math.max(3.5, difficulty.launchSpeed * 0.8);
  if (speedEffect === 'feather') return Math.max(3.9, difficulty.launchSpeed * 0.9);
  if (speedEffect === 'turbo') return difficulty.maxSpeed;
  return null;
}

function enforceBallSpeed(gameBall) {
  const targetSpeed = getActiveSpeedTarget();
  if (targetSpeed) return setBallSpeed(gameBall, targetSpeed);
  return capBallVelocity(gameBall, DIFFICULTIES[settings.difficulty].maxSpeed);
}

function activateSpeedEffect(effect) {
  speedEffect = effect;
  speedEffectTimer = SPEED_EFFECT_DURATIONS[effect];
  if (ballLaunched) Object.assign(ball, enforceBallSpeed(ball));
  extraBalls.forEach((extraBall) => Object.assign(extraBall, enforceBallSpeed(extraBall)));
}

function updatePowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i -= 1) {
    const powerUp = powerUps[i];
    powerUp.y += powerUp.vy;
    const powerUpRadius = POWER_UP_RADIUS;
    if (
      powerUp.y + powerUpRadius >= paddle.y &&
      powerUp.y - powerUpRadius <= paddle.y + paddle.height &&
      powerUp.x + powerUpRadius >= paddle.x &&
      powerUp.x - powerUpRadius <= paddle.x + paddle.width
    ) {
      const updated = applyPowerUp(powerUp, {
        paddle,
        ball,
        score,
        lives,
        scoreMultiplier,
        multiplierTimer,
        lightningTimer,
        startingPaddleWidth: DIFFICULTIES[settings.difficulty].paddleWidth,
        maxPaddleWidth: MAX_PADDLE_WIDTH,
        difficultyMultiplier: DIFFICULTIES[settings.difficulty].scoreMultiplier,
        catchCharges,
        piercingHits,
        shieldCharges
      });
      paddle.width = updated.paddle.width;
      paddle.x = Math.min(paddle.x, WIDTH - paddle.width);
      ball.vx = updated.ball.vx;
      ball.vy = updated.ball.vy;
      score = typeof updated.score === 'number' ? updated.score : score;
      lives = typeof updated.lives === 'number' ? updated.lives : lives;
      scoreMultiplier = updated.scoreMultiplier || scoreMultiplier;
      multiplierTimer = updated.multiplierTimer || multiplierTimer;
      lightningTimer = updated.lightningTimer || lightningTimer;
      catchCharges = updated.catchCharges ?? catchCharges;
      piercingHits = updated.piercingHits ?? piercingHits;
      shieldCharges = updated.shieldCharges ?? shieldCharges;
      const boosterHudKey = `boosterHud${powerUp.type[0].toUpperCase()}${powerUp.type.slice(1)}`;
      boosterHudMessages = [
        ...boosterHudMessages.filter((message) => message.key !== boosterHudKey),
        { key: boosterHudKey, timer: 360 }
      ].slice(-2);
      boosterCelebration = {
        type: powerUp.type,
        symbol: powerUp.symbol,
        color: powerUp.color,
        life: 90,
        maxLife: 90
      };
      spawnImpactFeedback(powerUp.x, powerUp.y - 10, powerUp.symbol, powerUp.color, true);
      if (powerUp.type === 'slow' || powerUp.type === 'gravity') {
        activateSpeedEffect(powerUp.type === 'slow' ? 'turtle' : 'feather');
        setStatus(powerUp.type === 'slow' ? 'turtleStatus' : 'featherStatus');
        spawnImpactFeedback(
          WIDTH / 2,
          HEIGHT / 2,
          t(powerUp.type === 'slow' ? 'slowed' : 'floating'),
          powerUp.color,
          false,
          75
        );
        playTone(powerUp.type === 'slow' ? 190 : 310, 0.18, 'sine');
      }
      if (powerUp.type === 'multi') {
        activateSpeedEffect('turbo');
        playTone(980, 0.08, 'triangle');
      }
      if (powerUp.type === 'multiball') {
        getMultiballVelocities(ball.vx, ball.vy).forEach((velocity) => {
          extraBalls.push({ ...ball, ...velocity });
        });
        setStatus('multiballStatus');
        playTone(1080, 0.12, 'triangle');
      }
      if (powerUp.type === 'bonus') {
        spawnImpactFeedback(WIDTH / 2, HEIGHT / 2, t('lightningEnergy'), '#fde047', false, 90);
        shockwaves.push({ x: ball.x, y: ball.y, radius: 8, life: 42, maxLife: 42, color: '#fde047' });
        playTone(1240, 0.18, 'sawtooth');
      }
      powerUps.splice(i, 1);
      playTone(820, 0.1, 'triangle');
      spawnParticles(powerUp.x, powerUp.y, powerUp.color);
    } else if (powerUp.y > HEIGHT) {
      powerUps.splice(i, 1);
    }
  }
}

function launchBall() {
  if (ballLaunched) return;
  const targetX = pointerAim?.x ?? paddle.x + paddle.width / 2;
  const targetY = pointerAim?.y ?? 0;
  const difficulty = DIFFICULTIES[settings.difficulty];
  const launchSpeed = difficulty.launchSpeed;
  const nextVelocity = getLaunchVelocityFromPointer(targetX, targetY, ball.x, ball.y, launchSpeed);
  ball.vx = nextVelocity.vx;
  ball.vy = nextVelocity.vy;
  Object.assign(ball, enforceBallSpeed(ball));
  ballLaunched = true;
  setStatus();
}

function updateExtraBalls() {
  for (let index = extraBalls.length - 1; index >= 0; index -= 1) {
    const extraBall = extraBalls[index];
    extraBall.x += extraBall.vx;
    extraBall.y += extraBall.vy;
    addBallTrailPoint(extraBall);

    const bounced = bounceOffWalls(extraBall, WIDTH, HEIGHT);
    Object.assign(extraBall, bounced);
    collideWithPaddle(extraBall, paddle);
    Object.assign(extraBall, enforceBallSpeed(extraBall));

    for (const brick of bricks) {
      if (!brick.alive || brick.hitCooldown > 0) continue;
      const result = resolveBrickCollision(extraBall, brick);
      if (!result.hit) continue;

      combo += 1;
      comboTimer = 90;
      const earnedScore = calculateBrickScore({
        combo,
        scoreMultiplier,
        difficultyMultiplier: DIFFICULTIES[settings.difficulty].scoreMultiplier,
        lightningActive: lightningTimer > 0,
        baseScore: result.destroyed ? 10 : 4
      });
      score += earnedScore;
      brick.health = result.brick.health;
      brick.alive = result.brick.alive;
      brick.hitFlash = 10;
      brick.hitCooldown = 5;
      if (result.axis === 'x') extraBall.vx = -extraBall.vx;
      else extraBall.vy = -extraBall.vy;
      spawnParticles(extraBall.x, extraBall.y, brick.color);
      if (result.destroyed && Math.random() < DIFFICULTIES[settings.difficulty].boosterChance) {
        spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
      }
      playTone(result.destroyed ? 720 : 390, 0.05, 'triangle');
      break;
    }

    if (extraBall.y - extraBall.radius > HEIGHT) extraBalls.splice(index, 1);
  }
}

function updateBall() {
  if (!ballLaunched) return;

  ball.x += ball.vx;
  ball.y += ball.vy;
  addBallTrailPoint(ball);
  if (piercingHits > 0 && settings.effects && Math.random() > 0.55) {
    particles.push({
      x: ball.x,
      y: ball.y,
      vx: -ball.vx * 0.12 + (Math.random() - 0.5),
      vy: -ball.vy * 0.12 + (Math.random() - 0.5),
      life: 12,
      maxLife: 12,
      color: Math.random() > 0.5 ? '#fb923c' : '#fde047'
    });
  }

  const bounced = bounceOffWalls(ball, WIDTH, HEIGHT);
  ball.x = bounced.x;
  ball.y = bounced.y;
  ball.vx = bounced.vx;
  ball.vy = bounced.vy;
  Object.assign(ball, enforceBallSpeed(ball));

  if (collideWithPaddle(ball, paddle)) {
    Object.assign(ball, enforceBallSpeed(ball));
    playTone(520, 0.05, 'square');
    if (catchCharges > 0) {
      catchCharges -= 1;
      ballLaunched = false;
      pointerAim = null;
      ball.vx = 0;
      ball.vy = 0;
      setStatus('caughtBall');
    }
  }

  for (const brick of bricks) {
    if (!brick.alive) continue;
    if (brick.hitCooldown > 0) {
      brick.hitCooldown -= 1;
      continue;
    }
    const result = resolveBrickCollision(ball, brick);
    if (result.hit) {
      const usedFireball = piercingHits > 0;
      combo += 1;
      comboTimer = 90;
      const destroyed = result.destroyed;
      const earnedScore = calculateBrickScore({
        combo,
        scoreMultiplier,
        difficultyMultiplier: DIFFICULTIES[settings.difficulty].scoreMultiplier,
        lightningActive: lightningTimer > 0,
        baseScore: destroyed ? 10 : 4
      });
      score += earnedScore;
      brick.health = result.brick.health;
      brick.alive = result.brick.alive;
      brick.hitFlash = 10;
      brick.hitCooldown = usedFireball && !destroyed ? 12 : 0;
      const particleCount = destroyed ? 14 : 6;
      for (let particleIndex = 0; particleIndex < particleCount; particleIndex += 1) {
        particles.push({
          x: brick.x + brick.width / 2,
          y: brick.y + brick.height / 2,
          vx: (Math.random() - 0.5) * (destroyed ? 3.8 : 2.2),
          vy: (Math.random() - 0.5) * (destroyed ? 3.8 : 2.2),
          life: destroyed ? 30 : 18,
          maxLife: destroyed ? 30 : 18,
          color: brick.color
        });
      }
      spawnImpactFeedback(
        brick.x + brick.width / 2,
        brick.y,
        destroyed ? `+${earnedScore}` : t('crack', { score: earnedScore }),
        brick.color
      );
      if (lightningTimer > 0) {
        shockwaves.push({
          x: brick.x + brick.width / 2,
          y: brick.y + brick.height / 2,
          radius: 5,
          life: 32,
          maxLife: 32,
          color: '#fde047'
        });
      }
      if (destroyed && Math.random() < DIFFICULTIES[settings.difficulty].boosterChance) {
        spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
      }
      if (usedFireball) {
        piercingHits -= 1;
        setStatus(
          piercingHits > 0 ? 'fireballRemaining' : 'fireballDone',
          { hits: piercingHits }
        );
      } else if (result.axis === 'x') {
        ball.vx = -ball.vx;
      } else {
        ball.vy = -ball.vy;
      }
      playTone(destroyed ? 680 + combo * 20 : 360, destroyed ? 0.06 : 0.09, destroyed ? 'triangle' : 'square');
      if (!destroyed && !usedFireball) {
        setStatus('reinforcedRemaining', { hits: brick.health });
      } else if (combo >= 3 && !usedFireball) {
        setStatus('comboStatus', { multiplier: Math.floor(combo / 3) + 1 });
      }
      break;
    }
  }

  if (ball.y - ball.radius > HEIGHT) {
    if (extraBalls.length > 0) {
      Object.assign(ball, extraBalls.pop());
      setStatus('multiballStatus');
      return;
    }
    if (shieldCharges > 0) {
      shieldCharges -= 1;
      ball.y = HEIGHT - ball.radius;
      ball.vy = -Math.abs(ball.vy);
      setStatus('shieldSaved');
      spawnImpactFeedback(ball.x, HEIGHT - 18, t('saved'), '#34d399', false, 75);
      playTone(760, 0.12, 'triangle');
      return;
    }
    lives -= 1;
    if (lives > 0) {
      ballLaunched = false;
      pointerAim = null;
      ball.x = paddle.x + paddle.width / 2;
      ball.y = paddle.y - 10;
      ball.vx = 0;
      ball.vy = 0;
      speedEffect = null;
      speedEffectTimer = 0;
      extraBalls.length = 0;
      powerUps.length = 0;
      setStatus('lostLife', { lives });
      spawnImpactFeedback(WIDTH / 2, HEIGHT / 2, t('lostLifeEffect'), '#f43f5e', false, 120);
      playTone(220, 0.12, 'sawtooth');
    } else {
      const isNewRecord = score > highScore;
      if (isNewRecord) {
        highScore = score;
        localStorage.setItem('neon-breakout-high-score', String(highScore));
      }
      if (qualifiesForLeaderboard(leaderboard, score)) {
        pendingScoreEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          score,
          difficulty: settings.difficulty,
          isNewRecord
        };
        setTimeout(() => {
          highScorePlayerNameInput.value = activePlayerName;
          highScoreDialog.showModal();
          highScorePlayerNameInput.focus();
          highScorePlayerNameInput.select();
        }, 0);
      }
      setStatus();
      gameActive = false;
    }
    return;
  }

  const remainingBricks = bricks.filter((brick) => brick.alive).length;
  if (remainingBricks === 0) {
    level += 1;
    celebrateLevel();
    createBricks();
    ballLaunched = false;
    pointerAim = null;
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - 10;
    ball.vx = 0;
    ball.vy = 0;
    speedEffect = null;
    speedEffectTimer = 0;
    extraBalls.length = 0;
    setStatus('levelComplete', { level });
    playTone(940, 0.12, 'sine');
  }
}

function draw() {
  ctx.save();
  drawBackground();
  drawBallTrail();
  drawBricks();
  drawPowerUps();
  drawPaddle();
  drawParticles();
  drawBall();
  extraBalls.forEach((extraBall) => drawBall(extraBall));
  drawLightningEffect();
  drawActivePowerUpEffects();
  drawImpactEffects();

  drawTopInformation();

  if (!ballLaunched && pointerAim) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(pointerAim.x, pointerAim.y);
    ctx.stroke();
    ctx.restore();
  }
  drawGameOverScreen();
  ctx.restore();

}

function drawTopInformation() {
  const speedStatus = speedEffect
    ? {
        turtle: { key: 'speedTurtle', color: '#86efac' },
        feather: { key: 'speedFeather', color: '#fbbf24' },
        turbo: { key: 'speedTurbo', color: '#fb7185' }
      }[speedEffect]
    : null;
  const statuses = [
    gamePaused
      ? { text: t('paused'), color: '#facc15' }
      : null,
    combo > 0
      ? { text: t('combo', { combo }), color: combo >= 3 ? '#facc15' : '#7dd3fc' }
      : null,
    speedStatus
      ? {
          text: t(speedStatus.key, { seconds: Math.ceil(speedEffectTimer / 60) }),
          color: speedStatus.color
        }
      : null,
    scoreMultiplier > 1
      ? { text: t('doublePoints', { seconds: Math.ceil(multiplierTimer / 60) }), color: '#e879f9' }
      : null,
    lightningTimer > 0
      ? { text: t('lightningHud', { seconds: Math.ceil(lightningTimer / 60) }), color: '#fde047' }
      : null,
    shieldCharges > 0
      ? {
          kind: 'shield',
          count: shieldCharges,
          color: '#5eead4'
        }
      : null,
    catchCharges > 0 || piercingHits > 0
      ? {
          text: [
            catchCharges > 0 ? `🧲 ${catchCharges}` : null,
            piercingHits > 0 ? `🔥 ${piercingHits}` : null
          ].filter(Boolean).join('  ·  '),
          color: '#5eead4'
        }
      : null
  ].filter(Boolean);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let startY = 10;
  const readableStatusKeys = new Set(['caughtBall', 'lostLife', 'levelComplete', 'shieldSaved']);
  const bannerMessages = boosterHudMessages.length > 0
    ? boosterHudMessages.map((message) => t(message.key))
    : readableStatusKeys.has(currentStatus.key)
      ? [t(currentStatus.key, currentStatus.values)]
      : [];
  if (bannerMessages.length > 0) {
    const bannerGap = 6;
    const bannerY = 8;
    const bannerWidth = (WIDTH - 24 - bannerGap * (bannerMessages.length - 1)) / bannerMessages.length;
    const bannerHeight = 24;
    bannerMessages.forEach((bannerText, index) => {
      const bannerX = 12 + index * (bannerWidth + bannerGap);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.72)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(bannerX, bannerY, bannerWidth, bannerHeight, 9);
      ctx.fill();
      ctx.stroke();
      drawFittedHudText(
        bannerText,
        bannerX + bannerWidth / 2,
        bannerY + bannerHeight / 2,
        bannerWidth - 14,
        bannerMessages.length > 1 ? 12 : 14,
        '#f8fafc'
      );
    });
    startY = 38;
  }

  const gap = 6;
  const chipWidth = (WIDTH - 24 - gap) / 2;
  const chipHeight = 22;
  statuses.forEach((status, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 12 + column * (chipWidth + gap);
    const y = startY + row * (chipHeight + 4);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
    ctx.strokeStyle = `${status.color}99`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, chipWidth, chipHeight, 8);
    ctx.fill();
    ctx.stroke();
    if (status.kind === 'shield') {
      drawShieldStatus(x + chipWidth / 2, y + chipHeight / 2, status.count, status.color);
    } else {
      drawFittedHudText(status.text, x + chipWidth / 2, y + chipHeight / 2, chipWidth - 12, 13, status.color);
    }
  });
  ctx.restore();
}

function drawShieldStatus(centerX, centerY, count, color) {
  const iconX = centerX - 18;
  const iconY = centerY - 8;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = 'rgba(94, 234, 212, 0.2)';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.moveTo(iconX, iconY);
  ctx.lineTo(iconX + 13, iconY + 3);
  ctx.lineTo(iconX + 11, iconY + 11);
  ctx.quadraticCurveTo(iconX + 7, iconY + 16, iconX, iconY + 18);
  ctx.quadraticCurveTo(iconX - 7, iconY + 16, iconX - 11, iconY + 11);
  ctx.lineTo(iconX - 13, iconY + 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 16px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`× ${count}`, centerX + 3, centerY + 1);
  ctx.restore();
}

function drawFittedHudText(text, x, y, maxWidth, preferredSize, color) {
  let fontSize = preferredSize;
  do {
    ctx.font = `bold ${fontSize}px "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize -= 0.5;
  } while (fontSize > 11.5);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;
  ctx.fillText(text, x, y, maxWidth);
  ctx.shadowBlur = 0;
}

function loop() {
  if (!gameActive) return;
  if (!gamePaused) {
    updatePaddle();
    updateParticles();
    updatePowerUps();
    updateExtraBalls();
    updateBall();
  }
  draw();
  updateHud();
  animationFrameId = requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.fullscreenElement) {
    event.preventDefault();
    document.exitFullscreen().catch((error) => {
      console.error('Could not exit fullscreen:', error);
    });
    return;
  }
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = true;
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = true;
  if (event.key === ' ' && !isInteractiveElement(event.target)) {
    event.preventDefault();
    if (event.repeat) return;
    if (!startScreen.hidden) {
      startGame();
    } else if (gameActive && ballLaunched) {
      gamePaused = !gamePaused;
      setStatus(gamePaused ? 'paused' : null);
    } else if (gameActive) {
      launchBall();
    }
  }
  if (event.key === 'F11') {
    event.preventDefault();
    toggleFullscreen();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = false;
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = false;
});

canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (WIDTH / rect.width);
  const y = (event.clientY - rect.top) * (HEIGHT / rect.height);
  paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, x - paddle.width / 2));
  pointerAim = { x, y };
});

canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  pointerAim = {
    x: (event.clientX - rect.left) * (WIDTH / rect.width),
    y: (event.clientY - rect.top) * (HEIGHT / rect.height)
  };
  launchBall();
});

restartButton.addEventListener('click', resetGame);
function startGame() {
  if (startScreen.hidden) return;
  startScreen.hidden = true;
  gameShell.hidden = false;
  resetGame();
}

startForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  startGame();
});
highScoreDialog?.addEventListener('cancel', (event) => event.preventDefault());
highScoreForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!pendingScoreEntry) {
    highScoreDialog.close();
    return;
  }

  const enteredPlayerName = highScorePlayerNameInput.value.trim().slice(0, 12);
  activePlayerName = enteredPlayerName || t('defaultPlayerName');
  leaderboard = addLeaderboardEntry(leaderboard, {
    id: pendingScoreEntry.id,
    name: activePlayerName,
    score: pendingScoreEntry.score,
    difficulty: pendingScoreEntry.difficulty
  });
  saveLeaderboard();

  try {
    if (enteredPlayerName) {
      localStorage.setItem('neon-breakout-player-name', enteredPlayerName);
    } else {
      localStorage.removeItem('neon-breakout-player-name');
    }
    if (pendingScoreEntry.isNewRecord) {
      highScoreName = activePlayerName;
      localStorage.setItem('neon-breakout-high-score-name', highScoreName);
    }
  } catch (error) {
    console.error('Could not save player name:', error);
  }

  pendingScoreEntry = null;
  highScoreDialog.close();
  renderLeaderboard();
});
function openMenu() {
  if (!startScreen.hidden || menuDialog.open || highScoreDialog?.open) return;
  gamePaused = true;
  renderLeaderboard();
  menuDialog.showModal();
}

function toggleMenu() {
  if (menuDialog.open) {
    menuDialog.close();
  } else {
    openMenu();
  }
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch (error) {
    console.error('Could not toggle fullscreen:', error);
  }
}

function updateFullscreenButton() {
  const active = Boolean(document.fullscreenElement);
  fullscreenButton.textContent = active ? '🗗' : '⛶';
  fullscreenButton.setAttribute('aria-label', t(active ? 'exitFullscreen' : 'fullscreen'));
  fullscreenButton.title = t(active ? 'exitFullscreen' : 'fullscreen');
}

function isInteractiveElement(target) {
  return target instanceof HTMLElement && Boolean(target.closest('button, input, select, textarea, dialog'));
}

function moveDialogFocus(direction) {
  const dialog = menuDialog.open ? menuDialog : highScoreDialog?.open ? highScoreDialog : null;
  if (!dialog) return;
  const controls = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled])')];
  if (controls.length === 0) return;
  const currentIndex = controls.indexOf(document.activeElement);
  const nextIndex = currentIndex < 0
    ? 0
    : (currentIndex + direction + controls.length) % controls.length;
  controls[nextIndex].focus();
}

function pollGamepad() {
  const gamepad = [...(navigator.getGamepads?.() || [])].find(Boolean);
  if (!gamepad) {
    gamepadAxis = 0;
    previousGamepadButtons = [];
    requestAnimationFrame(pollGamepad);
    return;
  }

  const buttons = gamepad.buttons.map((button) => button.pressed);
  const justPressed = (index) => buttons[index] && !previousGamepadButtons[index];
  const stick = Math.abs(gamepad.axes[0] || 0) >= 0.18 ? gamepad.axes[0] : 0;
  const dpad = (buttons[15] ? 1 : 0) - (buttons[14] ? 1 : 0);
  gamepadAxis = dpad || stick;

  if (justPressed(0)) {
    if (!startScreen.hidden) {
      startGame();
    } else if (menuDialog.open || highScoreDialog?.open) {
      document.activeElement?.click?.();
    } else {
      launchBall();
    }
  }
  if (justPressed(1) && menuDialog.open) menuDialog.close();
  if (justPressed(9)) toggleMenu();
  if (justPressed(3)) toggleFullscreen();
  if (menuDialog.open || highScoreDialog?.open) {
    if (justPressed(12) || justPressed(14)) moveDialogFocus(-1);
    if (justPressed(13) || justPressed(15)) moveDialogFocus(1);
    gamepadAxis = 0;
  }

  previousGamepadButtons = buttons;
  requestAnimationFrame(pollGamepad);
}

menuButton?.addEventListener('click', openMenu);
fullscreenButton?.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', updateFullscreenButton);
closeMenuButton?.addEventListener('click', () => menuDialog.close());
document.querySelectorAll('[data-menu-target]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.menu-panel').forEach((panel) => panel.classList.remove('active'));
    document.querySelectorAll('[data-menu-target]').forEach((tab) => {
      const selected = tab === button;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    document.getElementById(button.dataset.menuTarget)?.classList.add('active');
  });
});
menuDialog?.addEventListener('close', () => {
  gamePaused = false;
});
difficultySelect.value = settings.difficulty;
languageSelect.value = settings.language;
soundToggle.checked = settings.sound;
effectsToggle.checked = settings.effects;
difficultySelect?.addEventListener('change', () => {
  settings.difficulty = difficultySelect.value;
  saveSettings();
});
languageSelect?.addEventListener('change', () => {
  const previousLanguage = settings.language;
  const nextLanguage = languageSelect.value === 'en' ? 'en' : 'no';

  try {
    settings.language = nextLanguage;
    applyTranslations();
    saveSettings();
    draw();
  } catch (error) {
    console.error('Could not change language:', error);
    settings.language = previousLanguage;
    languageSelect.value = previousLanguage;
    applyTranslations();
    draw();
  }
});
soundToggle?.addEventListener('change', () => {
  settings.sound = soundToggle.checked;
  saveSettings();
});
effectsToggle?.addEventListener('change', () => {
  settings.effects = effectsToggle.checked;
  if (!settings.effects) {
    particles.length = 0;
    floatingTexts.length = 0;
    shockwaves.length = 0;
    ballTrail.length = 0;
  }
  saveSettings();
});
applyTranslations();
updateFullscreenButton();
createBricks();
updateHud();
setStatus('ready');
draw();
requestAnimationFrame(pollGamepad);
