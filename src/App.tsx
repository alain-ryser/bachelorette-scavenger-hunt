import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { StartScreen } from "./components/StartScreen";
import { StationScreen } from "./components/StationScreen";
import { fetchGamePackage } from "./domain/content";
import { completeStation, createInitialProgress, recoverStation } from "./domain/gameEngine";
import type { GamePackage, Progress, RouteId, RuntimeStatus } from "./domain/types";
import { registerServiceWorker } from "./pwa/registerServiceWorker";
import { clearLocalPhotos, clearProgress, readPackage, readProgress, savePackage, saveProgress, verifyStorage } from "./storage/db";

const initialRuntimeStatus: RuntimeStatus = {
  online: navigator.onLine,
  serviceWorker: "unsupported",
  storage: "unknown",
  packageCached: false,
  camera: "unknown",
  location: "unknown",
  qrScanner: "unknown"
};

export default function App() {
  const [gamePackage, setGamePackage] = useState<GamePackage | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>(initialRuntimeStatus);
  const [gameCode, setGameCode] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState<RouteId>("A");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const setOnline = () => setRuntimeStatus((status) => ({ ...status, online: navigator.onLine }));
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOnline);
    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOnline);
    };
  }, []);

  useEffect(() => {
    registerServiceWorker((serviceWorker) => setRuntimeStatus((status) => ({ ...status, serviceWorker })));
  }, []);

  useEffect(() => {
    const cameraSupported = Boolean(navigator.mediaDevices?.getUserMedia);
    const locationSupported = "geolocation" in navigator;
    const qrSupported = "BarcodeDetector" in window;

    setRuntimeStatus((status) => ({
      ...status,
      camera: cameraSupported ? "supported" : "unsupported",
      location: locationSupported ? "supported" : "unsupported",
      qrScanner: qrSupported ? "supported" : "unsupported"
    }));
  }, []);

  useEffect(() => {
    async function boot() {
      const storageReady = await verifyStorage();
      setRuntimeStatus((status) => ({ ...status, storage: storageReady ? "ready" : "failed" }));

      const cachedPackage = storageReady ? await readPackage() : null;
      const cachedProgress = storageReady ? await readProgress() : null;

      if (cachedPackage) {
        setGamePackage(cachedPackage);
        setRuntimeStatus((status) => ({ ...status, packageCached: true }));
      }
      if (cachedProgress) {
        setProgress(cachedProgress);
        setSelectedRouteId(cachedProgress.routeId);
      }

      await refreshPackage();
    }

    boot().catch((bootError: unknown) => {
      setError(bootError instanceof Error ? bootError.message : "App konnte nicht gestartet werden.");
    });
  }, []);

  async function refreshPackage() {
    try {
      const nextPackage = await fetchGamePackage();
      setGamePackage(nextPackage);
      await savePackage(nextPackage);
      setRuntimeStatus((status) => ({ ...status, packageCached: true }));
      setError(null);
    } catch (refreshError) {
      const cachedPackage = await readPackage();
      if (cachedPackage) {
        setGamePackage(cachedPackage);
        setRuntimeStatus((status) => ({ ...status, packageCached: true }));
        setError("Live-CMS nicht erreichbar. Lokaler Snapshot wird verwendet.");
        return;
      }
      setError(refreshError instanceof Error ? refreshError.message : "Inhaltspaket fehlt.");
    }
  }

  async function startGame() {
    if (!gamePackage) return;

    if (gameCode.trim() !== gamePackage.access.gameCode) {
      setError("Spielcode stimmt nicht. Bitte prüfen statt raten.");
      return;
    }

    const nextProgress = createInitialProgress(gamePackage, selectedRouteId);
    setProgress(nextProgress);
    await saveProgress(nextProgress);
    setError(null);
  }

  async function handleComplete(stationId: string) {
    if (!gamePackage || !progress) return;
    const nextProgress = completeStation(gamePackage, progress, stationId);
    setProgress(nextProgress);
    await saveProgress(nextProgress);
  }

  async function handleRecover(stationId: string) {
    if (!gamePackage || !progress) return;
    const nextProgress = recoverStation(gamePackage, progress, stationId);
    setProgress(nextProgress);
    await saveProgress(nextProgress);
  }

  async function handlePhotoSaved(photoId: string) {
    if (!progress) return;
    if (progress.localPhotoIds.includes(photoId)) return;

    const nextProgress = {
      ...progress,
      localPhotoIds: [...progress.localPhotoIds, photoId],
      updatedAtIso: new Date().toISOString()
    };
    setProgress(nextProgress);
    await saveProgress(nextProgress);
  }

  async function resetPrototype() {
    setProgress(null);
    await clearProgress();
    await clearLocalPhotos();
  }

  if (!gamePackage) {
    return (
      <div className="loading-screen">
        <p className="eyebrow">Mission Gipfelglück</p>
        <h1>Inhaltspaket wird geladen…</h1>
        {error ? <p className="error-text">{error}</p> : null}
      </div>
    );
  }

  return (
    <AppShell gamePackage={gamePackage} progress={progress} runtimeStatus={runtimeStatus}>
      {progress ? (
        <StationScreen
          gamePackage={gamePackage}
          progress={progress}
          onComplete={handleComplete}
          onRecover={handleRecover}
          onPhotoSaved={handlePhotoSaved}
          onReset={resetPrototype}
        />
      ) : (
        <StartScreen
          gamePackage={gamePackage}
          runtimeStatus={runtimeStatus}
          gameCode={gameCode}
          selectedRouteId={selectedRouteId}
          error={error}
          onGameCodeChange={setGameCode}
          onRouteChange={setSelectedRouteId}
          onStart={startGame}
          onRefreshPackage={refreshPackage}
        />
      )}
    </AppShell>
  );
}
