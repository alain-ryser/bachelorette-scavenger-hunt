import type { GamePackage, LocalPhoto, Progress } from "../domain/types";

const DB_NAME = "bachelorette-scavenger-hunt";
const DB_VERSION = 2;
const PACKAGE_KEY = "latest-package";
const PROGRESS_KEY = "progress";

type StoreName = "content" | "progress" | "photos";

interface StoredValue<T> {
  id: string;
  value: T;
}

export async function savePackage(gamePackage: GamePackage): Promise<void> {
  await writeValue("content", PACKAGE_KEY, gamePackage);
}

export async function readPackage(): Promise<GamePackage | null> {
  return readValue<GamePackage>("content", PACKAGE_KEY);
}

export async function saveProgress(progress: Progress): Promise<void> {
  await writeValue("progress", PROGRESS_KEY, progress);
}

export async function readProgress(): Promise<Progress | null> {
  return readValue<Progress>("progress", PROGRESS_KEY);
}

export async function clearProgress(): Promise<void> {
  const db = await openDatabase();
  await requestToPromise(db.transaction("progress", "readwrite").objectStore("progress").delete(PROGRESS_KEY));
  db.close();
}

export async function saveLocalPhoto(photo: LocalPhoto): Promise<void> {
  await writeValue("photos", photo.id, photo);
}

export async function readLocalPhotos(photoIds: string[]): Promise<LocalPhoto[]> {
  const photos = await Promise.all(photoIds.map((photoId) => readValue<LocalPhoto>("photos", photoId)));
  return photos.filter((photo): photo is LocalPhoto => photo !== null);
}

export async function clearLocalPhotos(): Promise<void> {
  const db = await openDatabase();
  await requestToPromise(db.transaction("photos", "readwrite").objectStore("photos").clear());
  db.close();
}

export async function verifyStorage(): Promise<boolean> {
  try {
    const db = await openDatabase();
    db.close();
    return true;
  } catch {
    return false;
  }
}

async function writeValue<T>(storeName: StoreName, id: string, value: T): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).put({ id, value } satisfies StoredValue<T>);
  await transactionToPromise(transaction);
  db.close();
}

async function readValue<T>(storeName: StoreName, id: string): Promise<T | null> {
  const db = await openDatabase();
  const result = await requestToPromise<StoredValue<T> | undefined>(
    db.transaction(storeName, "readonly").objectStore(storeName).get(id)
  );
  db.close();
  return result?.value ?? null;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("content")) {
        db.createObjectStore("content", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("progress")) {
        db.createObjectStore("progress", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("photos")) {
        db.createObjectStore("photos", { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
