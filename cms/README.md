# Prototyp-CMS

Diese CSV ist ein lokaler Spiegel des Google-Sheet-Tabs `Prototyp_CMS`.

Sie enthält bewusst nur Felder, die Lea realistisch pflegen soll:

- Station und Route-A/B-Aktivierung
- Titel, Ort/Phase, Typ und Dauer
- kurze Aufgabe, Reisehinweis, Fallback-Code und Status

Technische Felder wie gültige Antworten, QR-Token, Hinweise, Choices und Kartenlinks bleiben im bestehenden `game-package.json` als Defaults und werden beim Build übernommen.

Workflow für den Prototyp:

```bash
pnpm run cms:build
pnpm run check
```

Später ersetzt das Google-Sheet-/Apps-Script-Publishing diese lokale CSV.
