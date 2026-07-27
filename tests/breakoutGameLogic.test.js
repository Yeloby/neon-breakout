import test from 'node:test';
import assert from 'node:assert/strict';
import { addLeaderboardEntry, bounceOffWalls, collideWithPaddle, resolveBrickCollision, getLevelLayout, applyPowerUp, getLaunchVelocityFromPointer, pickWeightedPowerUp } from '../breakoutGameLogic.js';

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

test('getLevelLayout creates a different pattern for later levels', () => {
  const levelOne = getLevelLayout(1, 4, 3);
  const levelTwo = getLevelLayout(2, 4, 3);

  assert.notDeepEqual(levelOne, levelTwo);
  assert.equal(levelOne.filter((row) => row.some(Boolean)).length > 0, true);
});

test('applyPowerUp widens the paddle and slows the ball', () => {
  const state = { paddle: { width: 80 }, ball: { vx: 4, vy: -4 }, score: 0 };

  const updated = applyPowerUp({ type: 'wide' }, state);
  const slowed = applyPowerUp({ type: 'slow' }, updated);

  assert.equal(slowed.paddle.width, 112);
  assert.equal(slowed.ball.vx < 4, true);
});

test('applyPowerUp adds bonus score for score powerups', () => {
  const state = { paddle: { width: 80 }, ball: { vx: 4, vy: -4 }, score: 20 };

  const updated = applyPowerUp({ type: 'score' }, state);

  assert.equal(updated.score, 70);
});

test('applyPowerUp slows the ball without changing its direction', () => {
  const state = { paddle: { width: 80 }, ball: { vx: -4, vy: 4 }, score: 0 };

  const updated = applyPowerUp({ type: 'slow' }, state);

  assert.equal(updated.ball.vx, -3.2);
  assert.equal(updated.ball.vy, 3.2);
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
