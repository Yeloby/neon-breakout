// Run with Electron on Linux or Windows. An optional argument selects a packaged app.asar.
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const path = require('node:path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  const errors = [];
  win.webContents.on('console-message', (event) => {
    if (event.level === 'error') errors.push(event.message);
  });
  // Fail if testing ever attempts remote resources; file assets remain offline.
  win.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    const remote = /^https?:|^wss?:/.test(details.url);
    if (remote) errors.push(`Unexpected remote resource: ${details.url}`);
    callback({ cancel: remote });
  });
  try {
    const archive = process.argv.slice(2).find((argument) => argument.endsWith('.asar'));
    const root = archive ? path.resolve(archive) : path.join(__dirname, '..');
    await win.loadFile(path.join(root, 'index.html'));
    let result;
    let boosterChecks = 0;
    for (const width of [520, 560, 561, 720, 1280]) {
      win.setContentSize(width, 620);
      result = await win.webContents.executeJavaScript(`(async () => {
      const { GAME_EMOJI, loadEmojiFont, setEmojiText, paintEmojiText } = await import('./emoji-rendering.js');
      await loadEmojiFont();
      const { TRANSLATIONS } = await import('./translations.js');
      document.querySelector('dialog').showModal();
      document.querySelectorAll('.menu-panel').forEach(panel => panel.classList.remove('active'));
      document.querySelector('#boostersPanel').classList.add('active');
      const rows = [...document.querySelectorAll('.booster-list > li')];
      let boosterChecks = 0;
      for (const width of [window.innerWidth]) {
        for (const dictionary of Object.values(TRANSLATIONS)) {
          for (const row of rows) {
            const text = dictionary[row.dataset.i18n];
            setEmojiText(row, text);
            const icon = row.firstElementChild;
            const label = row.lastElementChild;
            if (row.children.length !== 2 || icon.className !== 'game-emoji' ||
                label.className !== 'booster-label' || row.textContent !== text)
              throw new Error('Booster structure/Unicode changed: ' + text);
            const box = row.getBoundingClientRect();
            const i = icon.getBoundingClientRect(), l = label.getBoundingClientRect();
            if (Math.abs(l.left - i.right - 8) > 0.1 ||
                Math.abs(i.top + i.height / 2 - l.top - l.height / 2) > 0.1 ||
                parseFloat(getComputedStyle(icon).fontSize) < parseFloat(getComputedStyle(label).fontSize) * 1.24 ||
                getComputedStyle(label).fontFamily.includes('Neon Breakout Emoji') ||
                row.scrollWidth > row.clientWidth || i.top < box.top || i.bottom > box.bottom)
              throw new Error('Booster spacing/alignment/overflow failed: ' + width + ' ' + text);
            // Compare with the original flex row: emoji plus an anonymous text item.
            row.style.gap = '0px'; icon.style.fontSize = 'inherit'; icon.style.lineHeight = 'inherit';
            label.replaceWith(document.createTextNode(label.textContent));
            const original = row.getBoundingClientRect();
            if (Math.abs(original.height - box.height) > 0.1 || Math.abs(original.width - box.width) > 0.1)
              throw new Error('Booster row dimensions changed: ' + width + ' ' + text);
            row.style.removeProperty('gap');
            setEmojiText(row, text);
            boosterChecks++;
          }
        }
      }
      document.querySelector('dialog').close();
      const container = document.createElement('div');
      container.id = 'emoji-check-container';
      container.style = 'position:fixed;inset:0;z-index:9999;background:white;color:black;font-size:30px';
      document.body.append(container);
      for (const [index, text] of GAME_EMOJI.entries()) {
        const span = document.createElement('span');
        span.id = 'emoji-check-' + index;
        setEmojiText(span, text);
        container.append(span);
      }
      container.getBoundingClientRect();
      const c = document.createElement('canvas'); c.width = 400; c.height = 60;
      const ctx = c.getContext('2d');
      ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      paintEmojiText(ctx, '2️⃣ × 22 · 🛡️ · 🐢', 200, 30, 390);
      return { count: GAME_EMOJI.length, boosterChecks, text: container.textContent,
        expected: GAME_EMOJI.join(''), ink: ctx.getImageData(0, 0, 400, 60).data.some(v => v !== 0) };
    })()`);
      boosterChecks += result.boosterChecks;
      if (width !== 1280) await win.webContents.executeJavaScript("document.querySelector('#emoji-check-container').remove()");
    }
    // Force layout/paint before Chromium's platform-font diagnostic.
    await new Promise((resolve) => setTimeout(resolve, 250));
    const debuggerApi = win.webContents.debugger;
    debuggerApi.attach('1.3');
    await debuggerApi.sendCommand('DOM.enable');
    await debuggerApi.sendCommand('CSS.enable');
    const { root: documentRoot } = await debuggerApi.sendCommand('DOM.getDocument');
    for (let index = 0; index < result.count; index += 1) {
      const { nodeId } = await debuggerApi.sendCommand('DOM.querySelector', {
        nodeId: documentRoot.nodeId, selector: `#emoji-check-${index} .game-emoji`
      });
      const { fonts } = await debuggerApi.sendCommand('CSS.getPlatformFontsForNode', { nodeId });
      assert.equal(fonts.length, 1, `Emoji ${index} must not use a fallback font`);
      assert.equal(fonts[0].isCustomFont, true);
      assert.equal(fonts[0].familyName, 'Neon Breakout Emoji');
      assert.equal(fonts[0].glyphCount, 1, `Emoji ${index} must shape to one glyph`);
    }
    assert.equal(result.text, result.expected);
    assert.equal(result.ink, true);
    assert.deepEqual(errors, []);
    console.log(`Verified ${result.count} emoji: local bundled font, one glyph each, original Unicode, mixed canvas text.`);
    console.log(`Verified ${boosterChecks} booster rows across all languages and five window widths: spacing, size, alignment, no overflow, unchanged row dimensions.`);
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
