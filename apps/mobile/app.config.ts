import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Haru Study",
  slug: "haru-study",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  platforms: ["android", "web"],
  scheme: "harustudy",
  android: { package: "com.kits.harustudy", adaptiveIcon: { backgroundColor: "#F5F4EE" } },
  plugins: [
    "expo-secure-store",
    "@react-native-google-signin/google-signin",
    ["expo-build-properties", { android: { usesCleartextTraffic: true } }],
  ],
};
export default config;
