import { addLeaderboardEntry, applyPowerUp, bounceOffWalls, calculateBrickScore, collideWithPaddle, getLaunchVelocityFromPointer, getLevelLayout, pickWeightedPowerUp, resolveBrickCollision } from './breakoutGameLogic.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const statusEl = document.getElementById('status');
const restartButton = document.getElementById('restartButton');
const highScoreEl = document.getElementById('highScore');
const leaderboardEl = document.getElementById('leaderboard');
const nameForm = document.getElementById('nameForm');
const playerNameInput = document.getElementById('playerName');
const menuButton = document.getElementById('menuButton');
const menuDialog = document.getElementById('menuDialog');
const closeMenuButton = document.getElementById('closeMenuButton');
const difficultySelect = document.getElementById('difficultySelect');
const soundToggle = document.getElementById('soundToggle');
const effectsToggle = document.getElementById('effectsToggle');
const menuLeaderboardEl = document.getElementById('menuLeaderboard');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PADDLE_HEIGHT = 14;
const PADDLE_Y = HEIGHT - 36;
const BALL_RADIUS = 6;
const MAX_PADDLE_WIDTH = 160;
const POWER_UP_RADIUS = 18;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_WIDTH = 46;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 8;
const DIFFICULTIES = {
  easy: { paddleWidth: 108, launchSpeed: 4.6, maxSpeed: 5.4, scoreMultiplier: 0.8, boosterChance: 0.38 },
  normal: { paddleWidth: 88, launchSpeed: 5.8, maxSpeed: 6.8, scoreMultiplier: 1, boosterChance: 0.32 },
  hard: { paddleWidth: 72, launchSpeed: 7, maxSpeed: 8.4, scoreMultiplier: 1.4, boosterChance: 0.26 }
};
const DIFFICULTY_LABELS = {
  easy: 'Lett',
  normal: 'Normal',
  hard: 'Vanskelig',
  unknown: 'Ukjent'
};
const settings = loadSettings();

let score = 0;
let level = 1;
let lives = 3;
let gameActive = true;
let animationFrameId = null;
let keys = { left: false, right: false };
let highScore = Number(localStorage.getItem('neon-breakout-high-score') || 0);
let highScoreName = localStorage.getItem('neon-breakout-high-score-name') || 'ANON';
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
let gamePaused = false;
let paddlePulse = 0;
let ballPulse = 0;
let leaderboard = loadLeaderboard();
let pendingLeaderboardEntryId = null;

const paddle = {
  x: WIDTH / 2 - DIFFICULTIES[settings.difficulty].paddleWidth / 2,
  y: PADDLE_Y,
  width: DIFFICULTIES[settings.difficulty].paddleWidth,
  height: PADDLE_HEIGHT
};
const ball = { x: WIDTH / 2, y: HEIGHT / 2, radius: BALL_RADIUS, vx: 4, vy: -4 };
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
      sound: stored.sound !== false,
      effects: stored.effects !== false
    };
  } catch {
    return { difficulty: 'normal', sound: true, effects: true };
  }
}

function saveSettings() {
  localStorage.setItem('neon-breakout-settings', JSON.stringify(settings));
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
  const palette = ['#22d3ee', '#f472b6', '#fb7185', '#a78bfa', '#facc15'];
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
    emptyEntry.textContent = 'Ingen rekord ennå.';
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
    difficulty.textContent = DIFFICULTY_LABELS[entry.difficulty] || DIFFICULTY_LABELS.unknown;
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
    text: `NIVÅ ${level}!`,
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
    { type: 'shield', symbol: '🛡️', color: '#34d399', weight: 2 },
    { type: 'gravity', symbol: '🪶', color: '#f59e0b', weight: 3 },
    { type: 'focus', symbol: '🎯', color: '#818cf8', weight: 3 },
    { type: 'catch', symbol: '🧲', color: '#2dd4bf', weight: 3 },
    { type: 'fireball', symbol: '🔥', color: '#fb923c', weight: 2 },
    { type: 'double', symbol: '2️⃣', color: '#e879f9', weight: 2 },
    { type: 'jackpot', symbol: '🎰', color: '#fde047', weight: 1 },
    { type: 'life', symbol: '❤️', color: '#f43f5e', weight: 1 }
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
      bricks.push({
        x: startX + col * (BRICK_WIDTH + BRICK_GAP),
        y: startY + row * (BRICK_HEIGHT + BRICK_GAP),
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        color: randomColor(),
        alive: true,
        health: 1
      });
    }
  }
}

function resetGame() {
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
  pendingLeaderboardEntryId = null;
  nameForm.hidden = true;
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
  createBricks();
  updateHud();
  statusEl.textContent = '';
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

  const levelHue = (195 + level * 24) % 360;
  ctx.fillStyle = `hsla(${levelHue}, 90%, 65%, 0.16)`;
  ctx.beginPath();
  ctx.ellipse(WIDTH * 0.25, HEIGHT * 0.22, 110, 70, -0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(70, 240, 255, 0.1)';
  ctx.beginPath();
  ctx.ellipse(WIDTH * 0.72, HEIGHT * 0.75, 140, 90, 0.35, 0, Math.PI * 2);
  ctx.fill();

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

  ctx.fillStyle = '#5b7cff';
  ctx.beginPath();
  ctx.arc(WIDTH * 0.82, HEIGHT * 0.16, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(WIDTH * 0.82 + 11, HEIGHT * 0.16 - 11, 9, 0, Math.PI * 2);
  ctx.fill();
}

function drawPaddle() {
  const pulse = 1 + Math.sin(paddlePulse) * 0.03;
  const width = paddle.width * pulse;
  const x = paddle.x + (paddle.width - width) / 2;
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.roundRect(x, paddle.y, width, paddle.height, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.stroke();
}

function drawBall() {
  const glow = 1 + Math.sin(ballPulse) * 0.12;
  const fireballActive = piercingHits > 0;
  const lightningActive = lightningTimer > 0;
  const drawRadius = fireballActive ? ball.radius * 1.45 : ball.radius;
  const gradient = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 2, ball.x, ball.y, drawRadius * glow);
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
  ctx.arc(ball.x, ball.y, drawRadius * glow, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBricks() {
  bricks.forEach((brick) => {
    if (!brick.alive) return;
    ctx.save();
    if (settings.effects) {
      ctx.shadowColor = brick.color;
      ctx.shadowBlur = 10 + Math.sin(performance.now() * 0.004 + brick.x) * 4;
    }
    ctx.fillStyle = brick.color;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
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
    ctx.shadowBlur = powerUp.type === 'bonus' ? 22 : 14;
    ctx.fillStyle = powerUp.color;
    ctx.beginPath();
    ctx.arc(0, 0, POWER_UP_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '24px "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(powerUp.symbol, 0, 0);
    ctx.restore();
  });
}

function updatePaddle() {
  if (keys.left) paddle.x = Math.max(0, paddle.x - 8);
  if (keys.right) paddle.x = Math.min(WIDTH - paddle.width, paddle.x + 8);

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
      const speedBeforePowerUp = Math.hypot(ball.vx, ball.vy);
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
      spawnImpactFeedback(powerUp.x, powerUp.y - 10, powerUp.symbol, powerUp.color, true);
      if (powerUp.type === 'slow' || powerUp.type === 'gravity') {
        const speedAfterPowerUp = Math.hypot(ball.vx, ball.vy);
        const remainingPercent = Math.round((speedAfterPowerUp / Math.max(0.01, speedBeforePowerUp)) * 100);
        const effectName = powerUp.type === 'slow' ? 'SKILPADDEFART' : 'SVEVEFART';
        statusEl.textContent = powerUp.type === 'slow'
          ? 'Skilpadde: ballen er kraftig bremset.'
          : 'Fjær: ballen svever merkbart saktere.';
        spawnImpactFeedback(WIDTH / 2, HEIGHT / 2, `${effectName} ${remainingPercent} %`, powerUp.color, false, 90);
        playTone(powerUp.type === 'slow' ? 190 : 310, 0.18, 'sine');
      }
      if (powerUp.type === 'multi') {
        playTone(980, 0.08, 'triangle');
      }
      if (powerUp.type === 'bonus') {
        spawnImpactFeedback(WIDTH / 2, HEIGHT / 2, 'LYNENERGI!', '#fde047', false, 90);
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
  const maxSpeed = difficulty.maxSpeed;
  const speedMagnitude = Math.hypot(ball.vx, ball.vy);
  if (speedMagnitude > maxSpeed) {
    const scale = maxSpeed / speedMagnitude;
    ball.vx *= scale;
    ball.vy *= scale;
  }
  ballLaunched = true;
  statusEl.textContent = '';
}

function updateBall() {
  if (!ballLaunched) return;

  ball.x += ball.vx;
  ball.y += ball.vy;
  if (settings.effects) {
    ballTrail.push({ x: ball.x, y: ball.y, life: 12, maxLife: 12 });
    if (ballTrail.length > 18) ballTrail.shift();
  }
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
  const maxSpeed = DIFFICULTIES[settings.difficulty].maxSpeed;
  const speedMagnitude = Math.hypot(ball.vx, ball.vy);
  if (speedMagnitude > maxSpeed) {
    const scale = maxSpeed / speedMagnitude;
    ball.vx *= scale;
    ball.vy *= scale;
  }

  if (collideWithPaddle(ball, paddle)) {
    playTone(520, 0.05, 'square');
    if (catchCharges > 0) {
      catchCharges -= 1;
      ballLaunched = false;
      pointerAim = null;
      ball.vx = 0;
      ball.vy = 0;
      statusEl.textContent = 'Ballen er fanget. Sikt og klikk for å skyte.';
    }
  }

  for (const brick of bricks) {
    if (!brick.alive) continue;
    const result = resolveBrickCollision(ball, brick);
    if (result.hit) {
      combo += 1;
      comboTimer = 90;
      const earnedScore = calculateBrickScore({
        combo,
        scoreMultiplier,
        difficultyMultiplier: DIFFICULTIES[settings.difficulty].scoreMultiplier,
        lightningActive: lightningTimer > 0
      });
      score += earnedScore;
      brick.alive = false;
      spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);
      spawnImpactFeedback(
        brick.x + brick.width / 2,
        brick.y,
        `+${earnedScore}`,
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
      if (Math.random() < DIFFICULTIES[settings.difficulty].boosterChance) {
        spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
      }
      const usedFireball = piercingHits > 0;
      if (usedFireball) {
        piercingHits -= 1;
        statusEl.textContent = piercingHits > 0
          ? `Ildball: ${piercingHits} gjennomtrengende treff igjen.`
          : 'Ildball-effekten er brukt opp.';
      } else if (result.axis === 'x') {
        ball.vx = -ball.vx;
      } else {
        ball.vy = -ball.vy;
      }
      playTone(680 + combo * 20, 0.06, 'triangle');
      if (combo >= 3 && !usedFireball) statusEl.textContent = `Kombo x${Math.floor(combo / 3) + 1}!`;
      break;
    }
  }

  if (ball.y - ball.radius > HEIGHT) {
    if (shieldCharges > 0) {
      shieldCharges -= 1;
      ball.y = HEIGHT - ball.radius;
      ball.vy = -Math.abs(ball.vy);
      statusEl.textContent = 'Skjoldet reddet ballen!';
      spawnImpactFeedback(ball.x, HEIGHT - 18, 'REDDET!', '#34d399', false, 75);
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
      powerUps.length = 0;
      statusEl.textContent = `Du mistet et liv. ${lives} liv igjen.`;
      spawnImpactFeedback(WIDTH / 2, HEIGHT / 2, 'LIV MISTET', '#f43f5e', false, 120);
      playTone(220, 0.12, 'sawtooth');
    } else {
      const enteredName = playerNameInput?.value?.trim();
      const playerName = enteredName || 'ANON';
      const entryId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      leaderboard = addLeaderboardEntry(leaderboard, {
        id: entryId,
        name: playerName,
        score,
        difficulty: settings.difficulty
      });
      const scoreWasAdded = leaderboard.some((entry) => entry.id === entryId);
      pendingLeaderboardEntryId = scoreWasAdded ? entryId : null;
      saveLeaderboard();

      if (score > highScore) {
        highScore = score;
        highScoreName = playerName;
        localStorage.setItem('neon-breakout-high-score', String(highScore));
        localStorage.setItem('neon-breakout-high-score-name', highScoreName);
        statusEl.textContent = 'Ny rekord! Skriv navn og trykk Lagre navn.';
      } else if (scoreWasAdded) {
        statusEl.textContent = 'Du kom på poengtavlen! Skriv navn og trykk Lagre navn.';
      } else {
        statusEl.textContent = 'Du tapte. Start på nytt for å prøve igjen.';
      }
      nameForm.hidden = !scoreWasAdded;
      if (scoreWasAdded) {
        playerNameInput.value = '';
        playerNameInput?.focus();
      }
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
    statusEl.textContent = `Nivå ${level} klart! Klikk på banen for å skyte ballen.`;
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
  drawImpactEffects();

  if (combo > 0) {
    ctx.save();
    ctx.fillStyle = combo >= 3 ? '#facc15' : '#7dd3fc';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`KOMBO ${combo}`, 20, 28);
    ctx.restore();
  }

  if (scoreMultiplier > 1) {
    ctx.save();
    ctx.fillStyle = '#e879f9';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`DOBLE POENG ${Math.ceil(multiplierTimer / 60)}s`, WIDTH - 20, 28);
    ctx.restore();
  }

  if (lightningTimer > 0) {
    ctx.save();
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 10;
    ctx.fillText(`⚡ LYNENERGI +50 %  ${Math.ceil(lightningTimer / 60)}s`, WIDTH / 2, 48);
    ctx.restore();
  }

  const activeEffects = [
    catchCharges > 0 ? `🧲 ${catchCharges}` : null,
    piercingHits > 0 ? `🔥 ${piercingHits}` : null,
    shieldCharges > 0 ? `🛡️ ${shieldCharges}` : null
  ].filter(Boolean);
  if (activeEffects.length > 0) {
    ctx.save();
    ctx.fillStyle = '#5eead4';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(activeEffects.join(' · '), WIDTH - 20, 46);
    ctx.restore();
  }

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
  ctx.restore();

}

function loop() {
  if (!gameActive) return;
  if (!gamePaused) {
    updatePaddle();
    updateParticles();
    updatePowerUps();
    updateBall();
  }
  draw();
  updateHud();
  animationFrameId = requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = true;
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = true;
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
menuButton?.addEventListener('click', () => {
  gamePaused = true;
  renderLeaderboard();
  menuDialog.showModal();
});
closeMenuButton?.addEventListener('click', () => menuDialog.close());
document.querySelectorAll('[data-menu-target]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.menu-panel').forEach((panel) => panel.classList.remove('active'));
    document.getElementById(button.dataset.menuTarget)?.classList.add('active');
  });
});
menuDialog?.addEventListener('close', () => {
  gamePaused = false;
});
difficultySelect.value = settings.difficulty;
soundToggle.checked = settings.sound;
effectsToggle.checked = settings.effects;
difficultySelect?.addEventListener('change', () => {
  settings.difficulty = difficultySelect.value;
  saveSettings();
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
const syncPlayerName = () => {
  const name = playerNameInput?.value?.trim() || 'ANON';
  playerNameInput.value = name;
  const pendingEntry = leaderboard.find((entry) => entry.id === pendingLeaderboardEntryId);
  if (pendingEntry?.score === highScore) {
    highScoreName = name;
    localStorage.setItem('neon-breakout-high-score-name', name);
  }

  leaderboard = leaderboard.map((entry) => {
    if (entry.id !== pendingLeaderboardEntryId) return entry;
    return { ...entry, name };
  });

  if (pendingLeaderboardEntryId) {
    saveLeaderboard();
    renderLeaderboard();
  }
};
nameForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  syncPlayerName();
  statusEl.textContent = '';
});

createBricks();
updateHud();
statusEl.textContent = '';
draw();
animationFrameId = requestAnimationFrame(loop);
