import { Capacitor } from "@capacitor/core";

export const isNativeAndroid =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");

export function resolveApiUrl(path: string): string {
  if (!path.startsWith("/api/")) return path;
  const baseUrl = configuredApiUrl || (isNativeAndroid ? "http://10.0.2.2:3000" : "");
  return `${baseUrl}${path}`;
}

export const requestCredentials: RequestCredentials = isNativeAndroid ? "omit" : "include";
