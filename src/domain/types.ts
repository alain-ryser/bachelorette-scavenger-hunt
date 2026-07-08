export type RouteId = "A" | "B";

export type StationType = "story" | "text" | "qr" | "choice" | "travel" | "gps" | "camera" | "finale";

export type StationState = "locked" | "available" | "active" | "completed" | "recovered";

export type CapabilityStatus = "unknown" | "supported" | "unsupported";

export interface GamePackage {
  schemaVersion: number;
  contentVersion: string;
  event: {
    title: string;
    subtitle: string;
    date: string;
    timezone: string;
    startLocation: string;
  };
  access: {
    gameCode: string;
  };
  routes: GameRoute[];
  stations: Station[];
}

export interface GameRoute {
  id: RouteId;
  name: string;
  description: string;
  stationIds: string[];
}

export interface Station {
  id: string;
  chapter: number;
  title: string;
  locationLabel: string;
  durationMinutes: number;
  type: StationType;
  prompt: string;
  answer?: {
    accepted: string[];
    normalization: "lowercase-trim-umlaut";
  };
  choices?: Array<{
    id: string;
    label: string;
  }>;
  qrToken?: string;
  successText: string;
  travel?: {
    label: string;
    details: string;
    mapUrl?: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    label: string;
  };
  deadline?: string;
  fallbackCode: string;
  hints: string[];
}

export interface Progress {
  routeId: RouteId;
  currentStationId: string;
  completedStationIds: string[];
  recoveredStationIds: string[];
  localPhotoIds: string[];
  packageVersion: string;
  startedAtIso: string;
  updatedAtIso: string;
}

export interface LocalPhoto {
  id: string;
  stationId: string;
  dataUrl: string;
  createdAtIso: string;
}

export interface RuntimeStatus {
  online: boolean;
  serviceWorker: "unsupported" | "installing" | "ready";
  storage: "unknown" | "ready" | "failed";
  packageCached: boolean;
  camera: CapabilityStatus;
  location: CapabilityStatus;
  qrScanner: CapabilityStatus;
}
