import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export so Capacitor can bundle the UI into the native app (webDir: out).
  output: "export",
};

export default nextConfig;
