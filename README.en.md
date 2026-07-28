# Neon Breakout

![Neon Breakout – hand-painted retro box art](artwork/neon-breakout-social-preview-1.4.5.jpg)

[Norsk](README.md) · [English](README.en.md)

A colorful Breakout game for Linux – created by **Yeloby** with neon, space,
emoji power-ups and classic arcade speed.

**[Download](https://github.com/Yeloby/neon-breakout/releases/latest)**
· **[Source code](https://github.com/Yeloby/neon-breakout)**
· **[Report an issue](https://github.com/Yeloby/neon-breakout/issues)**

## The game

- Norwegian and English
- Three difficulty modes with distinct speed and scoring
- Varied levels and reinforced bricks
- Fourteen power-ups, including multiball, fireball and lightning ball
- Combos, space backgrounds and local leaderboards
- Keyboard, mouse, touchpad and gamepad controls

## Install

### Debian, Ubuntu, Linux Mint and Pop!_OS

Add Yeloby's signed package repository once:

```bash
curl -fLO https://yeloby.github.io/neon-breakout/apt/yeloby-archive-keyring.deb
sudo apt install ./yeloby-archive-keyring.deb
sudo apt update
sudo apt install neon-breakout
```

### Arch Linux and other distributions

Flatpak works across distributions:

**[Open in COSMIC Store, GNOME Software or Discover](https://yeloby.github.io/neon-breakout/flatpak/neon-breakout.flatpakref)**

Or install from the terminal:

```bash
flatpak remote-add --if-not-exists yeloby \
  https://yeloby.github.io/neon-breakout/flatpak/yeloby.flatpakrepo
flatpak install yeloby io.github.Yeloby.NeonBreakout
```

RPM, AppImage and additional packages are available from the
[latest release](https://github.com/Yeloby/neon-breakout/releases/latest).
An AppImage runs without a system installation:

```bash
chmod +x Neon.Breakout-*.AppImage
./Neon.Breakout-*.AppImage
```

## Update

```bash
# Debian-based systems
sudo apt update && sudo apt upgrade

# Flatpak
flatpak update
```

Replace manually installed RPM and AppImage editions with the package from the
[latest release](https://github.com/Yeloby/neon-breakout/releases/latest).
Settings and local scores are preserved.

## Development

Requires Linux, Node.js 22.12 or newer, and npm.

```bash
npm install
npm test
npm start
```

Build Linux packages with `npm run build:linux`.

## Free software

Neon Breakout is free software released under the
[GNU GPLv3 or later](LICENSE). You may use, study, modify and redistribute the
game under the terms of the license.

The game stands on the shoulders of Linux, Node.js, Electron and the wider
FOSS community. **Thank you to everyone who writes code, documents, tests,
packages and shares.**

---

Copyright © 2026 Johan Slåttavik / **Yeloby**

Licensed under the [GNU GPLv3 or later](LICENSE).
