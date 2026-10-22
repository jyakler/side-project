import type { Destination } from "./destination";

// Destinations live only on this device.
const STORAGE_KEY = "proximity-alarm:destinations";
const EMPTY: Destination[] = [];

let cache: Destination[] | null = null;
const listeners = new Set<() => void>();

function read(): Destination[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Destination[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export const destinationStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): Destination[] {
    cache ??= read();
    return cache;
  },
  getServerSnapshot(): Destination[] {
    return EMPTY;
  },
  set(destinations: Destination[]) {
    cache = destinations;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(destinations));
    } catch {
      // Storage may be unavailable (private mode); keep the in-memory list.
    }
    listeners.forEach((listener) => listener());
  },
};
