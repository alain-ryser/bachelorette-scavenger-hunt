import type { RuntimeStatus } from "../domain/types";

export async function registerServiceWorker(
  onStatus: (status: RuntimeStatus["serviceWorker"]) => void
): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    onStatus("unsupported");
    return;
  }

  onStatus("installing");
  try {
    const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
    await navigator.serviceWorker.ready;
    if (registration.active) {
      onStatus("ready");
    }
  } catch {
    onStatus("unsupported");
  }
}
