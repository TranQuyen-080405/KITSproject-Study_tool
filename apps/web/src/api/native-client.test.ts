import { beforeEach, describe, expect, it, vi } from "vitest";

let session = {
  id: 7,
  username: "learner",
  email: "learner@example.com",
  displayName: "Learner",
  emailVerified: true,
  accessToken: "expired",
  refreshToken: "refresh-old",
};

vi.mock("../lib/runtime", () => ({
  isNativeAndroid: true,
  requestCredentials: "omit",
  resolveApiUrl: (path: string) => path.startsWith("/api/") ? `http://10.0.2.2:3000${path}` : path,
}));

vi.mock("../lib/session-storage", () => ({
  sessionSnapshot: () => session,
  saveSession: async (next: typeof session) => { session = next; },
  clearSession: async () => { session = undefined as never; },
}));

import { apiRequest } from "./client";

describe("Capacitor Android API client", () => {
  beforeEach(() => {
    session = {
      id: 7,
      username: "learner",
      email: "learner@example.com",
      displayName: "Learner",
      emailVerified: true,
      accessToken: "expired",
      refreshToken: "refresh-old",
    };
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  });

  it("uses the emulator Gateway and native refresh-token contract", async () => {
    const fetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      const headers = new Headers(init.headers);
      expect(headers.get("X-Client-Platform")).toBe("android");
      expect(init.credentials).toBe("omit");
      if (url.endsWith("/auth/refresh")) {
        expect(JSON.parse(String(init.body))).toEqual({ refreshToken: "refresh-old" });
        return new Response(JSON.stringify({
          accessToken: "renewed",
          refreshToken: "refresh-new",
          user: { ...session, accessToken: undefined, refreshToken: undefined },
        }));
      }
      return headers.get("authorization") === "Bearer renewed"
        ? new Response("{}")
        : new Response("{}", { status: 401 });
    });
    vi.stubGlobal("fetch", fetch);

    await apiRequest("/api/v1/content/flashcards");

    expect(fetch.mock.calls[0][0]).toBe("http://10.0.2.2:3000/api/v1/content/flashcards");
    expect(session.accessToken).toBe("renewed");
    expect(session.refreshToken).toBe("refresh-new");
  });
});
