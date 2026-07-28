# Distribusjon gjennom programbutikker

## COSMIC Store, GNOME Software og KDE Discover

Yeloby Flatpak-arkivet inneholder AppStream-metadata. Etter at brukeren har
lagt til Yeloby-kilden, kan kompatible grafiske programbutikker vise og
oppdatere spillet.

Standardoppføring uten at brukeren legger til en kilde krever normalt Flathub.
Neon Breakout skal ikke sendes til Flathub så lenge prosjektet faller utenfor
Flathubs gjeldende regler for KI-assistert innhold.

## Arch User Repository

`packaging/aur/PKGBUILD` er grunnlaget for `neon-breakout-bin`. Før publisering:

1. Opprett en AUR-konto og legg inn en SSH-nøkkel.
2. Klon `ssh://aur@aur.archlinux.org/neon-breakout-bin.git`.
3. Oppdater kontrollsummer med `updpkgsums` for hver ny versjon.
4. Kjør `makepkg --printsrcinfo > .SRCINFO`, test med `makepkg -si`, og push.

## Fedora COPR

`packaging/rpm/neon-breakout-bin.spec` kan brukes i et COPR-prosjekt kalt
`yeloby-games`. Opprett prosjektet på COPR, legg inn spec-filen og test en
x86_64-bygging før automatisk publisering aktiveres.

## Snap Store

`snap/snapcraft.yaml` bygger en strengt isolert Snap fra Linux-bygget.
Utgiver må:

1. Opprette en Ubuntu One/Snapcraft-konto.
2. Registrere navnet `neon-breakout`.
3. Logge inn med `snapcraft login`.
4. Teste med `snapcraft pack` og `snap install --dangerous`.
5. Publisere med `snapcraft upload --release=stable`.

Konto-, navne- og butikksregistreringer kan ikke lagres i Git.
