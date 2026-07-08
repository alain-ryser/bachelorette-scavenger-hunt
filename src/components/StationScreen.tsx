import { useEffect, useMemo, useRef, useState } from "react";
import { getRouteStations, getStation, isAcceptedAnswer, isRouteCompleted } from "../domain/gameEngine";
import type { GamePackage, LocalPhoto, Progress, Station } from "../domain/types";
import { readLocalPhotos, saveLocalPhoto } from "../storage/db";
import { ProgressRail } from "./ProgressRail";

interface StationScreenProps {
  gamePackage: GamePackage;
  progress: Progress;
  onComplete: (stationId: string) => void;
  onRecover: (stationId: string) => void;
  onPhotoSaved: (photoId: string) => void;
  onReset: () => void;
}

export function StationScreen({
  gamePackage,
  progress,
  onComplete,
  onRecover,
  onPhotoSaved,
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
          onPhotoSaved={onPhotoSaved}
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
  onPhotoSaved: (photoId: string) => void;
}

function StationCard({
  station,
  routeChapter,
  onComplete,
  onRecover,
  onPhotoSaved
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
      const normalized = (value ?? answer).trim().toLocaleUpperCase("de-CH");
      if (normalized === station.qrToken || normalized === station.fallbackCode) {
        markSolved();
        return;
      }
      setMessage("QR noch nicht erkannt. Für den Prototyp den Token oder Ersatzcode eingeben.");
      return;
    }

    if (station.type === "gps") {
      if (value === "__gps_arrived__") {
        markSolved();
        return;
      }
      if (answer.trim().toLocaleUpperCase("de-CH") === station.fallbackCode) {
        markSolved();
        return;
      }
      setMessage("Noch nicht bestätigt. Standort prüfen oder Fallback-Code verwenden.");
      return;
    }

    if (station.type === "choice" && value) {
      markSolved();
      return;
    }

    if (station.type === "camera") {
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
              onPhotoSaved={onPhotoSaved}
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
  onPhotoSaved: (photoId: string) => void;
}

function Interaction({ station, answer, onAnswerChange, onPrimaryAction, onPhotoSaved }: InteractionProps) {
  if (station.type === "qr") {
    return (
      <div className="interaction-block">
        <QrScanner
          onDetected={(value) => {
            onAnswerChange(value);
            onPrimaryAction(value);
          }}
        />
        <label className="field">
          QR-Token oder Ersatzcode
          <input value={answer} onChange={(event) => onAnswerChange(event.target.value)} autoComplete="off" />
        </label>
        <button className="primary-button" type="button" onClick={() => onPrimaryAction()}>
          Manuell prüfen
        </button>
      </div>
    );
  }

  if (station.type === "text") {
    return (
      <div className="interaction-block">
        <label className="field">
          Antwort oder Fallback-Code
          <input value={answer} onChange={(event) => onAnswerChange(event.target.value)} autoComplete="off" />
        </label>
        <button className="primary-button" type="button" onClick={() => onPrimaryAction()}>
          Prüfen
        </button>
      </div>
    );
  }

  if (station.type === "gps") {
    return (
      <div className="interaction-block">
        <GpsCheck station={station} onArrived={() => onPrimaryAction("__gps_arrived__")} />
        <label className="field">
          Fallback-Code
          <input value={answer} onChange={(event) => onAnswerChange(event.target.value)} autoComplete="off" />
        </label>
        <button className="primary-button" type="button" onClick={() => onPrimaryAction()}>
          Fallback prüfen
        </button>
      </div>
    );
  }

  if (station.type === "camera") {
    return (
      <CameraCapture
        station={station}
        onCaptured={(photoId) => {
          onPhotoSaved(photoId);
          onPrimaryAction("__photo__");
        }}
        onSkip={() => onPrimaryAction()}
      />
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

function QrScanner({ onDetected }: { onDetected: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const [status, setStatus] = useState<string>("Bereit für Kamera-Scan.");
  const [active, setActive] = useState(false);

  const scannerSupported = Boolean(window.BarcodeDetector && navigator.mediaDevices?.getUserMedia);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  async function startScanner() {
    if (!scannerSupported || !window.BarcodeDetector) {
      setStatus("QR-Scanner wird auf diesem Gerät nicht unterstützt. Ersatzcode verwenden.");
      return;
    }

    try {
      setStatus("Kamera wird gestartet…");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      streamRef.current = stream;
      setActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      setStatus("QR-Code vor die Kamera halten.");
      scheduleScan(detector);
    } catch {
      stopScanner();
      setStatus("Kamera nicht verfügbar oder verweigert. Ersatzcode verwenden.");
    }
  }

  function scheduleScan(detector: BarcodeDetector) {
    scanTimerRef.current = window.setTimeout(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        scheduleScan(detector);
        return;
      }

      try {
        const codes = await detector.detect(video);
        const value = codes[0]?.rawValue?.trim();
        if (value) {
          setStatus(`QR erkannt: ${value}`);
          stopScanner();
          onDetected(value);
          return;
        }
      } catch {
        setStatus("QR konnte nicht gelesen werden. Ersatzcode bleibt möglich.");
      }

      scheduleScan(detector);
    }, 350);
  }

  function stopScanner() {
    if (scanTimerRef.current) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActive(false);
  }

  if (!scannerSupported) {
    return <p className="muted">QR-Scanner nicht verfügbar. Der Ersatzcode funktioniert weiterhin.</p>;
  }

  return (
    <div className="scanner-box">
      <video ref={videoRef} className="scanner-video" muted playsInline aria-label="QR-Kamera-Vorschau" />
      <p className="muted">{status}</p>
      <div className="button-row">
        <button className="ghost-button" type="button" onClick={active ? stopScanner : startScanner}>
          {active ? "Kamera stoppen" : "QR scannen"}
        </button>
      </div>
    </div>
  );
}

function GpsCheck({ station, onArrived }: { station: Station; onArrived: () => void }) {
  const [status, setStatus] = useState("Standort noch nicht geprüft.");
  const [checking, setChecking] = useState(false);

  async function checkLocation() {
    if (!station.geo) {
      setStatus("Für diese Station sind keine GPS-Daten hinterlegt. Fallback-Code verwenden.");
      return;
    }

    if (!("geolocation" in navigator)) {
      setStatus("Standort ist auf diesem Gerät nicht verfügbar. Fallback-Code verwenden.");
      return;
    }

    setChecking(true);
    setStatus("Standort wird geprüft…");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setChecking(false);
        if (!station.geo) return;

        const distanceMeters = distanceBetweenMeters(
          position.coords.latitude,
          position.coords.longitude,
          station.geo.latitude,
          station.geo.longitude
        );

        if (distanceMeters <= station.geo.radiusMeters) {
          setStatus(`Ankunft bei ${station.geo.label} bestätigt.`);
          onArrived();
          return;
        }

        setStatus(
          `Noch etwa ${formatDistance(distanceMeters)} von ${station.geo.label} entfernt. ` +
            "Wenn GPS ungenau ist, Fallback-Code verwenden."
        );
      },
      () => {
        setChecking(false);
        setStatus("Standort verweigert oder nicht genau genug. Fallback-Code verwenden.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }

  return (
    <div className="gps-box">
      <p className="muted">{status}</p>
      <button className="ghost-button" type="button" onClick={checkLocation} disabled={checking}>
        {checking ? "Standort wird geprüft…" : "Ankunft per GPS prüfen"}
      </button>
    </div>
  );
}

function distanceBetweenMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
): number {
  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(latitudeB - latitudeA);
  const deltaLon = toRadians(longitudeB - longitudeA);
  const latA = toRadians(latitudeA);
  const latB = toRadians(latitudeB);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusMeters * c);
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function CameraCapture({
  station,
  onCaptured,
  onSkip
}: {
  station: Station;
  onCaptured: (photoId: string) => void;
  onSkip: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState("Kamera noch nicht gestartet.");
  const [active, setActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const cameraSupported = Boolean(navigator.mediaDevices?.getUserMedia);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  async function startCamera() {
    if (!cameraSupported) {
      setStatus("Kamera auf diesem Gerät nicht verfügbar. Ohne Foto fortfahren.");
      return;
    }

    try {
      setStatus("Kamera wird gestartet…");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      streamRef.current = stream;
      setActive(true);
      setPreview(null);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("Foto aufnehmen, wenn der Moment passt.");
    } catch {
      stopCamera();
      setStatus("Kamera verweigert oder nicht verfügbar. Ohne Foto fortfahren.");
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      setStatus("Noch kein Kamerabild bereit. Kurz warten oder ohne Foto fortfahren.");
      return;
    }

    const maxWidth = 1280;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const context = canvas.getContext("2d");
    if (!context) {
      setStatus("Foto konnte nicht verarbeitet werden. Ohne Foto fortfahren.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
    const photoId = `${station.id}-${Date.now()}`;
    const photo: LocalPhoto = {
      id: photoId,
      stationId: station.id,
      dataUrl,
      createdAtIso: new Date().toISOString()
    };

    await saveLocalPhoto(photo);
    setPreview(dataUrl);
    stopCamera();
    setStatus("Foto lokal gespeichert. Es wird nicht hochgeladen.");
    onCaptured(photoId);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActive(false);
  }

  return (
    <div className="camera-box">
      {preview ? <img className="photo-preview" src={preview} alt="Lokal gespeicherter Tagesmoment" /> : null}
      <video ref={videoRef} className="scanner-video" muted playsInline aria-label="Kamera-Vorschau" />
      <canvas ref={canvasRef} hidden />
      <p className="muted">{cameraSupported ? status : "Kamera nicht verfügbar. Ohne Foto fortfahren."}</p>
      <div className="button-row">
        {active ? (
          <>
            <button className="primary-button" type="button" onClick={capturePhoto}>
              Foto aufnehmen
            </button>
            <button className="ghost-button" type="button" onClick={stopCamera}>
              Kamera stoppen
            </button>
          </>
        ) : (
          <button className="ghost-button" type="button" onClick={startCamera}>
            Kamera starten
          </button>
        )}
        <button className="text-button" type="button" onClick={onSkip}>
          Ohne Foto fortfahren
        </button>
      </div>
    </div>
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
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);

  useEffect(() => {
    readLocalPhotos(progress.localPhotoIds).then(setPhotos).catch(() => setPhotos([]));
  }, [progress.localPhotoIds]);

  return (
    <section className="panel finale-panel">
      <p className="eyebrow">Mission abgeschlossen</p>
      <h2>Oben angekommen.</h2>
      <p>
        Alle Kapitel der Route {progress.routeId} sind abgeschlossen.{" "}
        {photos.length > 0
          ? `${photos.length} Tagesmoment${photos.length === 1 ? "" : "e"} lokal gespeichert.`
          : "Keine lokalen Fotos gespeichert."}
      </p>
      {photos.length > 0 ? (
        <div className="photo-grid">
          {photos.map((photo) => (
            <img key={photo.id} src={photo.dataUrl} alt="Lokal gespeicherter Tagesmoment" />
          ))}
        </div>
      ) : null}
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
