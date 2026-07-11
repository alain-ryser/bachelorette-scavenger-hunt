import type { GamePackage } from "./types";

const LOCAL_CONTENT_URL = `${import.meta.env.BASE_URL}content/game-package.json`;
const REMOTE_CMS_URL = import.meta.env.VITE_REMOTE_CMS_URL?.trim();
const REMOTE_CMS_KEY = import.meta.env.VITE_REMOTE_CMS_KEY?.trim();

export type PackageFetchSource = "remote" | "fallback";

export interface PackageFetchResult {
  gamePackage: GamePackage;
  source: PackageFetchSource;
  remoteConfigured: boolean;
}

export function isRemoteCmsConfigured(): boolean {
  return Boolean(REMOTE_CMS_URL);
}

export async function fetchGamePackage(): Promise<GamePackage> {
  return (await fetchGamePackageWithSource()).gamePackage;
}

export async function fetchGamePackageWithSource(): Promise<PackageFetchResult> {
  if (REMOTE_CMS_URL) {
    const remotePackage = await fetchJsonPackage(buildRemoteUrl());
    return {
      gamePackage: remotePackage,
      source: "remote",
      remoteConfigured: true
    };
  }

  const fallbackPackage = await fetchJsonPackage(LOCAL_CONTENT_URL);
  return {
    gamePackage: fallbackPackage,
    source: "fallback",
    remoteConfigured: false
  };
}

export async function fetchFallbackGamePackage(): Promise<GamePackage> {
  return fetchJsonPackage(LOCAL_CONTENT_URL);
}

async function fetchJsonPackage(url: string): Promise<GamePackage> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Inhaltspaket konnte nicht geladen werden (${response.status}).`);
  }

  const data = (await response.json()) as GamePackage;
  validateGamePackage(data);
  return data;
}

function buildRemoteUrl(): string {
  if (!REMOTE_CMS_URL) {
    throw new Error("Remote-CMS ist nicht konfiguriert.");
  }

  const url = new URL(REMOTE_CMS_URL);
  if (REMOTE_CMS_KEY) {
    url.searchParams.set("key", REMOTE_CMS_KEY);
  }
  return url.toString();
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
