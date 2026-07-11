import type { GamePackage, RouteId, RuntimeStatus } from "../domain/types";

interface StartScreenProps {
  gamePackage: GamePackage;
  runtimeStatus: RuntimeStatus;
  gameCode: string;
  selectedRouteId: RouteId;
  error: string | null;
  onGameCodeChange: (value: string) => void;
  onRouteChange: (routeId: RouteId) => void;
  onStart: () => void;
  onRefreshPackage: () => void;
}

export function StartScreen({
  gamePackage,
  runtimeStatus,
  gameCode,
  selectedRouteId,
  error,
  onGameCodeChange,
  onRouteChange,
  onStart,
  onRefreshPackage
}: StartScreenProps) {
  return (
    <main className="screen start-screen">
      <section className="hero-card">
        <p className="eyebrow">{formatEventDate(gamePackage.event.date)}</p>
        <h2>{gamePackage.event.title}</h2>
        <p>{gamePackage.event.introText}</p>
      </section>

      <section className="panel">
        <label className="field">
          Spielcode
          <input
            value={gameCode}
            onChange={(event) => onGameCodeChange(event.target.value)}
            placeholder="Geheimer Spielcode"
            autoComplete="off"
          />
        </label>

        <div className="route-grid">
          {gamePackage.routes.map((route) => (
            <button
              key={route.id}
              className={route.id === selectedRouteId ? "route-card selected" : "route-card"}
              onClick={() => onRouteChange(route.id)}
              type="button"
            >
              <strong>Route {route.id}: {route.name}</strong>
              <span>{route.description}</span>
            </button>
          ))}
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="button-row">
          <button className="primary-button" onClick={onStart} type="button">
            Mission starten
          </button>
          <button className="ghost-button" onClick={onRefreshPackage} type="button">
            Inhaltsversion neu prüfen
          </button>
        </div>
      </section>

      <section className="panel compact">
        <h3>Vorabcheck</h3>
        <div className="check-grid">
          <StatusCheck label="Content" value={`Version ${gamePackage.contentVersion}`} ok={runtimeStatus.packageCached} />
          <StatusCheck
            label="Quelle"
            value={formatContentSource(runtimeStatus)}
            ok={runtimeStatus.contentSource === "remote" || runtimeStatus.packageCached}
            optional={runtimeStatus.contentSource !== "remote"}
          />
          <StatusCheck
            label="Letzter Sync"
            value={formatLastRemoteSync(runtimeStatus.lastRemoteSyncIso)}
            ok={Boolean(runtimeStatus.lastRemoteSyncIso)}
            optional
          />
          <StatusCheck
            label="Speicher"
            value={runtimeStatus.storage === "ready" ? "IndexedDB bereit" : "Speicher prüfen"}
            ok={runtimeStatus.storage === "ready"}
          />
          <StatusCheck
            label="PWA"
            value={runtimeStatus.serviceWorker === "ready" ? "installierbar" : "Service Worker noch nicht bereit"}
            ok={runtimeStatus.serviceWorker === "ready"}
          />
          <StatusCheck
            label="Netz"
            value={runtimeStatus.online ? "online" : "offline / lokaler Snapshot"}
            ok={runtimeStatus.online || runtimeStatus.packageCached}
          />
          <StatusCheck
            label="Kamera"
            value={runtimeStatus.camera === "supported" ? "verfügbar" : "Fallback-Code möglich"}
            ok={runtimeStatus.camera === "supported"}
            optional
          />
          <StatusCheck
            label="Standort"
            value={runtimeStatus.location === "supported" ? "verfügbar" : "Fallback-Code möglich"}
            ok={runtimeStatus.location === "supported"}
            optional
          />
          <StatusCheck
            label="QR"
            value={runtimeStatus.qrScanner === "supported" ? "Scanner verfügbar" : "manueller Code möglich"}
            ok={runtimeStatus.qrScanner === "supported"}
            optional
          />
        </div>
      </section>

      <section className="panel compact">
        <h3>Android-Installation</h3>
        <ol className="steps">
          <li>Link in Chrome auf dem Spielhandy öffnen.</li>
          <li>Menü öffnen und „Zum Startbildschirm hinzufügen“ wählen.</li>
          <li>Vor dem Anlass einmal starten und Offline-Status prüfen.</li>
        </ol>
        <p className="muted">
          Aktuell: Speicher {runtimeStatus.storage}, Service Worker {runtimeStatus.serviceWorker}, Paket{" "}
          {runtimeStatus.packageCached ? "lokal gespeichert" : "noch nicht lokal bestätigt"}. Remote-CMS{" "}
          {runtimeStatus.remoteConfigured ? "konfiguriert" : "nicht konfiguriert"}.
        </p>
      </section>
    </main>
  );
}

function StatusCheck({
  label,
  value,
  ok,
  optional = false
}: {
  label: string;
  value: string;
  ok: boolean;
  optional?: boolean;
}) {
  return (
    <div className={ok ? "check-item ok" : optional ? "check-item optional" : "check-item warn"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatEventDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("de-CH", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function formatContentSource(runtimeStatus: RuntimeStatus): string {
  if (runtimeStatus.contentSource === "remote") return "Remote-Sheet";
  if (runtimeStatus.contentSource === "cache") return "lokaler Cache";
  if (runtimeStatus.contentSource === "fallback") return "App-Fallback";
  return runtimeStatus.remoteConfigured ? "Remote-CMS bereit" : "lokaler Prototyp";
}

function formatLastRemoteSync(syncIso?: string): string {
  if (!syncIso) return "noch kein Remote-Sync";
  const parsed = new Date(syncIso);
  if (Number.isNaN(parsed.getTime())) return syncIso;
  return parsed.toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
