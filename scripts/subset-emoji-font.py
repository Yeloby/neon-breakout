"""Regenerate the offline font: python3 scripts/subset-emoji-font.py NotoColorEmoji.ttf.
Requires fonttools[woff]==4.66.1. Use the pinned Ubuntu source documented in assets/emoji/README.md.
"""
import hashlib
import sys
from pathlib import Path

from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
assert hashlib.sha256(source.read_bytes()).hexdigest() == '9fd0a3d0ce84d77e3185dfbae77bd1abf3926aa49a032e354d076c4f17151f10'
font = TTFont(source, recalcTimestamp=False)
# Keep GSUB ligatures and variation selectors for the original Unicode sequences.
subsetter = Subsetter(options=Options(name_IDs=['*'], name_legacy=True, name_languages=['*']))
subsetter.populate(text='🐢💖2️⃣🧲🔥🛡️↔️🎯💎⚡🚀🫧🪶🎰✨💥🎮⏸')
subsetter.subset(font)
# Noto's Windows-compatible variant adds empty outlines and a BMP cmap.
font['loca'] = newTable('loca')
font['glyf'] = newTable('glyf')
font['glyf'].glyphOrder = font.getGlyphOrder()
font['glyf'].glyphs = {g: TTGlyphPen(None).glyph() for g in font.getGlyphOrder()}
# Chromium's webfont sanitizer rejects a zero-length glyf table. A conventional
# .notdef outline keeps it valid; emoji themselves retain their original bitmaps.
pen = TTGlyphPen(None)
pen.moveTo((0, 0))
pen.lineTo((0, 100))
pen.lineTo((100, 100))
pen.lineTo((100, 0))
pen.closePath()
font['glyf']['.notdef'] = pen.glyph()
cmap4 = CmapSubtable.newSubtable(4)
cmap4.platformID, cmap4.platEncID, cmap4.language = 3, 1, 0
cmap4.cmap = {cp: glyph for cp, glyph in font.getBestCmap().items() if cp <= 0xFFFF}
font['cmap'].tables.append(cmap4)
# Identify this modified subset separately while retaining original attribution/license.
for name_id, value in [(1, 'Neon Breakout Emoji'), (3, 'Neon Breakout Emoji 2.051'),
                       (4, 'Neon Breakout Emoji'), (6, 'NeonBreakoutEmoji')]:
    font['name'].setName(value, name_id, 3, 1, 0x409)
font.flavor = 'woff2'
font.save(root / 'assets/emoji/neon-breakout-emoji.woff2')
