import { useMemo, useState } from "react";
import { getRouteStations, getStation, isAcceptedAnswer, isRouteCompleted } from "../domain/gameEngine";
import type { GamePackage, Progress, Station } from "../domain/types";
import { ProgressRail } from "./ProgressRail";

interface StationScreenProps {
  gamePackage: GamePackage;
  progress: Progress;
  onComplete: (stationId: string) => void;
  onRecover: (stationId: string) => void;
  onReset: () => void;
}

export function StationScreen({
  gamePackage,
  progress,
  onComplete,
  onRecover,
  onReset
}: StationScreenProps) {
  const station = getStation(gamePackage, progress.currentStationId);
  const stations = useMemo(() => getRouteStations(gamePackage, progress.routeId), [gamePackage, progress.routeId]);
  const currentRouteIndex = stations.findIndex((candidate) => candidate.id === station.id);
  const completed = isRouteCompleted(gamePackage, progress);

  return (
    <main className="screen mission-screen">
      <ProgressRail gamePackage={gamePackage} progress={progress} />
      {completed ? (
        <FinalSummary stations={stations} progress={progress} onReset={onReset} />
      ) : (
        <StationCard
          key={station.id}
          station={station}
          routeChapter={currentRouteIndex + 1}
          onComplete={onComplete}
          onRecover={onRecover}
        />
      )}
    </main>
  );
}

interface StationCardProps {
  station: Station;
  routeChapter: number;
  onComplete: (stationId: string) => void;
  onRecover: (stationId: string) => void;
}

function StationCard({
  station,
  routeChapter,
  onComplete,
  onRecover
}: StationCardProps) {
  const [answer, setAnswer] = useState("");
  const [visibleHints, setVisibleHints] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [solved, setSolved] = useState(false);

  function markSolved() {
    setSolved(true);
    setMessage(null);
  }

  function handlePrimaryAction(value?: string) {
    if (station.type === "text") {
      if (isAcceptedAnswer(station, answer)) {
        markSolved();
        return;
      }
      if (answer.trim().toLocaleUpperCase("de-CH") === station.fallbackCode) {
        markSolved();
        return;
      }
      setMessage("Noch nicht. Nutzt bei Bedarf einen Hinweis oder den Fallback-Code.");
      return;
    }

    if (station.type === "qr") {
      const normalized = answer.trim().toLocaleUpperCase("de-CH");
      if (normalized === station.qrToken || normalized === station.fallbackCode) {
        markSolved();
        return;
      }
      setMessage("QR noch nicht erkannt. Für den Prototyp den Token oder Ersatzcode eingeben.");
      return;
    }

    if (station.type === "choice" && value) {
      markSolved();
      return;
    }

    markSolved();
  }

  function handleRecovery() {
    onRecover(station.id);
  }

  return (
    <section className="station-layout">
      <article className="station-card">
        <div className="station-meta">
          <span>Kapitel {routeChapter}</span>
          <span>{station.durationMinutes} Min.</span>
          {station.deadline ? <span>Deadline {station.deadline}</span> : null}
        </div>
        <h2>{station.title}</h2>
        <p className="location">{station.locationLabel}</p>

        {solved ? (
          <>
            <p className="message">{station.successText}</p>
            <button className="primary-button" type="button" onClick={() => onComplete(station.id)}>
              {station.type === "finale" ? "Mission abschliessen" : "Weiter zum nächsten Kapitel"}
            </button>
          </>
        ) : (
          <>
            <p>{station.prompt}</p>

            <Interaction
              station={station}
              answer={answer}
              onAnswerChange={setAnswer}
              onPrimaryAction={handlePrimaryAction}
            />

            {message ? <p className="message">{message}</p> : null}

            <div className="button-row">
              {station.hints.length > visibleHints ? (
                <button className="ghost-button" type="button" onClick={() => setVisibleHints((count) => count + 1)}>
                  Hinweis {visibleHints + 1} anzeigen
                </button>
              ) : null}
              <button className="text-button" type="button" onClick={() => setShowRecovery((value) => !value)}>
                Notfallfunktion
              </button>
            </div>

            {visibleHints > 0 ? (
              <div className="hint-box">
                {station.hints.slice(0, visibleHints).map((hint, index) => (
                  <p key={hint}>
                    <strong>Hinweis {index + 1}:</strong> {hint}
                  </p>
                ))}
              </div>
            ) : null}

            {showRecovery ? (
              <div className="recovery-box">
                <p>
                  Recovery überspringt diese Station und markiert sie als technisch überbrückt. Das ist für GPS, QR
                  oder Zeitdruck gedacht.
                </p>
                <button className="danger-button" type="button" onClick={handleRecovery}>
                  Station überspringen
                </button>
              </div>
            ) : null}
          </>
        )}
      </article>

      {solved && station.travel ? (
        <aside className="travel-card">
          <p className="eyebrow">Danach</p>
          <h3>{station.travel.label}</h3>
          <p>{station.travel.details}</p>
          {station.travel.mapUrl ? (
            <a href={station.travel.mapUrl} target="_blank" rel="noreferrer">
              Karte öffnen
            </a>
          ) : null}
        </aside>
      ) : !solved ? (
        <aside className="travel-card subtle-card">
          <p className="eyebrow">Nächster Schritt</p>
          <h3>Wird nach dem Kapitel freigeschaltet</h3>
          <p>So bleibt die Lösung des aktuellen Rätsels verdeckt.</p>
        </aside>
      ) : null}
    </section>
  );
}

interface InteractionProps {
  station: Station;
  answer: string;
  onAnswerChange: (value: string) => void;
  onPrimaryAction: (choiceId?: string) => void;
}

function Interaction({ station, answer, onAnswerChange, onPrimaryAction }: InteractionProps) {
  if (station.type === "text" || station.type === "qr") {
    return (
      <div className="interaction-block">
        <label className="field">
          {station.type === "qr" ? "QR-Token oder Ersatzcode" : "Antwort oder Fallback-Code"}
          <input value={answer} onChange={(event) => onAnswerChange(event.target.value)} autoComplete="off" />
        </label>
        <button className="primary-button" type="button" onClick={() => onPrimaryAction()}>
          Prüfen
        </button>
      </div>
    );
  }

  if (station.type === "choice" && station.choices) {
    return (
      <div className="choice-list">
        {station.choices.map((choice) => (
          <button key={choice.id} className="choice-button" type="button" onClick={() => onPrimaryAction(choice.id)}>
            {choice.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <button className="primary-button" type="button" onClick={() => onPrimaryAction()}>
      {station.type === "finale" ? "Mission abschliessen" : "Kapitel abschliessen"}
    </button>
  );
}

function FinalSummary({
  stations,
  progress,
  onReset
}: {
  stations: Station[];
  progress: Progress;
  onReset: () => void;
}) {
  return (
    <section className="panel finale-panel">
      <p className="eyebrow">Mission abgeschlossen</p>
      <h2>Oben angekommen.</h2>
      <p>Alle Kapitel der Route {progress.routeId} sind abgeschlossen. Fotos bleiben im Prototyp lokal.</p>
      <div className="summary-grid">
        {stations.map((station, index) => (
          <div key={station.id} className="summary-item">
            <span>{index + 1}</span>
            <strong>{station.title}</strong>
            <small>{station.locationLabel}</small>
          </div>
        ))}
      </div>
      <button className="ghost-button" type="button" onClick={onReset}>
        Prototyp zurücksetzen
      </button>
    </section>
  );
}
