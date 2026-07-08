# Mission Gipfelglück

Installierbarer PWA-Prototyp für Sinas Schnitzeljagd am 19. September 2026.

## Aktueller Stand

- React + TypeScript + Vite als PWA-Grundlage.
- Lokales Inhaltspaket unter `public/content/game-package.json`.
- Offline-tolerante App-Shell über Service Worker.
- Spielstand und Inhaltssnapshot in IndexedDB.
- Route A und Route B inkl. Aeschbach Chocolatier als eigene Station.
- Startseite mit einem Spielcode, Android-Installationshinweis und Route-Auswahl.
- Stationen mit Story-, Text-, QR-/Fallback-, Multiple-Choice-, Reise-, Kamera- und Finale-Typen.
- Hinweise, manuelle Ersatzcodes und Recovery-Modus sind im Prototyp vorhanden.
- Ein lokaler CMS-Publishing-Prototyp baut `game-package.json` aus einem schlanken CSV-Spiegel des Google-Sheet-Tabs `Prototyp_CMS`.

## Prototyp-Codes

- Spielcode: `SINA-2026`
- Aeschbach-Fallback: `AESCHBACH`

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
`pnpm run cms:build` übernimmt die einfachen CMS-Felder aus [prototyp-cms.csv](/Users/aryser/Documents/SchnitzeljagdSina/cms/prototyp-cms.csv) und behält technische Defaults aus dem bestehenden Content-Paket bei.

In der aktuellen Codex-Umgebung ist Node nicht systemweit im `PATH`; dort wird der gebündelte Node-/pnpm-Pfad verwendet. In einer normalen lokalen Node-Installation reichen die Befehle oben.

## Architektur

- `src/domain/`: Typen und Spiellogik.
- `src/storage/`: lokale IndexedDB-Persistenz.
- `src/pwa/`: Service-Worker-Registrierung.
- `src/components/`: UI-Bausteine für Start, Fortschritt und Stationen.
- `public/content/game-package.json`: statischer CMS-Snapshot für den ersten vertikalen Prototyp.
- `cms/prototyp-cms.csv`: lokaler Spiegel des einfachen Google-Sheet-Tabs `Prototyp_CMS`.
- `scripts/build-content-from-cms.mjs`: baut aus CMS-CSV und technischen Defaults ein App-Content-Paket.
- `scripts/validate-content.mjs`: schlanke Prüfung des Content-Snapshots gegen die Spielregeln.

## Noch nicht umgesetzt

- Google-Sheet-Publishing via Apps Script; aktuell gibt es einen lokalen CSV-Builder als Prototyp.
- Geheimer URL-Fragment-Key und produktive Zugriffskontrolle.
- Medien-Download/Prüfung aus Drive.
- Vollständiger Offline-Feldtest auf Haupt- und Ersatzgerät.
- Finaler Deployment-Workflow für GitHub Pages.
