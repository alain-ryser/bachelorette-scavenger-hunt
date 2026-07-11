import type { GamePackage, Progress, RuntimeStatus } from "../domain/types";

interface AppShellProps {
  gamePackage: GamePackage;
  progress: Progress | null;
  runtimeStatus: RuntimeStatus;
  children: React.ReactNode;
}

export function AppShell({ gamePackage, progress, runtimeStatus, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{gamePackage.event.appLabel}</p>
          <h1>{gamePackage.event.subtitle}</h1>
        </div>
        <StatusPills progress={progress} runtimeStatus={runtimeStatus} />
      </header>
      {children}
    </div>
  );
}

function StatusPills({ progress, runtimeStatus }: Pick<AppShellProps, "progress" | "runtimeStatus">) {
  return (
    <div className="status-pills" aria-label="App Status">
      <span className={runtimeStatus.online ? "pill ok" : "pill warn"}>
        {runtimeStatus.online ? "online" : "offline"}
      </span>
      <span className={runtimeStatus.serviceWorker === "ready" ? "pill ok" : "pill"}>
        {runtimeStatus.serviceWorker === "ready" ? "installierbar" : "PWA lädt"}
      </span>
      <span className={runtimeStatus.packageCached ? "pill ok" : "pill warn"}>
        {runtimeStatus.packageCached ? contentSourceLabel(runtimeStatus.contentSource) : "CMS offen"}
      </span>
      {progress ? <span className="pill route">Route {progress.routeId}</span> : null}
    </div>
  );
}

function contentSourceLabel(source: RuntimeStatus["contentSource"]): string {
  if (source === "remote") return "CMS remote";
  if (source === "cache") return "CMS Cache";
  if (source === "fallback") return "CMS Fallback";
  return "CMS lokal";
}
