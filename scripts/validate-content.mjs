#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const knownRouteIds = new Set(["A", "B"]);
const knownStationTypes = new Set(["story", "text", "qr", "choice", "travel", "gps", "camera", "finale"]);
const knownMediaTypes = new Set(["image", "audio", "video", "text"]);
const knownOfflinePriorities = new Set(["high", "medium", "low"]);

const filePath = resolve(process.argv[2] ?? "public/content/game-package.json");
const errors = [];
const warnings = [];

function error(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function uniqueValues(values) {
  return new Set(values).size === values.length;
}

function describeStation(station) {
  return isRecord(station) && nonEmptyString(station.id) ? `Station ${station.id}` : "Station ohne ID";
}

const raw = await readFile(filePath, "utf8");
let gamePackage;

try {
  gamePackage = JSON.parse(raw);
} catch (cause) {
  console.error(`Content-Paket ist kein gültiges JSON: ${cause.message}`);
  process.exit(1);
}

if (!isRecord(gamePackage)) {
  error("Content-Paket muss ein Objekt sein.");
} else {
  validatePackage(gamePackage);
}

for (const message of warnings) {
  console.warn(`Warnung: ${message}`);
}

if (errors.length > 0) {
  console.error(`Content-Validierung fehlgeschlagen (${errors.length} Fehler):`);
  for (const message of errors) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log(`Content-Validierung erfolgreich: ${gamePackage.routes.length} Routen, ${gamePackage.stations.length} Stationen.`);

function validatePackage(value) {
  if (value.schemaVersion !== 1) {
    error("schemaVersion muss 1 sein.");
  }

  for (const field of ["contentVersion"]) {
    if (!nonEmptyString(value[field])) {
      error(`${field} muss gesetzt sein.`);
    }
  }

  validateEvent(value.event);
  validateAccess(value.access);

  if (!Array.isArray(value.routes) || value.routes.length === 0) {
    error("routes muss mindestens eine Route enthalten.");
  }

  if (!Array.isArray(value.stations) || value.stations.length === 0) {
    error("stations muss mindestens eine Station enthalten.");
  }

  if (!Array.isArray(value.routes) || !Array.isArray(value.stations)) {
    return;
  }

  const stationIds = value.stations.map((station) => station?.id).filter(Boolean);
  if (!uniqueValues(stationIds)) {
    error("Station-IDs müssen eindeutig sein.");
  }

  const routeIds = value.routes.map((route) => route?.id).filter(Boolean);
  if (!uniqueValues(routeIds)) {
    error("Route-IDs müssen eindeutig sein.");
  }

  const stationIdSet = new Set(stationIds);
  const fallbackCodes = [];

  for (const route of value.routes) {
    validateRoute(route, stationIdSet);
  }

  for (const station of value.stations) {
    validateStation(station, fallbackCodes);
  }

  if (value.media !== undefined) {
    validateMediaManifest(value.media, stationIdSet);
  }

  if (!uniqueValues(fallbackCodes)) {
    error("fallbackCode muss über alle Stationen eindeutig sein.");
  }
}

function validateEvent(event) {
  if (!isRecord(event)) {
    error("event muss ein Objekt sein.");
    return;
  }

  for (const field of ["title", "subtitle", "appLabel", "introText", "date", "timezone", "startLocation"]) {
    if (!nonEmptyString(event[field])) {
      error(`event.${field} muss gesetzt sein.`);
    }
  }

  if (nonEmptyString(event.date) && !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    error("event.date muss im Format YYYY-MM-DD sein.");
  }
}

function validateAccess(access) {
  if (!isRecord(access)) {
    error("access muss ein Objekt sein.");
    return;
  }

  if (!nonEmptyString(access.gameCode)) {
    error("access.gameCode muss gesetzt sein.");
  }
}

function validateRoute(route, stationIdSet) {
  if (!isRecord(route)) {
    error("Jede Route muss ein Objekt sein.");
    return;
  }

  if (!knownRouteIds.has(route.id)) {
    error(`Route ${route.id ?? "(ohne ID)"} hat eine unbekannte ID.`);
  }

  for (const field of ["name", "description"]) {
    if (!nonEmptyString(route[field])) {
      error(`Route ${route.id ?? "(ohne ID)"}.${field} muss gesetzt sein.`);
    }
  }

  if (!Array.isArray(route.stationIds) || route.stationIds.length === 0) {
    error(`Route ${route.id ?? "(ohne ID)"} braucht stationIds.`);
    return;
  }

  if (!uniqueValues(route.stationIds)) {
    error(`Route ${route.id} enthält doppelte stationIds.`);
  }

  for (const stationId of route.stationIds) {
    if (!stationIdSet.has(stationId)) {
      error(`Route ${route.id} verweist auf fehlende Station ${stationId}.`);
    }
  }
}

function validateStation(station, fallbackCodes) {
  if (!isRecord(station)) {
    error("Jede Station muss ein Objekt sein.");
    return;
  }

  const label = describeStation(station);

  for (const field of ["id", "title", "locationLabel", "prompt", "successText", "fallbackCode"]) {
    if (!nonEmptyString(station[field])) {
      error(`${label}: ${field} muss gesetzt sein.`);
    }
  }

  if (!Number.isInteger(station.chapter) || station.chapter < 1) {
    error(`${label}: chapter muss eine positive ganze Zahl sein.`);
  }

  if (!Number.isInteger(station.durationMinutes) || station.durationMinutes < 1 || station.durationMinutes > 30) {
    error(`${label}: durationMinutes muss zwischen 1 und 30 liegen.`);
  }

  if (!knownStationTypes.has(station.type)) {
    error(`${label}: type '${station.type}' ist unbekannt.`);
    return;
  }

  if (nonEmptyString(station.fallbackCode)) {
    fallbackCodes.push(station.fallbackCode);
  }

  if (!Array.isArray(station.hints)) {
    error(`${label}: hints muss eine Liste sein.`);
  } else if (station.hints.length > 2) {
    error(`${label}: höchstens zwei Hinweise erlaubt.`);
  } else if (station.hints.some((hint) => !nonEmptyString(hint))) {
    error(`${label}: Hinweise dürfen nicht leer sein.`);
  }

  if (station.deadline !== undefined && (!nonEmptyString(station.deadline) || !validTime(station.deadline))) {
    error(`${label}: deadline muss HH:mm sein.`);
  }

  if (station.travel !== undefined) {
    validateTravel(station, label);
  }

  if (station.geo !== undefined) {
    validateGeo(station, label);
  }

  if (station.type === "text") {
    validateTextStation(station, label);
  }

  if (station.type === "qr" && !nonEmptyString(station.qrToken)) {
    error(`${label}: QR-Station braucht qrToken.`);
  }

  if (station.type === "choice") {
    validateChoiceStation(station, label);
  }
}

function validateTravel(station, label) {
  if (!isRecord(station.travel)) {
    error(`${label}: travel muss ein Objekt sein.`);
    return;
  }

  for (const field of ["label", "details"]) {
    if (!nonEmptyString(station.travel[field])) {
      error(`${label}: travel.${field} muss gesetzt sein.`);
    }
  }

  if (station.travel.mapUrl !== undefined && !validUrl(station.travel.mapUrl)) {
    error(`${label}: travel.mapUrl muss eine gültige URL sein.`);
  }
}

function validateGeo(station, label) {
  if (!isRecord(station.geo)) {
    error(`${label}: geo muss ein Objekt sein.`);
    return;
  }

  if (typeof station.geo.latitude !== "number" || station.geo.latitude < -90 || station.geo.latitude > 90) {
    error(`${label}: geo.latitude muss zwischen -90 und 90 liegen.`);
  }

  if (typeof station.geo.longitude !== "number" || station.geo.longitude < -180 || station.geo.longitude > 180) {
    error(`${label}: geo.longitude muss zwischen -180 und 180 liegen.`);
  }

  if (!Number.isInteger(station.geo.radiusMeters) || station.geo.radiusMeters < 25 || station.geo.radiusMeters > 5000) {
    error(`${label}: geo.radiusMeters muss eine ganze Zahl zwischen 25 und 5000 sein.`);
  }

  if (!nonEmptyString(station.geo.label)) {
    error(`${label}: geo.label muss gesetzt sein.`);
  }
}

function validateTextStation(station, label) {
  if (station.answer === undefined) {
    warn(`${label}: Text-Station hat keine akzeptierten Antworten und ist nur per Fallback lösbar.`);
    return;
  }

  if (!isRecord(station.answer)) {
    error(`${label}: answer muss ein Objekt sein.`);
    return;
  }

  if (!Array.isArray(station.answer.accepted) || station.answer.accepted.length === 0) {
    error(`${label}: answer.accepted braucht mindestens eine Antwort.`);
  } else if (station.answer.accepted.some((answer) => !nonEmptyString(answer))) {
    error(`${label}: answer.accepted darf keine leeren Antworten enthalten.`);
  }

  if (station.answer.normalization !== "lowercase-trim-umlaut") {
    error(`${label}: answer.normalization muss lowercase-trim-umlaut sein.`);
  }
}

function validateMediaManifest(mediaItems, stationIdSet) {
  if (!Array.isArray(mediaItems)) {
    error("media muss eine Liste sein.");
    return;
  }

  const mediaIds = [];
  for (const mediaItem of mediaItems) {
    if (!isRecord(mediaItem)) {
      error("Jedes Medium muss ein Objekt sein.");
      continue;
    }

    const label = nonEmptyString(mediaItem.id) ? `Medium ${mediaItem.id}` : "Medium ohne ID";

    if (!nonEmptyString(mediaItem.id)) {
      error(`${label}: id muss gesetzt sein.`);
    } else {
      mediaIds.push(mediaItem.id);
    }

    if (mediaItem.stationId !== undefined && nonEmptyString(mediaItem.stationId) && !stationIdSet.has(mediaItem.stationId)) {
      error(`${label}: stationId '${mediaItem.stationId}' existiert nicht.`);
    }

    if (!knownMediaTypes.has(mediaItem.type)) {
      error(`${label}: type '${mediaItem.type}' ist unbekannt.`);
    }

    if (mediaItem.driveUrl !== undefined && nonEmptyString(mediaItem.driveUrl) && !validUrl(mediaItem.driveUrl)) {
      error(`${label}: driveUrl muss eine gültige URL sein.`);
    }

    if (!nonEmptyString(mediaItem.altText)) {
      error(`${label}: altText muss gesetzt sein.`);
    }

    if (!knownOfflinePriorities.has(mediaItem.offlinePriority)) {
      error(`${label}: offlinePriority muss high, medium oder low sein.`);
    }

    if (typeof mediaItem.approved !== "boolean") {
      error(`${label}: approved muss boolean sein.`);
    }

    if (!nonEmptyString(mediaItem.status)) {
      error(`${label}: status muss gesetzt sein.`);
    }
  }

  if (!uniqueValues(mediaIds)) {
    error("Media-IDs müssen eindeutig sein.");
  }
}

function validateChoiceStation(station, label) {
  if (!Array.isArray(station.choices) || station.choices.length < 2) {
    error(`${label}: Choice-Station braucht mindestens zwei choices.`);
    return;
  }

  const choiceIds = station.choices.map((choice) => choice?.id).filter(Boolean);
  if (!uniqueValues(choiceIds)) {
    error(`${label}: choice IDs müssen eindeutig sein.`);
  }

  for (const choice of station.choices) {
    if (!isRecord(choice) || !nonEmptyString(choice.id) || !nonEmptyString(choice.label)) {
      error(`${label}: jede choice braucht id und label.`);
    }
  }

  if (station.choices.length > 4) {
    warn(`${label}: mehr als vier choices könnten unterwegs zu viel sein.`);
  }
}
