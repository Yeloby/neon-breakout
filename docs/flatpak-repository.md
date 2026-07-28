# Yeloby Flatpak-arkiv

Flatpak-arkivet gir automatiske oppdateringer på Arch Linux, Fedora,
openSUSE, Debian, Ubuntu og andre distribusjoner med Flatpak.

## Installasjon for brukere

For grafisk installasjon åpnes denne filen i COSMIC Store, GNOME Software
eller KDE Discover:

`https://yeloby.github.io/neon-breakout/flatpak/neon-breakout.flatpakref`

Alternativt legges Yeloby-kilden til én gang fra terminalen:

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
publiseres automatisk ved nye versjonstagger. Arbeidsflyten genererer både
`yeloby.flatpakrepo` for hele Yeloby-kilden og `neon-breakout.flatpakref` for
direkte installasjon av spillet.
