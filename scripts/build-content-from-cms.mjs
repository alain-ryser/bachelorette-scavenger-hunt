#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const cmsDirectory = resolve("cms");
const outputPath = resolve("public/content/game-package.json");
const fallbackBasePath = outputPath;

const stationTypes = new Set(["story", "text", "qr", "choice", "travel", "gps", "camera", "finale"]);
const routeIds = new Set(["A", "B"]);

const unlockTypeToStationType = new Map([
  ["STORY", "story"],
  ["GPS_TEXT", "text"],
  ["IMAGE_TEXT", "text"],
  ["QR", "qr"],
  ["AUDIO_SEQUENCE", "choice"],
  ["TRAVEL", "travel"],
  ["GPS_CAMERA", "gps"],
  ["CAMERA", "camera"],
  ["FINALE", "finale"]
]);

const mediaTypeMap = new Map([
  ["BILD", "image"],
  ["IMAGE", "image"],
  ["AUDIO", "audio"],
  ["VIDEO", "video"],
  ["TEXT", "text"]
]);

const offlinePriorityMap = new Map([
  ["HOCH", "high"],
  ["HIGH", "high"],
  ["MITTEL", "medium"],
  ["MEDIUM", "medium"],
  ["NIEDRIG", "low"],
  ["LOW", "low"]
]);

const defaultAppLabel = "Mission Gipfelglück";
const defaultStartIntroText =
  "Ein zentraler Gruppenmodus für Sina: kurze digitale Impulse, klare Reisephasen und genug Raum für Brunch, Schoggi-Führung, Gespräche und Bonistock.";

const args = parseArgs(process.argv.slice(2));
const basePackage = JSON.parse(await readFile(resolve(args.basePath ?? fallbackBasePath), "utf8"));

const settings = rowsToKeyValue(await readCsv("einstellungen.csv"));
const routeRows = rowsToObjects(await readCsv("routen.csv"), [
  "route_id",
  "route_name",
  "route_description",
  "reihenfolge",
  "station_id",
  "aktiviert",
  "kommentar"
]);
const stationRows = rowsToObjects(await readCsv("stationen.csv"), [
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
const hintRows = rowsToObjects(await readCsv("hinweise.csv"), [
  "station_id",
  "stufe",
  "hinweis_text",
  "gueltige_antworten",
  "qr_token",
  "fallback_aktiv"
]);
const mediaRows = rowsToObjects(await readCsv("medien.csv"), [
  "media_id",
  "station_id",
  "typ",
  "drive_url",
  "alt_text",
  "offline_prioritaet",
  "freigegeben",
  "status"
]);

const builtPackage = buildPackage();
await writeFile(outputPath, `${JSON.stringify(builtPackage, null, 2)}\n`);

console.log(
  `CMS-Build erfolgreich: ${builtPackage.routes.length} Routen, ${builtPackage.stations.length} Stationen, ${builtPackage.media?.length ?? 0} Medien → ${outputPath}`
);

function parseArgs(values) {
  const result = {};

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value === "--version") {
      result.contentVersion = values[index + 1];
      index += 1;
      continue;
    }

    if (value === "--base") {
      result.basePath = values[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unbekanntes Argument: ${value}`);
  }

  return result;
}

async function readCsv(fileName) {
  return parseCsv(await readFile(resolve(cmsDirectory, fileName), "utf8"));
}

function buildPackage() {
  const defaultsByStation = new Map(basePackage.stations.map((station) => [station.id, station]));
  const stationIds = new Set(stationRows.map((row) => requiredValue(row, "station_id")));
  const hintsByStation = groupBy(hintRows, "station_id");

  const routes = buildRoutes(stationIds);
  const stations = stationRows.map((row) => buildStation(row, defaultsByStation, hintsByStation));
  const media = mediaRows
    .filter((row) => requiredValue(row, "media_id").length > 0)
    .map((row) => buildMediaItem(row, stationIds));

  return {
    ...basePackage,
    contentVersion: args.contentVersion ?? `sheet-cms-${new Date().toISOString().slice(0, 10)}`,
    event: buildEvent(basePackage.event),
    routes,
    stations,
    media
  };
}

function buildEvent(defaultEvent) {
  return {
    title: setting("spiel_titel", defaultEvent.title),
    subtitle: setting("untertitel", defaultEvent.subtitle),
    appLabel: setting("app_label", defaultEvent.appLabel ?? defaultAppLabel),
    introText: setting("start_intro_text", defaultEvent.introText ?? defaultStartIntroText),
    date: setting("event_datum", defaultEvent.date),
    timezone: setting("zeitzone", defaultEvent.timezone),
    startLocation: defaultEvent.startLocation
  };
}

function buildRoutes(stationIds) {
  const rowsByRoute = groupBy(routeRows, "route_id");

  return Array.from(rowsByRoute.entries()).map(([routeId, rows]) => {
    if (!routeIds.has(routeId)) {
      throw new Error(`Routen: route_id '${routeId}' ist unbekannt.`);
    }

    const activeRows = rows
      .filter((row) => yesNo(requiredValue(row, "aktiviert"), `Routen ${routeId}/${row.station_id}: aktiviert`))
      .sort((a, b) => numberValue(a, "reihenfolge") - numberValue(b, "reihenfolge"));

    if (activeRows.length === 0) {
      throw new Error(`Route ${routeId} enthält keine aktive Station.`);
    }

    const stationIdsForRoute = activeRows.map((row) => requiredValue(row, "station_id"));
    for (const stationId of stationIdsForRoute) {
      if (!stationIds.has(stationId)) {
        throw new Error(`Route ${routeId} verweist auf fehlende Station '${stationId}'.`);
      }
    }

    return {
      id: routeId,
      name: requiredValue(activeRows[0], "route_name"),
      description: optionalValue(activeRows[0].route_description) || requiredValue(activeRows[0], "kommentar"),
      stationIds: stationIdsForRoute
    };
  });
}

function buildStation(row, defaultsByStation, hintsByStation) {
  const stationId = requiredValue(row, "station_id");
  const defaults = defaultsByStation.get(stationId);
  const unlockType = requiredValue(row, "unlock_type").toLocaleUpperCase("de-CH");
  const baseType = unlockTypeToStationType.get(unlockType);

  if (!baseType || !stationTypes.has(baseType)) {
    throw new Error(`Station ${stationId}: unlock_type '${unlockType}' ist unbekannt.`);
  }

  const type = baseType;
  const stationHints = buildHints(hintsByStation.get(stationId) ?? []);
  const answer = buildAnswer(hintsByStation.get(stationId) ?? [], defaults);
  const qrToken = buildQrToken(hintsByStation.get(stationId) ?? [], defaults);
  const fallbackCode = requiredValue(row, "fallback_code");
  const deadline = optionalValue(row.deadline);
  const successText = placeholderToEmpty(row.aufloesung) || defaults?.successText || "Kapitel abgeschlossen.";
  const travelLabel = optionalValue(row.reisehinweis);

  return compactObject({
    ...(defaults ?? {}),
    id: stationId,
    chapter: numberValue(row, "kapitel"),
    title: requiredValue(row, "titel"),
    locationLabel: requiredValue(row, "ort_phase"),
    durationMinutes: numberValue(row, "dauer_min"),
    type,
    prompt: requiredValue(row, "aufgabe_kurz"),
    answer: type === "text" ? answer : undefined,
    choices: type === "choice" ? defaults?.choices ?? defaultChoices(stationId) : undefined,
    qrToken: type === "qr" ? qrToken : undefined,
    successText,
    travel: buildTravel(defaults, travelLabel),
    geo: type === "gps" ? defaults?.geo : undefined,
    deadline,
    fallbackCode,
    hints: stationHints
  });
}

function buildHints(rows) {
  return rows
    .filter((row) => yesNo(row.fallback_aktiv || "JA", `Hinweise ${row.station_id}: fallback_aktiv`))
    .sort((a, b) => numberValue(a, "stufe") - numberValue(b, "stufe"))
    .map((row) => optionalValue(row.hinweis_text))
    .filter(Boolean)
    .slice(0, 2);
}

function buildAnswer(rows, defaults) {
  const accepted = rows.flatMap((row) => splitPipeList(row.gueltige_antworten));
  if (accepted.length > 0) {
    return {
      accepted: unique(accepted),
      normalization: "lowercase-trim-umlaut"
    };
  }

  return defaults?.answer;
}

function buildQrToken(rows, defaults) {
  const token = rows.map((row) => optionalValue(row.qr_token)).find(Boolean);
  return token ?? defaults?.qrToken;
}

function buildTravel(defaults, label) {
  if (!label && !defaults?.travel) return undefined;

  return {
    label: label ?? defaults.travel.label,
    details: defaults?.travel?.details ?? "Details später ergänzen.",
    mapUrl: defaults?.travel?.mapUrl
  };
}

function buildMediaItem(row, stationIds) {
  const id = requiredValue(row, "media_id");
  const stationId = optionalValue(row.station_id);
  if (stationId && !stationIds.has(stationId)) {
    throw new Error(`Medium ${id}: station_id '${stationId}' existiert nicht.`);
  }

  const mediaType = mediaTypeMap.get(requiredValue(row, "typ").toLocaleUpperCase("de-CH"));
  if (!mediaType) {
    throw new Error(`Medium ${id}: typ '${row.typ}' ist unbekannt.`);
  }

  const offlinePriority = offlinePriorityMap.get(requiredValue(row, "offline_prioritaet").toLocaleUpperCase("de-CH"));
  if (!offlinePriority) {
    throw new Error(`Medium ${id}: offline_prioritaet '${row.offline_prioritaet}' ist unbekannt.`);
  }

  return compactObject({
    id,
    stationId,
    type: mediaType,
    driveUrl: optionalValue(row.drive_url),
    altText: requiredValue(row, "alt_text"),
    offlinePriority,
    approved: yesNo(requiredValue(row, "freigegeben"), `Medium ${id}: freigegeben`),
    status: requiredValue(row, "status")
  });
}

function defaultChoices(stationId) {
  if (stationId === "see_sarnen") {
    return [
      { id: "mut", label: "Sina sagt Ja zum Abenteuer." },
      { id: "ruhe", label: "Sina findet den schönsten Blick." },
      { id: "team", label: "Sina bringt alle zusammen." }
    ];
  }

  return [
    { id: "ok", label: "Gemeinsam erledigt." },
    { id: "skip", label: "Aus Zeitgründen weiter." }
  ];
}

function setting(key, fallback) {
  const value = settings.get(key);
  return value ? value : fallback;
}

function rowsToKeyValue(rows) {
  const objects = rowsToObjects(rows, ["Schlüssel", "Wert"]);
  return new Map(objects.map((row) => [row["Schlüssel"], row.Wert]).filter(([key]) => key));
}

function rowsToObjects(rows, requiredHeaders) {
  const [headers, ...body] = rows;

  if (!headers) {
    throw new Error("CMS-Datei ist leer.");
  }

  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`CMS-Datei fehlt Spalten: ${missingHeaders.join(", ")}.`);
  }

  return body
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? ""])));
}

function groupBy(rows, field) {
  const grouped = new Map();
  for (const row of rows) {
    const key = row[field];
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return grouped;
}

function numberValue(row, field) {
  const value = Number.parseInt(requiredValue(row, field), 10);
  if (!Number.isInteger(value)) {
    throw new Error(`${field} muss eine Zahl sein.`);
  }
  return value;
}

function yesNo(value, label) {
  const normalized = value.trim().toLocaleUpperCase("de-CH");
  if (normalized === "JA") return true;
  if (normalized === "NEIN") return false;
  throw new Error(`${label} muss JA oder NEIN sein.`);
}

function splitPipeList(value) {
  const cleaned = placeholderToEmpty(value);
  if (!cleaned) return [];
  return cleaned
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function requiredValue(row, field) {
  const value = row[field];
  if (!value || value.trim().length === 0) {
    throw new Error(`${field} muss gesetzt sein.`);
  }
  return value.trim();
}

function optionalValue(value) {
  return placeholderToEmpty(value ?? "");
}

function placeholderToEmpty(value) {
  const trimmed = value.trim();
  if (/^\[.*\]$/.test(trimmed)) return undefined;
  return trimmed || undefined;
}

function unique(values) {
  return Array.from(new Set(values));
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function parseCsv(input) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === "\"" && inQuotes && nextChar === "\"") {
      cell += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (inQuotes) {
    throw new Error("CSV enthält ein nicht geschlossenes Anführungszeichen.");
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}
