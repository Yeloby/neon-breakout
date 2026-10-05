Name:           neon-breakout
Version:        1.5.4
Release:        1%{?dist}
Summary:        A colorful and relaxing Breakout game by Yeloby
License:        GPL-3.0-or-later
URL:            https://github.com/Yeloby/neon-breakout
Source0:        %{url}/releases/download/v%{version}/neon-breakout-%{version}.tar.gz
Source1:        %{url}/raw/v%{version}/packaging/flatpak/io.github.Yeloby.NeonBreakout.desktop
Source2:        %{url}/raw/v%{version}/packaging/flatpak/io.github.Yeloby.NeonBreakout.png
BuildArch:      x86_64

Requires:       gtk3
Requires:       nss
Requires:       alsa-lib
Requires:       libgbm.so.1()(64bit)
Requires:       libxkbcommon.so.0()(64bit)
Requires:       libudev.so.1()(64bit)
Requires:       libcups.so.2()(64bit)

%description
Neon Breakout is a relaxing arcade game with neon visuals, creative emoji
power-ups, varied levels and three difficulty modes.

%prep
%setup -q -n neon-breakout-%{version}

%build

%install
mkdir -p %{buildroot}/opt/neon-breakout
cp -a . %{buildroot}/opt/neon-breakout/
mkdir -p %{buildroot}%{_bindir}
ln -s /opt/neon-breakout/neon-breakout %{buildroot}%{_bindir}/neon-breakout
install -Dm644 %{SOURCE1} %{buildroot}%{_datadir}/applications/io.github.Yeloby.NeonBreakout.desktop
install -Dm644 %{SOURCE2} %{buildroot}%{_datadir}/icons/hicolor/512x512/apps/io.github.Yeloby.NeonBreakout.png

%files
/opt/neon-breakout
%{_bindir}/neon-breakout
%{_datadir}/applications/io.github.Yeloby.NeonBreakout.desktop
%{_datadir}/icons/hicolor/512x512/apps/io.github.Yeloby.NeonBreakout.png

%changelog
* Sun Oct 04 2026 Johan Slåttavik - 1.5.4-1
- Fix strictly confined Snap startup on current Ubuntu and bundle canonical Linux emoji across platforms.

* Tue Jul 28 2026 Johan Slåttavik - 1.5.3-1
- Add Windows packaging, Microsoft Store assets and cross-platform release automation.

* Tue Jul 28 2026 Johan Slåttavik - 1.5.2-1
- Simplify playfield messaging, keep the power-up HUD above the bricks and refine box-art brick styling.

* Tue Jul 28 2026 Johan Slåttavik - 1.5.1-1
- Add responsive fullscreen play, gamepad support, GPLv3 licensing, clearer speed text and refreshed app artwork.

* Tue Jul 28 2026 Johan Slåttavik - 1.4.5-1
- Refresh branded artwork and streamline the in-game About panel.

* Tue Jul 28 2026 Johan Slåttavik - 1.4.4-1
- Updated box art and in-game logo
* Tue Jul 28 2026 Johan Slåttavik - 1.4.3-1
- Initial COPR package
