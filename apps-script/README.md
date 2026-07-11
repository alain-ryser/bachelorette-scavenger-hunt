# Google Apps Script Publisher

Dieses Verzeichnis enthält den gebundenen Apps-Script-Publisher für das Google Sheet.

## Installation

1. Google Sheet öffnen.
2. `Erweiterungen → Apps Script` öffnen.
3. Inhalt aus `Code.gs` in Apps Script einfügen.
4. Optional `appsscript.json` über die Apps-Script-Projekteinstellungen aktivieren und übernehmen.
5. Funktion `setCmsAccessKey` einmal ausführen und einen geheimen Zugriffsschlüssel setzen.
6. Funktion `publishCms` einmal ausführen, damit ein erster Snapshot existiert.
7. `Bereitstellen → Neue Bereitstellung → Web-App`:
   - Ausführen als: `Ich`
   - Zugriff: `Jeder`
8. Web-App-URL in `.env.local` als `VITE_REMOTE_CMS_URL` eintragen.
9. Zugriffsschlüssel in `.env.local` als `VITE_REMOTE_CMS_KEY` eintragen.

## Bedienung im Sheet

Nach dem Neuladen des Sheets erscheint das Menü `Schnitzeljagd`.

- `Prüfen`: validiert den CMS-Inhalt, ohne zu veröffentlichen.
- `Veröffentlichen`: validiert und speichert den neuen JSON-Snapshot.
- `Snapshot anzeigen`: zeigt Version, Zeitpunkt und Kurzvorschau.
- `Zugriffsschlüssel setzen`: setzt den Key, den die PWA als `key` Query-Parameter mitsendet.

Der Web-App-Endpunkt liefert nur dann JSON aus, wenn der Key stimmt.
