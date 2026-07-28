export function bounceOffWalls(ball, width, height) {
  const next = { ...ball };

  if (next.x - next.radius <= 0) {
    next.x = next.radius;
    next.vx = Math.abs(next.vx);
  } else if (next.x + next.radius >= width) {
    next.x = width - next.radius;
    next.vx = -Math.abs(next.vx);
  }

  if (next.y - next.radius <= 0) {
    next.y = next.radius;
    next.vy = Math.abs(next.vy);
  }

  return next;
}

export function collideWithPaddle(ball, paddle) {
  if (ball.vy <= 0) return false;

  const ballBottom = ball.y + ball.radius;
  const paddleTop = paddle.y;
  const paddleLeft = paddle.x;
  const paddleRight = paddle.x + paddle.width;

  if (
    ballBottom >= paddleTop &&
    ball.y <= paddleTop + paddle.height &&
    ball.x >= paddleLeft &&
    ball.x <= paddleRight
  ) {
    ball.y = paddleTop - ball.radius;
    ball.vy = -Math.abs(ball.vy);
    const offset = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    ball.vx = offset * 5;
    return true;
  }

  return false;
}

export function resolveBrickCollision(ball, brick) {
  if (!brick || brick.alive === false) return { hit: false, brick };

  const ballLeft = ball.x - ball.radius;
  const ballRight = ball.x + ball.radius;
  const ballTop = ball.y - ball.radius;
  const ballBottom = ball.y + ball.radius;
  const brickLeft = brick.x;
  const brickRight = brick.x + brick.width;
  const brickTop = brick.y;
  const brickBottom = brick.y + brick.height;

  const intersects =
    ballRight >= brickLeft &&
    ballLeft <= brickRight &&
    ballBottom >= brickTop &&
    ballTop <= brickBottom;

  if (intersects) {
    const overlapLeft = ballRight - brickLeft;
    const overlapRight = brickRight - ballLeft;
    const overlapTop = ballBottom - brickTop;
    const overlapBottom = brickBottom - ballTop;
    const horizontalOverlap = Math.min(overlapLeft, overlapRight);
    const verticalOverlap = Math.min(overlapTop, overlapBottom);
    const currentHealth = Math.max(1, brick.health || 1);
    const remainingHealth = currentHealth - 1;
    const nextBrick = {
      ...brick,
      health: remainingHealth,
      alive: remainingHealth > 0
    };
    return {
      hit: true,
      brick: nextBrick,
      destroyed: remainingHealth === 0,
      axis: horizontalOverlap < verticalOverlap ? 'x' : 'y'
    };
  }

  return { hit: false, brick, axis: null };
}

export function getLevelLayout(level, cols, rows) {
  const layout = Array.from({ length: rows }, () => Array(cols).fill(0));
  const pattern = ((level - 1) % 12 + 12) % 12;
  const centerCol = (cols - 1) / 2;
  const centerRow = (rows - 1) / 2;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const normalizedCol = Math.abs(col - centerCol) / Math.max(1, centerCol);
      const normalizedRow = Math.abs(row - centerRow) / Math.max(1, centerRow);
      let occupied = false;

      switch (pattern) {
        case 0: // Klassisk vegg
          occupied = true;
          break;
        case 1: // Sjakkbrett
          occupied = (row + col) % 2 === 0;
          break;
        case 2: // Pyramide
          occupied = normalizedCol <= (row + 1) / rows;
          break;
        case 3: // Omvendt pyramide
          occupied = normalizedCol <= (rows - row) / rows;
          break;
        case 4: // Diamant
          occupied = normalizedCol + normalizedRow <= 1.15;
          break;
        case 5: // Ramme
          occupied = row === 0 || row === rows - 1 || col === 0 || col === cols - 1;
          break;
        case 6: // Sikksakk
          occupied = (col + row * 2) % 4 < 2;
          break;
        case 7: // Kryss
          occupied = Math.abs(col - centerCol) < 1 || Math.abs(row - centerRow) < 1;
          break;
        case 8: // Festning med porter
          occupied = row < 2 || col % 3 !== 1 || row === rows - 1;
          break;
        case 9: // Bølger
          occupied = (row + Math.floor(col / 2)) % 3 !== 2;
          break;
        case 10: // Fire øyer
          occupied = normalizedCol > 0.28 && normalizedRow > 0.2;
          break;
        case 11: // Pilspiss
          occupied = Math.abs(row - centerRow) <= Math.abs(col - centerCol) * 0.55;
          break;
      }

      layout[row][col] = occupied ? 1 : 0;
    }
  }

  return layout;
}

export function getBrickHealth(level, row, col) {
  if (level < 3) return 1;

  const roll = (level * 17 + row * 29 + col * 37) % 100;
  const armoredChance = level >= 6 ? Math.min(24, 4 + (level - 6) * 2) : 0;
  const reinforcedChance = Math.min(44, 14 + (level - 3) * 3);

  if (roll < armoredChance) return 3;
  if (roll < armoredChance + reinforcedChance) return 2;
  return 1;
}

export function applyPowerUp(powerUp, state) {
  if (!powerUp) return state;

  const nextState = {
    ...state,
    paddle: { ...state.paddle },
    ball: { ...state.ball }
  };
  const difficultyMultiplier = nextState.difficultyMultiplier || 1;

  if (powerUp.type === 'wide') {
    widenPaddle(nextState);
  }

  if (powerUp.type === 'slow') {
    nextState.ball.vx = scaleVelocity(nextState.ball.vx, 0.55, 1.8);
    nextState.ball.vy = scaleVelocity(nextState.ball.vy, 0.55, 1.8);
  }

  if (powerUp.type === 'score') {
    nextState.score = (nextState.score || 0) + Math.round(50 * difficultyMultiplier);
  }

  if (powerUp.type === 'bonus') {
    nextState.score = (nextState.score || 0) + Math.round(30 * difficultyMultiplier);
    nextState.lightningTimer = 480;
    widenPaddle(nextState);
  }

  if (powerUp.type === 'multi') {
    nextState.score = (nextState.score || 0) + Math.round(20 * difficultyMultiplier);
    nextState.ball.vx = nextState.ball.vx * 1.12;
    nextState.ball.vy = nextState.ball.vy * 1.12;
  }

  if (powerUp.type === 'shield') {
    nextState.shieldCharges = Math.min(2, (nextState.shieldCharges || 0) + 1);
  }

  if (powerUp.type === 'gravity') {
    nextState.ball.vx = scaleVelocity(nextState.ball.vx, 0.72, 2);
    nextState.ball.vy = scaleVelocity(nextState.ball.vy, 0.72, 2);
  }

  if (powerUp.type === 'double') {
    nextState.scoreMultiplier = 2;
    nextState.multiplierTimer = 600;
  }

  if (powerUp.type === 'jackpot') {
    nextState.score = (nextState.score || 0) + Math.round(100 * difficultyMultiplier);
  }

  if (powerUp.type === 'focus') {
    nextState.ball.vx *= 0.7;
    nextState.ball.vy *= 1.15;
  }

  if (powerUp.type === 'catch') {
    nextState.catchCharges = Math.min(3, (nextState.catchCharges || 0) + 1);
  }

  if (powerUp.type === 'fireball') {
    nextState.piercingHits = Math.min(8, (nextState.piercingHits || 0) + 5);
  }

  if (powerUp.type === 'life') {
    nextState.lives = Math.min(5, (nextState.lives || 0) + 1);
  }

  return nextState;
}

function widenPaddle(state) {
  const maximumWidth = state.maxPaddleWidth || 160;
  const startingWidth = state.startingPaddleWidth || state.paddle.width;
  const widthStep = (maximumWidth - startingWidth) / 5;
  state.paddle.width = Math.min(maximumWidth, state.paddle.width + widthStep);
}

export function calculateBrickScore({
  combo = 0,
  scoreMultiplier = 1,
  difficultyMultiplier = 1,
  lightningActive = false,
  baseScore = 10
} = {}) {
  const comboMultiplier = 1 + Math.floor(combo / 3) * 0.5;
  const lightningMultiplier = lightningActive ? 1.5 : 1;
  return Math.round(baseScore * comboMultiplier * scoreMultiplier * difficultyMultiplier * lightningMultiplier);
}

function scaleVelocity(velocity, factor, minimumMagnitude) {
  if (velocity === 0) return 0;
  return Math.sign(velocity) * Math.max(minimumMagnitude, Math.abs(velocity * factor));
}

export function getLaunchVelocityFromPointer(pointerX, pointerY, ballX, ballY, speed = 7) {
  const dx = pointerX - ballX;
  const dy = pointerY - ballY;
  const distance = Math.max(1, Math.hypot(dx, dy));
  return {
    vx: (dx / distance) * speed,
    vy: (dy / distance) * speed
  };
}

export function addLeaderboardEntry(entries, entry, limit = 10) {
  return [...entries, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function pickWeightedPowerUp(powerUps, randomValue = Math.random()) {
  const totalWeight = powerUps.reduce((sum, powerUp) => sum + powerUp.weight, 0);
  let threshold = randomValue * totalWeight;

  for (const powerUp of powerUps) {
    threshold -= powerUp.weight;
    if (threshold < 0) return powerUp;
  }

  return powerUps.at(-1);
}
