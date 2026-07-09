# Mission Gipfelglück

Installierbarer PWA-Prototyp für Sinas Schnitzeljagd am 19. September 2026.

## Aktueller Stand

- React + TypeScript + Vite als PWA-Grundlage.
- Lokales Inhaltspaket unter `public/content/game-package.json`.
- Offline-tolerante App-Shell über Service Worker.
- Spielstand und Inhaltssnapshot in IndexedDB.
- Route A und Route B inkl. Aeschbach Chocolatier als eigene Station.
- Startseite mit einem Spielcode, Android-Installationshinweis und Route-Auswahl.
- Stationen mit Story-, Text-, QR-/Fallback-, Multiple-Choice-, Reise-, GPS-, Kamera- und Finale-Typen.
- Hinweise, manuelle Ersatzcodes und Recovery-Modus sind im Prototyp vorhanden.
- Vorabcheck für Content-Version, Offline-Speicher, PWA, Netzwerk, Kamera, Standort und QR-Scanner.
- Nativer QR-Scanner für unterstützte Browser; manueller Ersatzcode bleibt sichtbar.
- GPS-Ankunftsprüfung auf Melchsee-Frutt mit Fallback-Code.
- Lokale Kamera-Challenge beim Brunch; Fotos bleiben nur in IndexedDB auf dem Gerät.
- Ein lokaler CMS-Publishing-Prototyp baut `game-package.json` aus CSV-Spiegeln der Google-Sheet-Tabs `Einstellungen`, `Routen`, `Stationen`, `Hinweise` und `Medien`.

## Prototyp-Codes

- Spielcode: `SINA-2026`
- Aeschbach-Fallback: `AESCHBACH`
- Melchsee-Frutt-Fallback: `FRUTT-6`

Diese Codes sind nur lokale Prototypwerte und dürfen vor einem echten Deployment ersetzt werden.

## Entwicklung

```bash
pnpm install
pnpm run cms:build
pnpm run check
pnpm run build
pnpm run dev
```

`pnpm run check` prüft TypeScript und validiert den aktuellen Content-Snapshot.
`pnpm run cms:build` übernimmt die lokalen CMS-Spiegel aus [cms](/Users/aryser/Documents/SchnitzeljagdSina/cms) und behält technische Defaults wie Kartenlinks, GPS-Koordinaten und Choice-Optionen aus dem bestehenden Content-Paket bei.

In der aktuellen Codex-Umgebung ist Node nicht systemweit im `PATH`; dort wird der gebündelte Node-/pnpm-Pfad verwendet. In einer normalen lokalen Node-Installation reichen die Befehle oben.

## Lokal testen

```bash
pnpm run dev
```

Danach `http://127.0.0.1:5173/` öffnen und mit `SINA-2026` starten.

## Smartphone-Test via GitHub Pages

Der Deployment-Workflow baut die App für GitHub Pages unter `/bachelorette-scavenger-hunt/`.

Live-Version: https://alain-ryser.github.io/bachelorette-scavenger-hunt/

Nach erfolgreichem GitHub-Actions-Deployment:

1. GitHub-Pages-URL auf dem Android-Testgerät in Chrome öffnen.
2. Spielcode `SINA-2026` eingeben.
3. Route B einmal komplett durchspielen.
4. Chrome-Menü öffnen und „Zum Startbildschirm hinzufügen“ testen.
5. App nach einmaligem Laden im Offline-Modus erneut öffnen.

## V1-Testfälle

- Spielcode korrekt/falsch.
- Hinweise bleiben pro Station isoliert.
- Nächster Ort bleibt bis zur Lösung verborgen.
- QR-Scan bei Aeschbach plus Ersatzcode `AESCHBACH`.
- GPS auf Melchsee-Frutt plus Ersatzcode `FRUTT-6`.
- Kamera beim Brunch plus „Ohne Foto fortfahren“.
- Browser schliessen und Spielstand fortsetzen.
- Prototyp zurücksetzen löscht Spielstand und lokale Testfotos.

## Architektur

- `src/domain/`: Typen und Spiellogik.
- `src/storage/`: lokale IndexedDB-Persistenz.
- `src/pwa/`: Service-Worker-Registrierung.
- `src/components/`: UI-Bausteine für Start, Fortschritt und Stationen.
- `public/content/game-package.json`: statischer CMS-Snapshot für den ersten vertikalen Prototyp.
- `cms/*.csv`: lokale Spiegel der Google-Sheet-Tabs für Einstellungen, Routen, Stationen, Hinweise und Medien.
- `scripts/build-content-from-cms.mjs`: baut aus CMS-CSV und technischen Defaults ein App-Content-Paket.
- `scripts/validate-content.mjs`: schlanke Prüfung des Content-Snapshots gegen die Spielregeln.

## Noch nicht umgesetzt

- Google-Sheet-Publishing via Apps Script; aktuell gibt es einen lokalen Mehr-CSV-Builder als Prototyp.
- Geheimer URL-Fragment-Key und produktive Zugriffskontrolle.
- Medien-Download/Prüfung aus Drive.
- Vollständiger Offline-Feldtest auf Haupt- und Ersatzgerät.
