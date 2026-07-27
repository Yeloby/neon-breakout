# Neon Breakout

Neon Breakout er et fargerikt, moderne Breakout-spill for Linux. Spillet er
bygget med Electron og bruker Canvas for grafikk, animasjoner og spillfysikk.

## Funksjoner

- Tre vanskelighetsgrader
- Tre startliv og sjeldne ekstraliv
- Tretten balanserte boostere
- Komboer, poengeffekter og nivåfeiring
- Lokal topp 10-liste med spillernavn
- Innstillinger for lyd og visuelle effekter
- Responsivt grensesnitt uten scrolling
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
- `.tar.gz` som portabel utgave

### AppImage

```bash
chmod +x "dist/Neon Breakout-1.1.0.AppImage"
./dist/Neon\ Breakout-1.1.0.AppImage
```

### Debian-pakke

```bash
sudo apt install ./dist/neon-breakout_1.1.0_amd64.deb
```

### RPM-pakke

```bash
sudo dnf install ./dist/neon-breakout-1.1.0.x86_64.rpm
```

### Portabel utgave

```bash
tar -xzf dist/neon-breakout-1.1.0.tar.gz
./neon-breakout-1.1.0/neon-breakout
```

## Utgivelser

GitHub Actions kjører tester og bygger alle Linux-formatene ved push og pull
request. En versjonstag som `v1.1.0` oppretter automatisk en GitHub Release med
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
