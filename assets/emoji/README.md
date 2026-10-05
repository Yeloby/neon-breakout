# Canonical game emoji

These glyphs come from the Ubuntu installation used to verify Neon Breakout:
`/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf`, package
`fonts-noto-color-emoji` **2.051-1build1**.

Font version: `2.051;GOOG;noto-emoji:20250818:e92753bfa55fd449e427d4d325f9c8c40408c74e`.
Source SHA-256: `9fd0a3d0ce84d77e3185dfbae77bd1abf3926aa49a032e354d076c4f17151f10`.

Electron 43.2.0 font diagnostics confirmed Noto Color Emoji for every sequence in
the game's canvas font stack. Ubuntu fontconfig also selects this font for emoji.
The subset retains the source CBDT/CBLC bitmaps, glyph metrics, GSUB keycap
ligature and variation selectors. Bitmap bytes and metrics were checked against
that source; no emoji artwork is changed. The internal subset family is renamed
**Neon Breakout Emoji**.

Inventory (original Unicode sequences):
🐢 💖 2️⃣ 🧲 🔥 🛡️ ↔️ 🎯 💎 ⚡ 🚀 🫧 🪶 🎰 ✨ 💥 🎮 ⏸

© is a copyright text symbol, not a game emoji. The fullscreen symbols 🗗 and ⛶
are text controls, not emoji. Text and ordinary digits retain the existing fonts;
only the inventoried emoji use this subset. This avoids rendering ordinary `2`
with the font's digit glyph needed by `2️⃣`.

## Offline rendering and packaging

`@font-face` loads the local WOFF2 file; startup awaits it before drawing. DOM
emoji runs use `.game-emoji`; mixed canvas text switches fonts only for emoji.
No native emoji family, CDN, network connection, font installation, or new
renderer privileges are required.

The Windows-compatible tables follow Noto's approach: BMP cmap plus empty glyph
outlines. A .notdef outline prevents Chromium's webfont sanitizer rejecting an
entirely empty glyf table. Emoji still render from their original color bitmaps.
Chromium supports the CBDT/CBLC format on supported Windows versions.

The assets directory and rendering module are in electron-builder's shared
`files` list, including Windows installer, portable and Store targets, and Linux
packages. Snap and Flatpak consume that same `resources/app.asar`; they require
no additional font plugs, permissions, or system packages.

## License and regeneration

The subset is **SIL Open Font License 1.1**, Copyright 2022 Google Inc.
`OFL.txt` is bundled with the font. This third-party font retains its OFL license;
the application's GPL license does not replace it.

Regenerate from the pinned source, without upgrading its artwork:

```sh
python3 -m pip install 'fonttools[woff]==4.66.1'
python3 scripts/subset-emoji-font.py /path/to/NotoColorEmoji.ttf
```

The generator checks the source checksum. The 18-sequence subset is about
34 KB, rather than bundling the 11 MB source font. Include newly added emoji in
both `GAME_EMOJI` and the generator, regenerate, and run tests before packaging.

Upstream: https://github.com/googlefonts/noto-emoji
Windows compatibility: https://github.com/googlefonts/noto-emoji/blob/main/add_glyphs.py
