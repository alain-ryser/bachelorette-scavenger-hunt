const CMS_MENU_NAME = "Schnitzeljagd";
const CMS_ACCESS_KEY_PROPERTY = "cmsAccessKey";
const PUBLISHED_VERSION_PROPERTY = "publishedVersion";
const PUBLISHED_AT_PROPERTY = "publishedAt";
const PUBLISHED_PACKAGE_PROPERTY = "publishedPackage";
const PUBLISHED_PACKAGE_CHUNK_COUNT_PROPERTY = "publishedPackageChunkCount";
const PUBLISHED_PACKAGE_CHUNK_PREFIX = "publishedPackage_";
const PROPERTY_CHUNK_SIZE = 7500;

const ROUTE_IDS = ["A", "B"];
const STATION_TYPES = ["story", "text", "qr", "choice", "travel", "gps", "camera", "finale"];

const UNLOCK_TYPE_TO_STATION_TYPE = {
  STORY: "story",
  GPS_TEXT: "text",
  IMAGE_TEXT: "text",
  QR: "qr",
  AUDIO_SEQUENCE: "choice",
  TRAVEL: "travel",
  GPS_CAMERA: "gps",
  CAMERA: "camera",
  FINALE: "finale"
};

const MEDIA_TYPE_MAP = {
  BILD: "image",
  IMAGE: "image",
  AUDIO: "audio",
  VIDEO: "video",
  TEXT: "text"
};

const OFFLINE_PRIORITY_MAP = {
  HOCH: "high",
  HIGH: "high",
  MITTEL: "medium",
  MEDIUM: "medium",
  NIEDRIG: "low",
  LOW: "low"
};

const TECHNICAL_DEFAULTS = {
  schemaVersion: 1,
  access: {
    gameCode: "SINA-2026"
  },
  event: {
    appLabel: "Mission Gipfelglück",
    introText:
      "Ein zentraler Gruppenmodus für Sina: kurze digitale Impulse, klare Reisephasen und genug Raum für Brunch, Schoggi-Führung, Gespräche und Bonistock.",
    startLocation: "Luzern"
  },
  stations: {
    brunch: {
      travel: {
        details: "Kurzer Weg in Luzern. Genauer Ort wird später ergänzt.",
        mapUrl: "https://maps.google.com/?q=Luzern"
      }
    },
    luzern: {
      travel: {
        details: "Die Führung bleibt handyfrei. Die App meldet sich davor oder danach mit dem Cupcake-Easter-Egg.",
        mapUrl: "https://maps.google.com/?q=Aeschbach+Chocolatier"
      }
    },
    aeschbach: {
      travel: {
        details: "Wenn genügend Zeit bleibt: kurzer See-/Sarnen-Moment. Sonst direkt weiterreisen.",
        mapUrl: "https://maps.google.com/?q=Sarnen"
      }
    },
    see_sarnen: {
      choices: [
        { id: "mut", label: "Sina sagt Ja zum Abenteuer." },
        { id: "ruhe", label: "Sina findet den schönsten Blick." },
        { id: "team", label: "Sina bringt alle zusammen." }
      ],
      travel: {
        details: "Zeitkritischer Abschnitt: bei Verspätung direkt zur nächsten Verbindung.",
        mapUrl: "https://maps.google.com/?q=St%C3%B6ckalp"
      }
    },
    stoeckalp: {
      travel: {
        details: "Definitive Fahrzeiten 2026 später eintragen. Ziel: genug Puffer vor Aufstieg und Abendessen.",
        mapUrl: "https://maps.google.com/?q=Melchsee-Frutt"
      }
    },
    melchsee_frutt: {
      geo: {
        latitude: 46.7756,
        longitude: 8.2679,
        radiusMeters: 700,
        label: "Melchsee-Frutt"
      },
      travel: {
        details: "Keine Bildschirmaufgabe während des Aufstiegs mit Gepäck.",
        mapUrl: "https://maps.google.com/?q=Berghotel+Bonistock"
      }
    }
  }
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(CMS_MENU_NAME)
    .addItem("Prüfen", "checkCms")
    .addItem("Veröffentlichen", "publishCms")
    .addItem("Snapshot anzeigen", "showPublishedSnapshot")
    .addSeparator()
    .addItem("Zugriffsschlüssel setzen", "setCmsAccessKey")
    .addToUi();
}

function checkCms() {
  const result = buildGamePackage();
  SpreadsheetApp.getUi().alert(
    "CMS-Prüfung erfolgreich",
    `Version ${result.contentVersion}\n${result.routes.length} Routen, ${result.stations.length} Stationen, ${result.media.length} Medien.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function publishCms() {
  const gamePackage = buildGamePackage();
  const json = JSON.stringify(gamePackage);
  writePublishedPackage(json, gamePackage.contentVersion);
  SpreadsheetApp.getUi().alert(
    "Veröffentlichung erfolgreich",
    `Version ${gamePackage.contentVersion} wurde gespeichert.\nDie PWA kann den Snapshot jetzt über „Inhaltsversion neu prüfen“ laden.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function showPublishedSnapshot() {
  const properties = PropertiesService.getScriptProperties();
  const version = properties.getProperty(PUBLISHED_VERSION_PROPERTY) || "nicht veröffentlicht";
  const publishedAt = properties.getProperty(PUBLISHED_AT_PROPERTY) || "nicht veröffentlicht";
  const json = readPublishedPackage();
  const preview = json ? json.slice(0, 1200) : "Noch kein Snapshot vorhanden.";
  SpreadsheetApp.getUi().alert(
    "Aktueller Snapshot",
    `Version: ${version}\nPubliziert: ${publishedAt}\n\n${preview}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function setCmsAccessKey() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Zugriffsschlüssel setzen",
    "Geheimen Key eintragen. Die PWA sendet ihn später als ?key=... an den Web-App-Endpunkt.",
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  const key = response.getResponseText().trim();
  if (key.length < 16) {
    ui.alert("Der Zugriffsschlüssel sollte mindestens 16 Zeichen lang sein.");
    return;
  }

  PropertiesService.getScriptProperties().setProperty(CMS_ACCESS_KEY_PROPERTY, key);
  ui.alert("Zugriffsschlüssel gespeichert.");
}

function doGet(event) {
  const properties = PropertiesService.getScriptProperties();
  const expectedKey = properties.getProperty(CMS_ACCESS_KEY_PROPERTY);
  const providedKey = event && event.parameter ? event.parameter.key : "";

  if (!expectedKey || providedKey !== expectedKey) {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  const json = readPublishedPackage();
  if (!json) {
    return jsonResponse({ error: "no_published_package" }, 404);
  }

  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function buildGamePackage() {
  const settings = rowsToKeyValue(readTable("Einstellungen"));
  const routeRows = readObjects("Routen", [
    "route_id",
    "route_name",
    "route_description",
    "reihenfolge",
    "station_id",
    "aktiviert",
    "kommentar"
  ]);
  const stationRows = readObjects("Stationen", [
    "station_id",
    "kapitel",
    "ort_phase",
    "dauer_min",
    "unlock_type",
    "titel",
    "aufgabe_kurz",
    "aufloesung",
    "reisehinweis",
    "deadline",
    "fallback_code",
    "status"
  ]);
  const hintRows = readObjects("Hinweise", [
    "station_id",
    "stufe",
    "hinweis_text",
    "gueltige_antworten",
    "qr_token",
    "fallback_aktiv"
  ]);
  const mediaRows = readObjects("Medien", [
    "media_id",
    "station_id",
    "typ",
    "drive_url",
    "alt_text",
    "offline_prioritaet",
    "freigegeben",
    "status"
  ]);

  const stationIds = new Set(stationRows.map((row) => required(row, "station_id")));
  const hintsByStation = groupBy(hintRows, "station_id");
  const packageVersion = `sheet-${Utilities.formatDate(new Date(), "Europe/Zurich", "yyyyMMdd-HHmmss")}`;

  const gamePackage = {
    schemaVersion: TECHNICAL_DEFAULTS.schemaVersion,
    contentVersion: packageVersion,
    event: {
      title: setting(settings, "spiel_titel", "Sina's Polteri"),
      subtitle: setting(settings, "untertitel", "Sinas Weg zum Bonistock"),
      appLabel: setting(settings, "app_label", TECHNICAL_DEFAULTS.event.appLabel),
      introText: setting(settings, "start_intro_text", TECHNICAL_DEFAULTS.event.introText),
      date: setting(settings, "event_datum", "2026-09-19"),
      timezone: setting(settings, "zeitzone", "Europe/Zurich"),
      startLocation: TECHNICAL_DEFAULTS.event.startLocation
    },
    access: TECHNICAL_DEFAULTS.access,
    routes: buildRoutes(routeRows, stationIds),
    stations: stationRows.map((row) => buildStation(row, hintsByStation)),
    media: mediaRows.filter((row) => required(row, "media_id")).map((row) => buildMediaItem(row, stationIds))
  };

  validateGamePackage(gamePackage);
  return gamePackage;
}

function buildRoutes(routeRows, stationIds) {
  const rowsByRoute = groupBy(routeRows, "route_id");
  return Object.keys(rowsByRoute).map((routeId) => {
    if (ROUTE_IDS.indexOf(routeId) === -1) {
      throw new Error(`Routen: route_id '${routeId}' ist unbekannt.`);
    }

    const activeRows = rowsByRoute[routeId]
      .filter((row) => yesNo(required(row, "aktiviert"), `Routen ${routeId}/${row.station_id}: aktiviert`))
      .sort((a, b) => numberValue(a, "reihenfolge") - numberValue(b, "reihenfolge"));

    if (activeRows.length === 0) {
      throw new Error(`Route ${routeId} enthält keine aktive Station.`);
    }

    const stationIdsForRoute = activeRows.map((row) => required(row, "station_id"));
    stationIdsForRoute.forEach((stationId) => {
      if (!stationIds.has(stationId)) {
        throw new Error(`Route ${routeId} verweist auf fehlende Station '${stationId}'.`);
      }
    });

    return {
      id: routeId,
      name: required(activeRows[0], "route_name"),
      description: optional(activeRows[0].route_description) || required(activeRows[0], "kommentar"),
      stationIds: stationIdsForRoute
    };
  });
}

function buildStation(row, hintsByStation) {
  const stationId = required(row, "station_id");
  const unlockType = required(row, "unlock_type").toUpperCase();
  const mappedType = UNLOCK_TYPE_TO_STATION_TYPE[unlockType];
  if (!mappedType || STATION_TYPES.indexOf(mappedType) === -1) {
    throw new Error(`Station ${stationId}: unlock_type '${unlockType}' ist unbekannt.`);
  }

  const type = stationId === "brunch" && unlockType === "STORY" ? "camera" : mappedType;
  const defaults = TECHNICAL_DEFAULTS.stations[stationId] || {};
  const hints = hintsByStation[stationId] || [];
  const station = compact({
    id: stationId,
    chapter: numberValue(row, "kapitel"),
    title: required(row, "titel"),
    locationLabel: required(row, "ort_phase"),
    durationMinutes: numberValue(row, "dauer_min"),
    type,
    prompt: required(row, "aufgabe_kurz"),
    answer: type === "text" ? buildAnswer(hints) : undefined,
    choices: type === "choice" ? defaults.choices || defaultChoices() : undefined,
    qrToken: type === "qr" ? buildQrToken(stationId, hints) : undefined,
    successText: optional(row.aufloesung) || "Kapitel abgeschlossen.",
    travel: buildTravel(defaults, optional(row.reisehinweis)),
    geo: type === "gps" ? defaults.geo : undefined,
    deadline: optional(row.deadline),
    fallbackCode: required(row, "fallback_code"),
    hints: buildHints(hints)
  });

  return station;
}

function buildHints(rows) {
  return rows
    .filter((row) => yesNo(row.fallback_aktiv || "JA", `Hinweise ${row.station_id}: fallback_aktiv`))
    .sort((a, b) => numberValue(a, "stufe") - numberValue(b, "stufe"))
    .map((row) => optional(row.hinweis_text))
    .filter(Boolean)
    .slice(0, 2);
}

function buildAnswer(rows) {
  const accepted = unique(rows.flatMap((row) => splitPipeList(row.gueltige_antworten)));
  if (accepted.length === 0) return undefined;
  return {
    accepted,
    normalization: "lowercase-trim-umlaut"
  };
}

function buildQrToken(stationId, rows) {
  const token = rows.map((row) => optional(row.qr_token)).find(Boolean);
  if (!token) {
    throw new Error(`Station ${stationId}: QR-Station braucht qr_token in Hinweise.`);
  }
  return token;
}

function buildTravel(defaults, label) {
  if (!label && !defaults.travel) return undefined;
  return compact({
    label: label || defaults.travel.label,
    details: defaults.travel ? defaults.travel.details : "Details später ergänzen.",
    mapUrl: defaults.travel ? defaults.travel.mapUrl : undefined
  });
}

function buildMediaItem(row, stationIds) {
  const id = required(row, "media_id");
  const stationId = optional(row.station_id);
  if (stationId && !stationIds.has(stationId)) {
    throw new Error(`Medium ${id}: station_id '${stationId}' existiert nicht.`);
  }

  const mediaType = MEDIA_TYPE_MAP[required(row, "typ").toUpperCase()];
  if (!mediaType) {
    throw new Error(`Medium ${id}: typ '${row.typ}' ist unbekannt.`);
  }

  const offlinePriority = OFFLINE_PRIORITY_MAP[required(row, "offline_prioritaet").toUpperCase()];
  if (!offlinePriority) {
    throw new Error(`Medium ${id}: offline_prioritaet '${row.offline_prioritaet}' ist unbekannt.`);
  }

  return compact({
    id,
    stationId,
    type: mediaType,
    driveUrl: optional(row.drive_url),
    altText: required(row, "alt_text"),
    offlinePriority,
    approved: yesNo(required(row, "freigegeben"), `Medium ${id}: freigegeben`),
    status: required(row, "status")
  });
}

function validateGamePackage(gamePackage) {
  if (gamePackage.schemaVersion !== 1) throw new Error("schemaVersion muss 1 sein.");
  if (!gamePackage.event.title) throw new Error("event.title fehlt.");
  if (!gamePackage.event.appLabel) throw new Error("event.appLabel fehlt.");
  if (!gamePackage.event.introText) throw new Error("event.introText fehlt.");
  if (!gamePackage.access.gameCode) throw new Error("access.gameCode fehlt.");

  const stationIds = new Set(gamePackage.stations.map((station) => station.id));
  gamePackage.routes.forEach((route) => {
    if (!route.stationIds.length) throw new Error(`Route ${route.id} enthält keine Stationen.`);
    route.stationIds.forEach((stationId) => {
      if (!stationIds.has(stationId)) throw new Error(`Route ${route.id} verweist auf fehlende Station ${stationId}.`);
    });
  });

  gamePackage.stations.forEach((station) => {
    if (!station.fallbackCode) throw new Error(`Station ${station.id}: fallbackCode fehlt.`);
    if (station.type === "qr" && !station.qrToken) throw new Error(`Station ${station.id}: qrToken fehlt.`);
    if (station.type === "gps" && !station.geo) throw new Error(`Station ${station.id}: geo fehlt.`);
    if (station.type === "text" && (!station.answer || station.answer.accepted.length === 0)) {
      Logger.log(`Warnung: Station ${station.id} ist nur per Fallback lösbar.`);
    }
  });
}

function writePublishedPackage(json, version) {
  const properties = PropertiesService.getScriptProperties();
  clearPackageChunks(properties);

  if (json.length <= PROPERTY_CHUNK_SIZE) {
    properties.setProperty(PUBLISHED_PACKAGE_PROPERTY, json);
    properties.deleteProperty(PUBLISHED_PACKAGE_CHUNK_COUNT_PROPERTY);
  } else {
    properties.deleteProperty(PUBLISHED_PACKAGE_PROPERTY);
    const chunks = [];
    for (let index = 0; index < json.length; index += PROPERTY_CHUNK_SIZE) {
      chunks.push(json.slice(index, index + PROPERTY_CHUNK_SIZE));
    }
    chunks.forEach((chunk, index) => {
      properties.setProperty(`${PUBLISHED_PACKAGE_CHUNK_PREFIX}${String(index).padStart(3, "0")}`, chunk);
    });
    properties.setProperty(PUBLISHED_PACKAGE_CHUNK_COUNT_PROPERTY, String(chunks.length));
  }

  properties.setProperty(PUBLISHED_VERSION_PROPERTY, version);
  properties.setProperty(PUBLISHED_AT_PROPERTY, new Date().toISOString());
}

function readPublishedPackage() {
  const properties = PropertiesService.getScriptProperties();
  const direct = properties.getProperty(PUBLISHED_PACKAGE_PROPERTY);
  if (direct) return direct;

  const chunkCount = Number(properties.getProperty(PUBLISHED_PACKAGE_CHUNK_COUNT_PROPERTY) || 0);
  if (!chunkCount) return null;

  const chunks = [];
  for (let index = 0; index < chunkCount; index += 1) {
    const chunk = properties.getProperty(`${PUBLISHED_PACKAGE_CHUNK_PREFIX}${String(index).padStart(3, "0")}`);
    if (!chunk) throw new Error(`Snapshot-Chunk ${index} fehlt.`);
    chunks.push(chunk);
  }
  return chunks.join("");
}

function clearPackageChunks(properties) {
  const chunkCount = Number(properties.getProperty(PUBLISHED_PACKAGE_CHUNK_COUNT_PROPERTY) || 0);
  for (let index = 0; index < chunkCount; index += 1) {
    properties.deleteProperty(`${PUBLISHED_PACKAGE_CHUNK_PREFIX}${String(index).padStart(3, "0")}`);
  }
}

function readTable(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error(`Tab '${sheetName}' fehlt.`);
  const range = sheet.getDataRange();
  return range.getDisplayValues().filter((row) => row.some((cell) => String(cell).trim()));
}

function readObjects(sheetName, requiredHeaders) {
  const rows = readTable(sheetName);
  const headers = rows[0];
  const missing = requiredHeaders.filter((header) => headers.indexOf(header) === -1);
  if (missing.length) throw new Error(`Tab '${sheetName}' fehlt Spalten: ${missing.join(", ")}.`);

  return rows.slice(1).map((row) => {
    const object = {};
    headers.forEach((header, index) => {
      object[header] = String(row[index] || "").trim();
    });
    return object;
  }).filter((row) => Object.keys(row).some((key) => row[key]));
}

function rowsToKeyValue(rows) {
  const headers = rows[0];
  const keyIndex = headers.indexOf("Schlüssel");
  const valueIndex = headers.indexOf("Wert");
  if (keyIndex === -1 || valueIndex === -1) {
    throw new Error("Einstellungen braucht Spalten Schlüssel und Wert.");
  }

  const result = {};
  rows.slice(1).forEach((row) => {
    const key = String(row[keyIndex] || "").trim();
    if (key) result[key] = String(row[valueIndex] || "").trim();
  });
  return result;
}

function groupBy(rows, field) {
  return rows.reduce((grouped, row) => {
    const key = row[field];
    if (!key) return grouped;
    grouped[key] = grouped[key] || [];
    grouped[key].push(row);
    return grouped;
  }, {});
}

function setting(settings, key, fallback) {
  return settings[key] || fallback;
}

function required(row, field) {
  const value = String(row[field] || "").trim();
  if (!value) throw new Error(`${field} muss gesetzt sein.`);
  return value;
}

function optional(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return undefined;
  if (/^\[.*\]$/.test(trimmed)) return undefined;
  return trimmed;
}

function numberValue(row, field) {
  const value = Number.parseInt(required(row, field), 10);
  if (!Number.isInteger(value)) throw new Error(`${field} muss eine Zahl sein.`);
  return value;
}

function yesNo(value, label) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "JA") return true;
  if (normalized === "NEIN") return false;
  throw new Error(`${label} muss JA oder NEIN sein.`);
}

function splitPipeList(value) {
  const cleaned = optional(value);
  if (!cleaned) return [];
  return cleaned.split("|").map((entry) => entry.trim()).filter(Boolean);
}

function unique(values) {
  return Array.from(new Set(values));
}

function defaultChoices() {
  return [
    { id: "ok", label: "Gemeinsam erledigt." },
    { id: "skip", label: "Aus Zeitgründen weiter." }
  ];
}

function compact(value) {
  return Object.keys(value).reduce((result, key) => {
    if (value[key] !== undefined) result[key] = value[key];
    return result;
  }, {});
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
