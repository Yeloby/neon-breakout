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
    const nextBrick = { ...brick, alive: false };
    return {
      hit: true,
      brick: nextBrick,
      axis: horizontalOverlap < verticalOverlap ? 'x' : 'y'
    };
  }

  return { hit: false, brick, axis: null };
}

export function getLevelLayout(level, cols, rows) {
  const layout = Array.from({ length: rows }, () => Array(cols).fill(0));
  const pattern = level % 2 === 0 ? 1 : 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const offset = (row + col + pattern) % 3;
      layout[row][col] = offset === 0 ? 1 : 0;
    }
  }

  return layout;
}

export function applyPowerUp(powerUp, state) {
  if (!powerUp) return state;

  const nextState = {
    ...state,
    paddle: { ...state.paddle },
    ball: { ...state.ball }
  };

  if (powerUp.type === 'wide') {
    nextState.paddle.width = Math.min(160, nextState.paddle.width + 32);
  }

  if (powerUp.type === 'slow') {
    nextState.ball.vx = scaleVelocity(nextState.ball.vx, 0.8, 2);
    nextState.ball.vy = scaleVelocity(nextState.ball.vy, 0.8, 2);
  }

  if (powerUp.type === 'score') {
    nextState.score = (nextState.score || 0) + 50;
  }

  if (powerUp.type === 'bonus') {
    nextState.score = (nextState.score || 0) + 30;
    nextState.paddle.width = Math.min(160, nextState.paddle.width + 16);
  }

  if (powerUp.type === 'multi') {
    nextState.score = (nextState.score || 0) + 20;
    nextState.ball.vx = nextState.ball.vx * 1.12;
    nextState.ball.vy = nextState.ball.vy * 1.12;
  }

  if (powerUp.type === 'shield') {
    nextState.shieldCharges = Math.min(2, (nextState.shieldCharges || 0) + 1);
  }

  if (powerUp.type === 'gravity') {
    nextState.ball.vx = nextState.ball.vx * 0.9;
    nextState.ball.vy = scaleVelocity(nextState.ball.vy, 0.9, 2);
  }

  if (powerUp.type === 'double') {
    nextState.scoreMultiplier = 2;
    nextState.multiplierTimer = 600;
  }

  if (powerUp.type === 'jackpot') {
    nextState.score = (nextState.score || 0) + 100;
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
