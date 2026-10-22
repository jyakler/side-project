import { Capacitor, registerPlugin, type PermissionState } from "@capacitor/core";
import type { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";
import { LocalNotifications } from "@capacitor/local-notifications";

// Capacitor's base Plugin exposes check/requestPermissions for the plugin's
// "location" alias, which covers coarse and fine location together.
type LocationPermissions = { location: PermissionState };
type BackgroundGeolocationWithPermissions = BackgroundGeolocationPlugin & {
  checkPermissions(): Promise<LocationPermissions>;
  requestPermissions(): Promise<LocationPermissions>;
};

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationWithPermissions>("BackgroundGeolocation");

export type NativePermissions = { location: boolean; notifications: boolean };

export const isNativeApp = () => Capacitor.isNativePlatform();

/**
 * Asks the OS for notification and precise location permission, one dialog at a time.
 * "location" is granted only when fine (precise) location is allowed.
 */
export async function requestNativePermissions(): Promise<NativePermissions> {
  const notifications = await LocalNotifications.requestPermissions();
  const location = await BackgroundGeolocation.requestPermissions();
  return {
    notifications: notifications.display === "granted",
    location: location.location === "granted",
  };
}

export async function checkNativePermissions(): Promise<NativePermissions> {
  const [notifications, location] = await Promise.all([
    LocalNotifications.checkPermissions(),
    BackgroundGeolocation.checkPermissions(),
  ]);
  return {
    notifications: notifications.display === "granted",
    location: location.location === "granted",
  };
}

/** Opens this app's page in the system settings. */
export function openAppSettings() {
  return BackgroundGeolocation.openSettings();
}
