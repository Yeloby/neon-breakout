# Yeloby Flatpak-arkiv

Flatpak-arkivet gir automatiske oppdateringer på Arch Linux, Fedora,
openSUSE, Debian, Ubuntu og andre distribusjoner med Flatpak.

## Installasjon for brukere

Legg til Yeloby-kilden én gang:

```bash
flatpak remote-add --if-not-exists yeloby \
  https://yeloby.github.io/neon-breakout/flatpak/yeloby.flatpakrepo
flatpak install yeloby io.github.Yeloby.NeonBreakout
```

Senere oppdateres spillet sammen med andre Flatpak-programmer:

```bash
flatpak update
```

På Arch Linux installeres Flatpak først dersom det mangler:

```bash
sudo pacman -S flatpak
```

Arkivet signeres med den samme dedikerte Yeloby-nøkkelen som APT-arkivet og
publiseres automatisk ved nye versjonstagger.
