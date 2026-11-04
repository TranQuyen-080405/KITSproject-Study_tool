import { Capacitor } from "@capacitor/core";

export const isNativeAndroid =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
const androidApiUrl = "https://kitsproject-study-tool.onrender.com";

export function resolveApiUrl(path: string): string {
  if (!path.startsWith("/api/")) return path;
  const baseUrl = configuredApiUrl || (isNativeAndroid ? androidApiUrl : "");
  return `${baseUrl}${path}`;
}

export const requestCredentials: RequestCredentials = isNativeAndroid ? "omit" : "include";
