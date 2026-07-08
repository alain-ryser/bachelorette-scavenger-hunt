#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const stationTypes = new Set(["story", "text", "qr", "choice", "travel", "gps", "camera", "finale"]);
const requiredHeaders = [
  "station_id",
  "route_a",
  "route_b",
  "titel",
  "ort_phase",
  "typ",
  "dauer_min",
  "aufgabe",
  "reisehinweis",
  "fallback_code",
  "status"
];

const args = parseArgs(process.argv.slice(2));
const cmsPath = resolve(args.cmsPath ?? "cms/prototyp-cms.csv");
const basePath = resolve(args.basePath ?? "public/content/game-package.json");
const outputPath = resolve(args.outputPath ?? "public/content/game-package.json");

const rows = parseCsv(await readFile(cmsPath, "utf8"));
const basePackage = JSON.parse(await readFile(basePath, "utf8"));
const builtPackage = buildPackage(basePackage, rows, args.contentVersion);

await writeFile(outputPath, `${JSON.stringify(builtPackage, null, 2)}\n`);

console.log(
  `CMS-Build erfolgreich: ${builtPackage.routes.length} Routen, ${builtPackage.stations.length} Stationen → ${outputPath}`
);

function parseArgs(values) {
  const positional = [];
  let contentVersion;

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value === "--version") {
      contentVersion = values[index + 1];
      index += 1;
      continue;
    }

    positional.push(value);
  }

  return {
    cmsPath: positional[0],
    basePath: positional[1],
    outputPath: positional[2],
    contentVersion
  };
}

function buildPackage(basePackage, rows, contentVersion) {
  const cmsRows = rowsToObjects(rows);
  const stationDefaults = new Map(basePackage.stations.map((station) => [station.id, station]));
  const stationIds = new Set();

  const stations = cmsRows.map((row, index) => {
    const stationId = requiredValue(row, "station_id", index);
    const defaults = stationDefaults.get(stationId);

    if (!defaults) {
      throw new Error(`CMS-Zeile ${index + 2}: station_id '${stationId}' existiert nicht in den technischen Defaults.`);
    }

    if (stationIds.has(stationId)) {
      throw new Error(`CMS-Zeile ${index + 2}: station_id '${stationId}' ist doppelt.`);
    }
    stationIds.add(stationId);

    const type = requiredValue(row, "typ", index);
    if (!stationTypes.has(type)) {
      throw new Error(`CMS-Zeile ${index + 2}: typ '${type}' ist unbekannt.`);
    }

    const durationMinutes = Number.parseInt(requiredValue(row, "dauer_min", index), 10);
    if (!Number.isInteger(durationMinutes)) {
      throw new Error(`CMS-Zeile ${index + 2}: dauer_min muss eine Zahl sein.`);
    }

    const travelLabel = requiredValue(row, "reisehinweis", index);

    return compactObject({
      ...defaults,
      chapter: index + 1,
      title: requiredValue(row, "titel", index),
      locationLabel: requiredValue(row, "ort_phase", index),
      durationMinutes,
      type,
      prompt: requiredValue(row, "aufgabe", index),
      fallbackCode: requiredValue(row, "fallback_code", index),
      travel: defaults.travel
        ? {
            ...defaults.travel,
            label: travelLabel
          }
        : defaults.travel
    });
  });

  const routeAStationIds = collectRouteStationIds(cmsRows, "route_a");
  const routeBStationIds = collectRouteStationIds(cmsRows, "route_b");

  if (routeAStationIds.length === 0 || routeBStationIds.length === 0) {
    throw new Error("Route A und Route B müssen jeweils mindestens eine aktive Station enthalten.");
  }

  const routes = basePackage.routes.map((route) => {
    if (route.id === "A") {
      return { ...route, stationIds: routeAStationIds };
    }

    if (route.id === "B") {
      return { ...route, stationIds: routeBStationIds };
    }

    return route;
  });

  return {
    ...basePackage,
    contentVersion: contentVersion ?? basePackage.contentVersion,
    routes,
    stations
  };
}

function rowsToObjects(rows) {
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

function collectRouteStationIds(rows, routeColumn) {
  return rows
    .filter((row, index) => {
      const value = requiredValue(row, routeColumn, index).toLocaleUpperCase("de-CH");
      if (value !== "JA" && value !== "NEIN") {
        throw new Error(`CMS-Zeile ${index + 2}: ${routeColumn} muss JA oder NEIN sein.`);
      }
      return value === "JA";
    })
    .map((row) => row.station_id);
}

function requiredValue(row, field, rowIndex) {
  const value = row[field];
  if (!value) {
    throw new Error(`CMS-Zeile ${rowIndex + 2}: ${field} muss gesetzt sein.`);
  }
  return value;
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
