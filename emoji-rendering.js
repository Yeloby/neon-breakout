// Exact Unicode sequences used by the game; do not normalize variation selectors.
export const GAME_EMOJI = Object.freeze([
  '🐢', '💖', '2️⃣', '🧲', '🔥', '🛡️', '↔️', '🎯', '💎',
  '⚡', '🚀', '🫧', '🪶', '🎰', '✨', '💥', '🎮', '⏸'
]);
const emoji = new Set(GAME_EMOJI);
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

export function emojiTextRuns(text) {
  const runs = [];
  for (const { segment } of segmenter.segment(String(text))) {
    const isEmoji = emoji.has(segment);
    const previous = runs.at(-1);
    if (previous && previous.emoji === isEmoji) previous.text += segment;
    else runs.push({ text: segment, emoji: isEmoji });
  }
  return runs;
}

export function setEmojiText(element, text) {
  const boosterRow = element.matches('.booster-list > li');
  element.replaceChildren(...emojiTextRuns(text).map((run) => {
    if (!run.emoji && !boosterRow) return document.createTextNode(run.text);
    const span = document.createElement('span');
    span.className = run.emoji ? 'game-emoji' : 'booster-label';
    span.textContent = run.text;
    return span;
  }));
}

function measuredRuns(ctx, text) {
  const textFont = ctx.font;
  const size = textFont.match(/\d+(?:\.\d+)?px/)[0];
  const runs = emojiTextRuns(text).map((run) => {
    const font = run.emoji ? `${size} "Neon Breakout Emoji"` : textFont;
    ctx.font = font;
    return { ...run, font, width: ctx.measureText(run.text).width };
  });
  ctx.font = textFont;
  return runs;
}

export function measureEmojiText(ctx, text) {
  return measuredRuns(ctx, text).reduce((width, run) => width + run.width, 0);
}

// Preserve canvas alignment, baseline, effects, and maxWidth fitting for mixed text.
export function paintEmojiText(ctx, text, x, y, maxWidth, stroke = false) {
  const runs = measuredRuns(ctx, text);
  const width = runs.reduce((sum, run) => sum + run.width, 0);
  const scale = width > maxWidth ? maxWidth / width : 1;
  const align = ctx.textAlign;
  const right = align === 'right' || (align === 'end' && ctx.direction !== 'rtl') ||
    (align === 'start' && ctx.direction === 'rtl');
  let offset = align === 'center' ? -width / 2 : right ? -width : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, 1);
  ctx.textAlign = 'left';
  for (const run of runs) {
    ctx.font = run.font;
    ctx[stroke ? 'strokeText' : 'fillText'](run.text, offset, 0);
    offset += run.width;
  }
  ctx.restore();
}

export async function loadEmojiFont() {
  const faces = await document.fonts.load('30px "Neon Breakout Emoji"', GAME_EMOJI.join(''));
  if (faces.length === 0) throw new Error('The bundled emoji font could not be loaded.');
}
