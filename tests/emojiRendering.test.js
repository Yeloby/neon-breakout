import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GAME_EMOJI, emojiTextRuns, measureEmojiText, paintEmojiText } from '../emoji-rendering.js';

test('the bundled emoji inventory covers every game sequence without changing Unicode', () => {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const found = new Set();
  for (const file of ['index.html', 'main.js', 'translations.js', 'breakoutGameLogic.js']) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    for (const { segment } of segmenter.segment(source)) {
      if (segment !== '©' && /\p{Extended_Pictographic}|\p{Emoji_Presentation}|\u20e3/u.test(segment)) found.add(segment);
    }
  }
  assert.deepEqual([...found].sort(), [...GAME_EMOJI].sort());
});

test('mixed text preserves digits, keycaps, selectors, and non-game text', () => {
  const text = '2 liv · 2️⃣ × 2 · 🛡️ · ↔️ · ©';
  const runs = emojiTextRuns(text);
  assert.equal(runs.map((run) => run.text).join(''), text);
  assert.deepEqual(runs.filter((run) => run.emoji).map((run) => run.text), ['2️⃣', '🛡️', '↔️']);
  assert.equal(emojiTextRuns('LEVEL 22')[0].emoji, false);
});

test('mixed canvas text uses the emoji face only for emoji and fits the whole line', () => {
  const calls = [];
  const ctx = {
    font: '800 12px Arial', textAlign: 'center', direction: 'ltr',
    measureText(text) { return { width: text === '2️⃣' ? 12 : 6 }; },
    save() { this.saved = { font: this.font, textAlign: this.textAlign }; },
    restore() { Object.assign(this, this.saved); },
    translate(x, y) { calls.push(['translate', x, y]); },
    scale(x, y) { calls.push(['scale', x, y]); },
    fillText(text, x, y) { calls.push([text, this.font, x, y]); }
  };
  assert.equal(measureEmojiText(ctx, '2️⃣ 2'), 18);
  paintEmojiText(ctx, '2️⃣ 2', 100, 20, 9);
  assert.deepEqual(calls, [
    ['translate', 100, 20], ['scale', 0.5, 1],
    ['2️⃣', '12px "Neon Breakout Emoji"', -9, 0], [' 2', '800 12px Arial', 3, 0]
  ]);
  assert.equal(ctx.font, '800 12px Arial');
  assert.equal(ctx.textAlign, 'center');
});
