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
        <p className="eyebrow">Samstag · 19. September 2026</p>
        <h2>{gamePackage.event.title}</h2>
        <p>
          Ein zentraler Gruppenmodus für Sina: kurze digitale Impulse, klare Reisephasen und genug Raum für
          Brunch, Schoggi-Führung, Gespräche und Bonistock.
        </p>
      </section>

      <section className="panel">
        <div className="section-title">
          <span>1</span>
          <div>
            <h3>Spiel entsperren</h3>
            <p>Ein Code reicht für Start und Prototyp-Test. Später kommt hier der geheime QR-Link dazu.</p>
          </div>
        </div>

        <label className="field">
          Spielcode
          <input
            value={gameCode}
            onChange={(event) => onGameCodeChange(event.target.value)}
            placeholder="z.B. SINA-2026"
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
            CMS-Snapshot neu laden
          </button>
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
          {runtimeStatus.packageCached ? "lokal gespeichert" : "noch nicht lokal bestätigt"}.
        </p>
      </section>
    </main>
  );
}
