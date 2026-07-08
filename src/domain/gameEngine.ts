import type { GamePackage, GameRoute, Progress, RouteId, Station, StationState } from "./types";

export function getRoute(gamePackage: GamePackage, routeId: RouteId): GameRoute {
  const route = gamePackage.routes.find((candidate) => candidate.id === routeId);
  if (!route) {
    throw new Error(`Route ${routeId} fehlt im Inhaltspaket.`);
  }
  return route;
}

export function getStation(gamePackage: GamePackage, stationId: string): Station {
  const station = gamePackage.stations.find((candidate) => candidate.id === stationId);
  if (!station) {
    throw new Error(`Station ${stationId} fehlt im Inhaltspaket.`);
  }
  return station;
}

export function getRouteStations(gamePackage: GamePackage, routeId: RouteId): Station[] {
  const route = getRoute(gamePackage, routeId);
  return route.stationIds.map((stationId) => getStation(gamePackage, stationId));
}

export function createInitialProgress(gamePackage: GamePackage, routeId: RouteId): Progress {
  const route = getRoute(gamePackage, routeId);
  const now = new Date().toISOString();

  return {
    routeId,
    currentStationId: route.stationIds[0],
    completedStationIds: [],
    recoveredStationIds: [],
    localPhotoIds: [],
    packageVersion: gamePackage.contentVersion,
    startedAtIso: now,
    updatedAtIso: now
  };
}

export function getStationState(progress: Progress, stationId: string): StationState {
  if (progress.recoveredStationIds.includes(stationId)) return "recovered";
  if (progress.completedStationIds.includes(stationId)) return "completed";
  if (progress.currentStationId === stationId) return "active";
  return "locked";
}

export function completeStation(gamePackage: GamePackage, progress: Progress, stationId: string): Progress {
  const route = getRoute(gamePackage, progress.routeId);
  const stationIndex = route.stationIds.indexOf(stationId);

  if (stationIndex < 0) {
    throw new Error(`Station ${stationId} gehört nicht zu Route ${progress.routeId}.`);
  }

  const completedStationIds = addUnique(progress.completedStationIds, stationId);
  const nextStationId = route.stationIds[stationIndex + 1] ?? stationId;

  return {
    ...progress,
    completedStationIds,
    currentStationId: nextStationId,
    updatedAtIso: new Date().toISOString()
  };
}

export function recoverStation(gamePackage: GamePackage, progress: Progress, stationId: string): Progress {
  const completed = completeStation(gamePackage, progress, stationId);

  return {
    ...completed,
    recoveredStationIds: addUnique(progress.recoveredStationIds, stationId)
  };
}

export function isRouteCompleted(gamePackage: GamePackage, progress: Progress): boolean {
  const route = getRoute(gamePackage, progress.routeId);
  return route.stationIds.every((stationId) => progress.completedStationIds.includes(stationId));
}

export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("de-CH")
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("é", "e")
    .replaceAll("è", "e");
}

export function isAcceptedAnswer(station: Station, value: string): boolean {
  if (!station.answer) return false;
  const normalizedValue = normalizeAnswer(value);
  return station.answer.accepted.map(normalizeAnswer).includes(normalizedValue);
}

function addUnique(values: string[], value: string): string[] {
  return values.includes(value) ? values : [...values, value];
}
