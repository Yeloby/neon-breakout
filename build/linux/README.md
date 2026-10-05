# Linux application icons

Source: ../../artwork/neon-breakout-app-icon.png (1254×1254, opaque RGB).
These variants preserve the official artwork and are used by electron-builder
for standard hicolor installation sizes and AppImage icons. They are build
resources; the runtime BrowserWindow retains the original high-resolution PNG.

Regenerate from the repository root with Pillow:

```python
from pathlib import Path
from PIL import Image
source = Image.open("artwork/neon-breakout-app-icon.png")
for size in (16, 32, 48, 64, 128, 256, 512):
    source.resize((size, size), Image.Resampling.LANCZOS).save(
        Path("build/linux/icons") / f"{size}x{size}.png", optimize=True
    )
```

No artwork or transparency is added. The existing project artwork license applies.
