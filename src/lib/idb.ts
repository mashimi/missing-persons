// src/lib/idb.ts
// IndexedDB offline cache — lets the PWA show cases even when both the API
// and the network snapshot are unreachable.
import type { Person } from "./types";

const DB_NAME = "missing-registry";
const DB_VERSION = 1;
const STORE = "persons";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cachePersons(persons: Person[]): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const person of persons) store.put(person);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getCachedPersons(): Promise<Person[]> {
  const db = await openDb();
  const persons = await new Promise<Person[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as Person[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return persons;
}

export async function cachePerson(person: Person): Promise<void> {
  return cachePersons([person]);
}

export async function getCachedPerson(id: string): Promise<Person | null> {
  const db = await openDb();
  const person = await new Promise<Person | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as Person) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return person;
}
