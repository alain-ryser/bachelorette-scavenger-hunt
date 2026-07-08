#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const knownRouteIds = new Set(["A", "B"]);
const knownStationTypes = new Set(["story", "text", "qr", "choice", "travel", "camera", "finale"]);

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

  if (!uniqueValues(fallbackCodes)) {
    error("fallbackCode muss über alle Stationen eindeutig sein.");
  }
}

function validateEvent(event) {
  if (!isRecord(event)) {
    error("event muss ein Objekt sein.");
    return;
  }

  for (const field of ["title", "subtitle", "date", "timezone", "startLocation"]) {
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

function validateTextStation(station, label) {
  if (!isRecord(station.answer)) {
    error(`${label}: Text-Station braucht answer.`);
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
