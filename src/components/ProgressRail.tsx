import { getStationState } from "../domain/gameEngine";
import type { GamePackage, Progress } from "../domain/types";

interface ProgressRailProps {
  gamePackage: GamePackage;
  progress: Progress;
}

export function ProgressRail({ gamePackage, progress }: ProgressRailProps) {
  const route = gamePackage.routes.find((candidate) => candidate.id === progress.routeId);
  if (!route) return null;

  return (
    <nav className="progress-rail" aria-label="Fortschritt">
      {route.stationIds.map((stationId, index) => {
        const station = gamePackage.stations.find((candidate) => candidate.id === stationId);
        const state = getStationState(progress, stationId);
        const label =
          state === "completed" || state === "recovered" || state === "active"
            ? station?.locationLabel ?? `Kapitel ${index + 1}`
            : `Kapitel ${index + 1}`;
        return (
          <div className={`progress-step ${state}`} key={stationId}>
            <span>{index + 1}</span>
            <small>{label}</small>
          </div>
        );
      })}
    </nav>
  );
}
