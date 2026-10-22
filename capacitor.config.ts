import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "dev.sideproject.arrivalalarm",
  appName: "도착 알림",
  webDir: "out",
  server: {
    // The native app opens straight into the alarm screen, not the landing page.
    // Extensionless paths fall back to index.html, so point at the exported file.
    appStartPath: "/app.html",
  },
  android: {
    // Keeps background location updates flowing past 5 minutes
    // (see @capacitor-community/background-geolocation README).
    useLegacyBridge: true,
  },
};

export default config;
