import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import type { Account } from "../types/auth";
import { isNativeAndroid } from "./runtime";

const SESSION_KEY = "haru-account";
let cachedSession: Account | undefined;

function parseSession(value: string | null): Account | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as Partial<Account>;
    return typeof parsed.id === "number" && typeof parsed.accessToken === "string"
      ? parsed as Account
      : undefined;
  } catch {
    return undefined;
  }
}

export function sessionSnapshot(): Account | undefined {
  if (!isNativeAndroid) {
    return typeof localStorage === "undefined"
      ? undefined
      : parseSession(localStorage.getItem(SESSION_KEY));
  }
  return cachedSession;
}

export async function loadSession(): Promise<Account | undefined> {
  const value = isNativeAndroid
    ? await SecureStorage.getItem(SESSION_KEY)
    : typeof localStorage === "undefined" ? null : localStorage.getItem(SESSION_KEY);
  cachedSession = parseSession(value);
  if (!cachedSession && value && !isNativeAndroid && typeof localStorage !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
  return cachedSession;
}

export async function saveSession(account: Account): Promise<void> {
  cachedSession = account;
  const value = JSON.stringify(account);
  if (isNativeAndroid) await SecureStorage.setItem(SESSION_KEY, value);
  else if (typeof localStorage !== "undefined") localStorage.setItem(SESSION_KEY, value);
}

export async function clearSession(): Promise<void> {
  cachedSession = undefined;
  if (isNativeAndroid) await SecureStorage.removeItem(SESSION_KEY);
  else if (typeof localStorage !== "undefined") localStorage.removeItem(SESSION_KEY);
}
