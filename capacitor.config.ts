import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.healthdrift.ai",
  appName: "Health Drift AI",
  webDir: "dist/client",
  server: {
    cleartext: true,
    androidScheme: "http",
    allowNavigation: [
      "192.168.1.4",
      "192.168.1.*",
      "192.168.*.*",
      "10.0.2.2",
      "localhost",
      "*.run.app",
    ],
  },
};

export default config;
