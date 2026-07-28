# Neon Breakout

![Håndmalt retro-cover med spilltro neonklosser og emoji-boostere](artwork/neon-breakout-social-preview.jpg)

Neon Breakout er et fargerikt, moderne Breakout-spill for Linux. Spillet er
bygget med Electron og bruker Canvas for grafikk, animasjoner og spillfysikk.
Det er et Yeloby-spill: avslappende spill for alle, med et gjenkjennelig univers
av neon, håndtegnet retroestetikk og kreativ bruk av emojier.

[Last ned nyeste Linux-utgivelse](https://github.com/Yeloby/neon-breakout/releases/latest)

## Funksjoner

- Tre vanskelighetsgrader med ulik ballfart og poengskalering
- Umiddelbart språkvalg mellom norsk og engelsk
- Boxart-basert startskjerm og gjennomgående Yeloby-profil
- Tolv varierte blokkformasjoner med ulik størrelse og tetthet
- Forsterkede klosser med flere helsepunkt og synlig sprekkdannelse
- Tre startliv og sjeldne ekstraliv
- Fjorten boostere med multiball, trinnvis padelbredde og tydelige effektforklaringer
- Lynenergi med elektriske buer, bonuspoeng, elektrisk ballspor og nedtelling
- Åtte skiftende, prosedyregenererte rombakgrunner uten tunge bildefiler
- Komboer, poengeffekter og nivåfeiring
- Lokal topp 10-liste med spillernavn og vanskelighetsgrad
- Innstillinger for lyd og visuelle effekter
- Responsivt grensesnitt
- Tastatur-, mus- og pekerstyring

## Krav for utvikling

- Linux
- Node.js 22.12 eller nyere
- npm

## Kjør lokalt

Installer avhengighetene:

```bash
npm install
```

Start spillet:

```bash
npm start
```

## Tester

```bash
npm test
```

Testene dekker blant annet kollisjoner, boostere, nivåoppsett og poengtavlen.

## Bygg Linux-pakker

```bash
npm run build:linux
```

Ferdige filer legges i `dist/`:

- `.AppImage` for bred Linux-kompatibilitet
- `.deb` for Debian-baserte distribusjoner
- `.rpm` for RPM-baserte distribusjoner
- `.flatpak` for distribusjoner med Flatpak
- `.tar.gz` som portabel utgave

### AppImage

```bash
chmod +x "dist/Neon Breakout-1.4.3.AppImage"
./dist/Neon\ Breakout-1.4.3.AppImage
```

### Debian-pakke

Den anbefalte installasjonen bruker det signerte Yeloby-arkivet:

```bash
curl -fLO https://yeloby.github.io/neon-breakout/apt/yeloby-archive-keyring.deb
sudo apt install ./yeloby-archive-keyring.deb
sudo apt update
sudo apt install neon-breakout
```

Deretter kommer nye versjoner gjennom vanlig `sudo apt update` og
`sudo apt upgrade`. En enkeltstående `.deb` kan fortsatt lastes ned fra GitHub
Releases og installeres med `sudo apt install ./pakkenavn.deb`.

### RPM-pakke

```bash
sudo dnf install ./dist/neon-breakout-1.4.3.x86_64.rpm
```

### Flatpak

Dette er den anbefalte installasjonen for Arch Linux, Fedora, openSUSE og andre
distribusjoner. Legg til Yeloby-kilden én gang:

```bash
flatpak remote-add --if-not-exists yeloby \
  https://yeloby.github.io/neon-breakout/flatpak/yeloby.flatpakrepo
flatpak install yeloby io.github.Yeloby.NeonBreakout
```

Nye versjoner installeres med vanlig `flatpak update`. På Arch Linux kan
Flatpak installeres først med `sudo pacman -S flatpak`. Den enkeltstående
`.flatpak`-filen er fortsatt tilgjengelig i GitHub Releases.

### Portabel utgave

```bash
tar -xzf dist/neon-breakout-1.4.3.tar.gz
./neon-breakout-1.4.3/neon-breakout
```

## Utgivelser

GitHub Actions kjører tester og bygger alle Linux-formatene ved push og pull
request. En versjonstag som `v1.4.3` oppretter automatisk en GitHub Release med
installasjonspakkene som nedlastbare filer.

Genererte pakker og `node_modules` er utelatt fra Git-historikken via
`.gitignore`.

## Prosjektstruktur

- `main.js` – spilltilstand, rendering og brukergrensesnitt
- `breakoutGameLogic.js` – testbar spillogikk
- `electron-main.js` – Electron-vindu og sikkerhetsinnstillinger
- `index.html` – struktur og stil
- `tests/` – automatiserte tester

## Opphav

Utviklet av Johan Slåttavik. © 2026 Johan Slåttavik.
