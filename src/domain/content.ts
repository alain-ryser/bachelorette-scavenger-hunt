import type { GamePackage } from "./types";

const CONTENT_URL = `${import.meta.env.BASE_URL}content/game-package.json`;

export async function fetchGamePackage(): Promise<GamePackage> {
  const response = await fetch(CONTENT_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Inhaltspaket konnte nicht geladen werden (${response.status}).`);
  }

  const data = (await response.json()) as GamePackage;
  validateGamePackage(data);
  return data;
}

export function validateGamePackage(gamePackage: GamePackage): void {
  if (gamePackage.schemaVersion !== 1) {
    throw new Error(`Nicht unterstützte CMS-Schema-Version: ${gamePackage.schemaVersion}.`);
  }

  const stationIds = new Set(gamePackage.stations.map((station) => station.id));
  for (const route of gamePackage.routes) {
    if (route.stationIds.length === 0) {
      throw new Error(`Route ${route.id} enthält keine Stationen.`);
    }

    for (const stationId of route.stationIds) {
      if (!stationIds.has(stationId)) {
        throw new Error(`Route ${route.id} verweist auf fehlende Station ${stationId}.`);
      }
    }
  }
}
