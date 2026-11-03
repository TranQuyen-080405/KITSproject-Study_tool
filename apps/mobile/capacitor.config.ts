import type { CapacitorConfig } from "@capacitor/cli";

const devServerUrl = process.env.CAP_SERVER_URL?.trim();
const allowCleartext = process.env.MOBILE_ALLOW_CLEARTEXT === "true";

const config: CapacitorConfig = {
  appId: "com.kits.harustudy",
  appName: "Haru Study",
  webDir: "../web/dist",
  server: devServerUrl
    ? { url: devServerUrl, cleartext: true }
    : { androidScheme: "https" },
  android: {
    allowMixedContent: allowCleartext,
  },
};

export default config;
