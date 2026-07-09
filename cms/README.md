# Lokaler CMS-Spiegel

Dieses Verzeichnis spiegelt die fachliche Struktur des Google Sheets `Mission Gipfelglück – CMS und Inhaltsplanung`.

Der Prototyp baut daraus lokal denselben JSON-Snapshot, den später Google Apps Script veröffentlichen soll.

## Dateien

- `einstellungen.csv`: Eventdaten und redaktionelle Einstellungen.
- `routen.csv`: Route A/B, Reihenfolge und aktivierte Stationen.
- `stationen.csv`: Stationstexte, Typen, Deadlines und Fallback-Codes.
- `hinweise.csv`: Hinweise, akzeptierte Antworten und QR-Token.
- `medien.csv`: geplante Medien, Drive-Links und Offline-Priorität.

## Typ-Mapping

Die App bleibt bewusst bei genau einem Stationstyp pro Station. Kombinierte Sheet-Typen werden für V1 auf einen einzelnen App-Typ reduziert:

- `STORY` → `story`, beim Brunch als bestehende Foto-Challenge `camera`
- `GPS_TEXT` → `text`
- `IMAGE_TEXT` → `text`
- `QR` → `qr`
- `AUDIO_SEQUENCE` → `choice`
- `TRAVEL` → `travel`
- `GPS_CAMERA` → `gps`
- `FINALE` → `finale`

## Workflow

```bash
pnpm run cms:build
pnpm run check
```

Der Builder übernimmt technische Defaults wie bestehende Kartenlinks, GPS-Koordinaten und Choice-Optionen aus `public/content/game-package.json`, solange sie nicht im lokalen CMS gepflegt werden.

Später ersetzt Google-Sheet-/Apps-Script-Publishing diese lokalen CSV-Dateien.
