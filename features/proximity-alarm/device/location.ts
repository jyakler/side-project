import { Capacitor, registerPlugin } from "@capacitor/core";
import type { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";

import type { LatLng } from "../model/destination";

export type LocationError = "permission-denied" | "unavailable";

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");

/** Reads the device position once, at the highest accuracy it offers. */
export function getCurrentLocation(): Promise<LatLng> {
  if (Capacitor.isNativePlatform()) return getNativeLocationOnce();
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject("unavailable" satisfies LocationError);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) =>
        reject((error.code === error.PERMISSION_DENIED ? "permission-denied" : "unavailable") satisfies LocationError),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 }
    );
  });
}

/**
 * Watches the device position at the highest accuracy it offers.
 * In the native app the watch keeps running in the background (foreground service).
 * Returns a function that stops watching.
 */
export function watchLocation(
  onPosition: (position: LatLng) => void,
  onError: (error: LocationError) => void
): () => void {
  if (Capacitor.isNativePlatform()) return watchNativeLocation(onPosition, onError);

  if (!("geolocation" in navigator)) {
    onError("unavailable");
    return () => {};
  }
  const geolocation = navigator.geolocation;
  const id = geolocation.watchPosition(
    (position) => onPosition({ lat: position.coords.latitude, lng: position.coords.longitude }),
    (error) => onError(error.code === error.PERMISSION_DENIED ? "permission-denied" : "unavailable"),
    { enableHighAccuracy: true, maximumAge: 0 }
  );
  return () => geolocation.clearWatch(id);
}

function getNativeLocationOnce(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let watcherId: string | null = null;
    const finish = () => {
      settled = true;
      if (watcherId) void BackgroundGeolocation.removeWatcher({ id: watcherId });
    };
    BackgroundGeolocation.addWatcher({ requestPermissions: false, stale: false }, (location, error) => {
      if (settled) return;
      if (error) {
        finish();
        reject((error.code === "NOT_AUTHORIZED" ? "permission-denied" : "unavailable") satisfies LocationError);
      } else if (location) {
        finish();
        resolve({ lat: location.latitude, lng: location.longitude });
      }
    }).then((id) => {
      if (settled) void BackgroundGeolocation.removeWatcher({ id });
      else watcherId = id;
    });
  });
}

function watchNativeLocation(
  onPosition: (position: LatLng) => void,
  onError: (error: LocationError) => void
): () => void {
  let stopped = false;
  let watcherId: string | null = null;

  BackgroundGeolocation.addWatcher(
    {
      backgroundTitle: "도착 알림 가동 중",
      backgroundMessage: "목적지 반경에 들어오면 알려 드립니다.",
      // Permission is granted up front by PermissionGate; asking here would race the
      // plugin's foreground-service start (Android 14+ needs the permission first).
      requestPermissions: false,
      stale: false,
      distanceFilter: 0,
    },
    (location, error) => {
      if (stopped) return;
      if (error) {
        onError(error.code === "NOT_AUTHORIZED" ? "permission-denied" : "unavailable");
        return;
      }
      if (location) onPosition({ lat: location.latitude, lng: location.longitude });
    }
  ).then((id) => {
    if (stopped) void BackgroundGeolocation.removeWatcher({ id });
    else watcherId = id;
  });

  return () => {
    stopped = true;
    if (watcherId) void BackgroundGeolocation.removeWatcher({ id: watcherId });
  };
}
