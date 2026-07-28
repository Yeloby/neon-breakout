import test from 'node:test';
import assert from 'node:assert/strict';
import { addLeaderboardEntry, bounceOffWalls, calculateBrickScore, collideWithPaddle, resolveBrickCollision, getBrickCrackLines, getBrickHealth, getLevelLayout, getMultiballVelocities, applyPowerUp, getLaunchVelocityFromPointer, pickWeightedPowerUp } from '../breakoutGameLogic.js';

test('bounceOffWalls reverses horizontal velocity when the ball hits a vertical wall', () => {
  const ball = { x: 6, y: 40, radius: 6, vx: -4, vy: 2 };

  const bounced = bounceOffWalls(ball, 100, 100);

  assert.equal(bounced.vx, 4);
  assert.equal(bounced.x, 6);
});

test('collideWithPaddle reverses the vertical direction when the ball hits the paddle', () => {
  const ball = { x: 50, y: 80, radius: 6, vx: 2, vy: 4 };
  const paddle = { x: 30, y: 85, width: 40, height: 10 };

  const hit = collideWithPaddle(ball, paddle);

  assert.equal(hit, true);
  assert.equal(ball.vy < 0, true);
  assert.equal(ball.y, 79);
});

test('collideWithPaddle ignores a ball moving upward below the paddle', () => {
  const ball = { x: 50, y: 88, radius: 6, vx: 2, vy: -4 };
  const paddle = { x: 30, y: 85, width: 40, height: 10 };

  assert.equal(collideWithPaddle(ball, paddle), false);
  assert.equal(ball.vy, -4);
});

test('resolveBrickCollision removes a brick and returns a hit when the ball intersects it', () => {
  const ball = { x: 20, y: 20, radius: 6, vx: 2, vy: 3 };
  const brick = { x: 10, y: 10, width: 20, height: 10, health: 1 };

  const result = resolveBrickCollision(ball, brick);

  assert.equal(result.hit, true);
  assert.equal(result.brick.alive, false);
  assert.equal(result.axis, 'y');
});

test('resolveBrickCollision identifies a collision on the side of a brick', () => {
  const ball = { x: 5, y: 20, radius: 6, vx: 2, vy: 1 };
  const brick = { x: 10, y: 10, width: 20, height: 20, health: 1 };

  assert.equal(resolveBrickCollision(ball, brick).axis, 'x');
});

test('reinforced bricks lose one health and remain active until the final hit', () => {
  const ball = { x: 20, y: 20, radius: 6, vx: 2, vy: 3 };
  const brick = { x: 10, y: 10, width: 20, height: 10, health: 3, maxHealth: 3 };

  const firstHit = resolveBrickCollision(ball, brick);
  const secondHit = resolveBrickCollision(ball, firstHit.brick);
  const finalHit = resolveBrickCollision(ball, secondHit.brick);

  assert.equal(firstHit.destroyed, false);
  assert.equal(firstHit.brick.health, 2);
  assert.equal(firstHit.brick.alive, true);
  assert.equal(secondHit.brick.health, 1);
  assert.equal(finalHit.destroyed, true);
  assert.equal(finalHit.brick.health, 0);
  assert.equal(finalHit.brick.alive, false);
});

test('reinforced and armored bricks are introduced gradually from level three', () => {
  const earlyHealth = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 8 }, (_, col) => getBrickHealth(2, row, col))
  ).flat();
  const laterHealth = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 8 }, (_, col) => getBrickHealth(10, row, col))
  ).flat();

  assert.deepEqual(new Set(earlyHealth), new Set([1]));
  assert.equal(laterHealth.some((health) => health === 2), true);
  assert.equal(laterHealth.some((health) => health === 3), true);
  assert.equal(laterHealth.every((health) => health >= 1 && health <= 3), true);
});

test('damaged bricks have stable, varied crack patterns that intensify after another hit', () => {
  const firstPattern = getBrickCrackLines(0, 1);
  const secondPattern = getBrickCrackLines(1, 1);

  assert.notDeepEqual(firstPattern, secondPattern);
  assert.deepEqual(getBrickCrackLines(0, 1), firstPattern);
  assert.equal(getBrickCrackLines(0, 2).length > firstPattern.length, true);
  assert.deepEqual(getBrickCrackLines(0, 0), []);
});

test('multiball creates two upward-moving balls in different directions', () => {
  const velocities = getMultiballVelocities(4, -4);

  assert.equal(velocities.length, 2);
  assert.equal(velocities[0].vx < 0, true);
  assert.equal(velocities[1].vx > 0, true);
  assert.equal(velocities.every(({ vy }) => vy < 0), true);
});

test('getLevelLayout creates a different pattern for later levels', () => {
  const levelOne = getLevelLayout(1, 4, 3);
  const levelTwo = getLevelLayout(2, 4, 3);

  assert.notDeepEqual(levelOne, levelTwo);
  assert.equal(levelOne.filter((row) => row.some(Boolean)).length > 0, true);
});

test('getLevelLayout cycles through twelve distinct block formations', () => {
  const layouts = Array.from({ length: 12 }, (_, index) => getLevelLayout(index + 1, 8, 5));
  const serializedLayouts = new Set(layouts.map((layout) => JSON.stringify(layout)));
  const blockCounts = new Set(layouts.map((layout) => layout.flat().filter(Boolean).length));

  assert.equal(serializedLayouts.size, 12);
  assert.equal(blockCounts.size >= 6, true);
  assert.equal(layouts.every((layout) => layout.flat().some(Boolean)), true);
  assert.deepEqual(getLevelLayout(13, 8, 5), layouts[0]);
});

test('five width powerups grow the paddle from its starting width to its maximum', () => {
  const state = {
    paddle: { width: 80 },
    ball: { vx: 4, vy: -4 },
    score: 0,
    startingPaddleWidth: 80,
    maxPaddleWidth: 160
  };

  let updated = state;
  for (let index = 0; index < 5; index += 1) {
    updated = applyPowerUp({ type: 'wide' }, updated);
  }
  const capped = applyPowerUp({ type: 'wide' }, updated);

  assert.equal(updated.paddle.width, 160);
  assert.equal(capped.paddle.width, 160);
});

test('applyPowerUp adds bonus score for score powerups', () => {
  const state = { paddle: { width: 80 }, ball: { vx: 4, vy: -4 }, score: 20 };

  const updated = applyPowerUp({ type: 'score' }, state);

  assert.equal(updated.score, 70);
});

test('fixed powerup rewards scale with difficulty', () => {
  const state = {
    paddle: { width: 80 },
    ball: { vx: 4, vy: -4 },
    score: 0
  };

  assert.equal(applyPowerUp({ type: 'score' }, { ...state, difficultyMultiplier: 0.8 }).score, 40);
  assert.equal(applyPowerUp({ type: 'score' }, { ...state, difficultyMultiplier: 1 }).score, 50);
  assert.equal(applyPowerUp({ type: 'score' }, { ...state, difficultyMultiplier: 1.4 }).score, 70);
  assert.equal(applyPowerUp({ type: 'bonus' }, { ...state, difficultyMultiplier: 1.4 }).score, 42);
  assert.equal(applyPowerUp({ type: 'multi' }, { ...state, difficultyMultiplier: 1.4 }).score, 28);
  assert.equal(applyPowerUp({ type: 'jackpot' }, { ...state, difficultyMultiplier: 1.4 }).score, 140);
});

test('applyPowerUp slows the ball without changing its direction', () => {
  const state = { paddle: { width: 80 }, ball: { vx: -4, vy: 4 }, score: 0 };

  const updated = applyPowerUp({ type: 'slow' }, state);

  assert.equal(updated.ball.vx, -2.2);
  assert.equal(updated.ball.vy, 2.2);
});

test('turtle slows the ball more strongly than feather', () => {
  const state = { paddle: { width: 80 }, ball: { vx: 6, vy: -6 }, score: 0 };

  const turtle = applyPowerUp({ type: 'slow' }, state);
  const feather = applyPowerUp({ type: 'gravity' }, state);

  assert.equal(Math.hypot(turtle.ball.vx, turtle.ball.vy) < Math.hypot(feather.ball.vx, feather.ball.vy), true);
  assert.equal(turtle.ball.vx, 3.3000000000000003);
  assert.equal(feather.ball.vx, 4.32);
});

test('applyPowerUp grants a shield charge and speeds up the ball for turbo pickups', () => {
  const state = { paddle: { width: 80 }, ball: { vx: 4, vy: -4 }, score: 20 };

  const shielded = applyPowerUp({ type: 'shield' }, state);
  const multi = applyPowerUp({ type: 'multi' }, state);

  assert.equal(shielded.shieldCharges, 1);
  assert.equal(multi.ball.vx > 4, true);
});

test('applyPowerUp grants an extra life up to a maximum of five', () => {
  const state = { paddle: { width: 80 }, ball: { vx: 4, vy: -4 }, score: 0, lives: 3 };

  assert.equal(applyPowerUp({ type: 'life' }, state).lives, 4);
  assert.equal(applyPowerUp({ type: 'life' }, { ...state, lives: 5 }).lives, 5);
});

test('getLaunchVelocityFromPointer returns a normalized vector toward the pointer', () => {
  const velocity = getLaunchVelocityFromPointer(300, 200, 240, 560, 7);

  assert.equal(velocity.vx > 0, true);
  assert.equal(velocity.vy < 0, true);
  assert.equal(Math.abs(velocity.vx) + Math.abs(velocity.vy) > 0, true);
});

test('addLeaderboardEntry keeps independently named scores in descending order', () => {
  const entries = [
    { id: 'a', name: 'Ada', score: 100 },
    { id: 'b', name: 'Bo', score: 80 },
    { id: 'c', name: 'Cia', score: 60 },
    { id: 'd', name: 'Dan', score: 40 }
  ];

  const updated = addLeaderboardEntry(entries, { id: 'e', name: 'Eva', score: 90 });

  assert.deepEqual(updated.map((entry) => entry.name), ['Ada', 'Eva', 'Bo', 'Cia', 'Dan']);
});

test('addLeaderboardEntry limits the leaderboard to ten scores', () => {
  const entries = Array.from({ length: 10 }, (_, index) => ({
    id: String(index),
    name: `Player ${index}`,
    score: 100 - index
  }));

  const updated = addLeaderboardEntry(entries, { id: 'new', name: 'New', score: 95.5 });

  assert.equal(updated.length, 10);
  assert.equal(updated.some((entry) => entry.id === 'new'), true);
});

test('addLeaderboardEntry preserves separate players with equal scores', () => {
  const updated = addLeaderboardEntry(
    [{ id: 'a', name: 'Ada', score: 100 }],
    { id: 'b', name: 'Bo', score: 100 }
  );

  assert.equal(updated.length, 2);
  assert.deepEqual(updated.map((entry) => entry.id), ['a', 'b']);
});

test('addLeaderboardEntry preserves the selected difficulty', () => {
  const updated = addLeaderboardEntry([], {
    id: 'hard-score',
    name: 'Ada',
    score: 140,
    difficulty: 'hard'
  });

  assert.equal(updated[0].difficulty, 'hard');
});

test('pickWeightedPowerUp respects configured rarity weights', () => {
  const powerUps = [
    { type: 'common', weight: 9 },
    { type: 'rare', weight: 1 }
  ];

  assert.equal(pickWeightedPowerUp(powerUps, 0.5).type, 'common');
  assert.equal(pickWeightedPowerUp(powerUps, 0.95).type, 'rare');
});

test('double and jackpot powerups provide distinct score rewards', () => {
  const state = {
    paddle: { width: 80 },
    ball: { vx: 4, vy: -4 },
    score: 20,
    scoreMultiplier: 1,
    multiplierTimer: 0
  };

  const doubled = applyPowerUp({ type: 'double' }, state);
  const jackpot = applyPowerUp({ type: 'jackpot' }, state);

  assert.equal(doubled.scoreMultiplier, 2);
  assert.equal(doubled.multiplierTimer, 600);
  assert.equal(jackpot.score, 120);
});

test('lightning powerup starts an eight-second scoring effect and widens by one step', () => {
  const state = {
    paddle: { width: 80 },
    ball: { vx: 4, vy: -4 },
    score: 20,
    startingPaddleWidth: 80,
    maxPaddleWidth: 160
  };

  const electrified = applyPowerUp({ type: 'bonus' }, state);

  assert.equal(electrified.lightningTimer, 480);
  assert.equal(electrified.paddle.width, 96);
  assert.equal(electrified.score, 50);
});

test('brick scores scale with difficulty, combo, double points and lightning', () => {
  assert.equal(calculateBrickScore({ difficultyMultiplier: 0.8 }), 8);
  assert.equal(calculateBrickScore({ difficultyMultiplier: 1 }), 10);
  assert.equal(calculateBrickScore({ difficultyMultiplier: 1.4 }), 14);
  assert.equal(calculateBrickScore({
    combo: 3,
    scoreMultiplier: 2,
    difficultyMultiplier: 1.4,
    lightningActive: true
  }), 63);
  assert.equal(calculateBrickScore({ baseScore: 4, difficultyMultiplier: 1.4 }), 6);
});

test('catch and fireball powerups grant limited-use abilities', () => {
  const state = {
    paddle: { width: 80 },
    ball: { vx: 4, vy: -4 },
    catchCharges: 0,
    piercingHits: 0
  };

  assert.equal(applyPowerUp({ type: 'catch' }, state).catchCharges, 1);
  assert.equal(applyPowerUp({ type: 'fireball' }, state).piercingHits, 5);
});
