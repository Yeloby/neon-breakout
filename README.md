# Neon Breakout

![Neon Breakout – håndtegnet retro-boxart](artwork/neon-breakout-social-preview-1.4.5.jpg)

[Norsk](README.md) · [English](README.en.md)

Et fargerikt Breakout-spill for Linux – skapt av **Yeloby** med neon, rom,
emoji-boostere og klassisk arkadefart.

**[Last ned](https://github.com/Yeloby/neon-breakout/releases/latest)**
· **[Kildekode](https://github.com/Yeloby/neon-breakout)**
· **[Rapporter en feil](https://github.com/Yeloby/neon-breakout/issues)**

## Spillet

- Norsk og engelsk
- Tre vanskelighetsgrader med ulik fart og poengberegning
- Varierte brett og forsterkede klosser
- Fjorten boostere, blant annet multiball, ildball og lynkule
- Komboer, rombakgrunner og lokale poengtavler
- Tastatur, mus, berøringsflate og gamepad

## Installer

### Debian, Ubuntu, Linux Mint og Pop!_OS

Legg til Yelobys signerte pakkekilde én gang:

```bash
curl -fLO https://yeloby.github.io/neon-breakout/apt/yeloby-archive-keyring.deb
sudo apt install ./yeloby-archive-keyring.deb
sudo apt update
sudo apt install neon-breakout
```

### Arch Linux og andre distribusjoner

Flatpak fungerer på tvers av distribusjoner:

**[Åpne i COSMIC Store, GNOME Software eller Discover](https://yeloby.github.io/neon-breakout/flatpak/neon-breakout.flatpakref)**

Eller installer fra terminalen:

```bash
flatpak remote-add --if-not-exists yeloby \
  https://yeloby.github.io/neon-breakout/flatpak/yeloby.flatpakrepo
flatpak install yeloby io.github.Yeloby.NeonBreakout
```

RPM, AppImage og andre pakker finnes under
[nyeste utgivelse](https://github.com/Yeloby/neon-breakout/releases/latest).
AppImage kan startes direkte:

```bash
chmod +x Neon.Breakout-*.AppImage
./Neon.Breakout-*.AppImage
```

## Oppdater

```bash
# Debian-baserte systemer
sudo apt update && sudo apt upgrade

# Flatpak
flatpak update
```

Manuelt installerte RPM- og AppImage-utgaver erstattes med pakken fra
[nyeste utgivelse](https://github.com/Yeloby/neon-breakout/releases/latest).
Innstillinger og lokale poengsummer beholdes.

## Utvikling

Krever Linux, Node.js 22.12 eller nyere og npm.

```bash
npm install
npm test
npm start
```

Bygg Linux-pakker med `npm run build:linux`.

## Fri programvare

Neon Breakout er fri programvare, utgitt under
[GNU GPLv3 eller nyere](LICENSE). Du kan bruke, studere, endre og dele spillet
videre på lisensens vilkår.

Spillet står på skuldrene til Linux, Node.js, Electron og hele
FOSS-fellesskapet. **Takk til alle som skriver kode, dokumenterer, tester,
pakker og deler.**

---

Copyright © 2026 Johan Slåttavik / **Yeloby**

Lisensiert under [GNU GPLv3 eller nyere](LICENSE).
