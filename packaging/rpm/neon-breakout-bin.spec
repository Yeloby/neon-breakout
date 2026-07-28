Name:           neon-breakout
Version:        1.5.1
Release:        1%{?dist}
Summary:        A colorful and relaxing Breakout game by Yeloby
License:        GPL-3.0-or-later
URL:            https://github.com/Yeloby/neon-breakout
Source0:        %{url}/releases/download/v%{version}/neon-breakout-%{version}.tar.gz
Source1:        %{url}/raw/v%{version}/packaging/flatpak/io.github.Yeloby.NeonBreakout.desktop
Source2:        %{url}/raw/v%{version}/packaging/flatpak/io.github.Yeloby.NeonBreakout.svg
BuildArch:      x86_64

Requires:       gtk3
Requires:       nss
Requires:       alsa-lib

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
install -Dm644 %{SOURCE2} %{buildroot}%{_datadir}/icons/hicolor/scalable/apps/io.github.Yeloby.NeonBreakout.svg

%files
/opt/neon-breakout
%{_bindir}/neon-breakout
%{_datadir}/applications/io.github.Yeloby.NeonBreakout.desktop
%{_datadir}/icons/hicolor/scalable/apps/io.github.Yeloby.NeonBreakout.svg

%changelog
* Tue Jul 28 2026 Johan Slåttavik - 1.5.1-1
- Add responsive fullscreen play, gamepad support, GPLv3 licensing, clearer speed text and refreshed app artwork.

* Tue Jul 28 2026 Johan Slåttavik - 1.4.5-1
- Refresh branded artwork and streamline the in-game About panel.

* Tue Jul 28 2026 Johan Slåttavik - 1.4.4-1
- Updated box art and in-game logo
* Tue Jul 28 2026 Johan Slåttavik - 1.4.3-1
- Initial COPR package
