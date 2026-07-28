# Yeloby APT-arkiv

Yeloby-arkivet publiseres på:

`https://yeloby.github.io/neon-breakout/apt`

## Engangsoppsett for utgiver

Opprett en dedikert signeringsnøkkel på en trygg maskin:

```bash
gpg --quick-generate-key "Yeloby APT Repository" rsa4096 sign 2y
gpg --armor --export-secret-keys "Yeloby APT Repository" > yeloby-apt-private.asc
gpg --export "Yeloby APT Repository" > yeloby-archive-keyring.gpg
```

Legg hele innholdet i `yeloby-apt-private.asc` i GitHub Actions-secret
`APT_GPG_PRIVATE_KEY`, og legg nøkkelpassordet i `APT_GPG_PASSPHRASE`.
Privatnøkkelen skal aldri legges i Git eller deles med brukerne. Oppbevar en
sikker sikkerhetskopi utenfor prosjektmappen.

Aktiver GitHub Pages med **GitHub Actions** som kilde under
**Settings → Pages → Build and deployment**.

## Installasjon for brukere

Første gang installerer brukeren Yeloby-kilden:

```bash
curl -fLO https://yeloby.github.io/neon-breakout/apt/yeloby-archive-keyring.deb
sudo apt install ./yeloby-archive-keyring.deb
sudo apt update
sudo apt install neon-breakout
```

Senere versjoner kommer gjennom den vanlige systemoppdateringen:

```bash
sudo apt update
sudo apt upgrade
```

APT-arkivet bygges, signeres og publiseres automatisk når en ny `v*`-tagg
utløser pakkearbeidsflyten.
