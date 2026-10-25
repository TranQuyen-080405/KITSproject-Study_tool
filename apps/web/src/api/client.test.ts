import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
afterEach(() => vi.unstubAllGlobals());
describe("authenticated web API client", () => {
  it.each(["content/flashcards", "analytics/dashboard", "ai/questions/generate"])("attaches the session token to %s", async (path) => {
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ id: 7, accessToken: "session" }) });
    const fetch = vi.fn().mockResolvedValue(new Response("{}")); vi.stubGlobal("fetch", fetch);
    await apiRequest("/api/v1/" + path);
    expect(new Headers(fetch.mock.calls[0][1].headers).get("authorization")).toBe("Bearer session");
  });
  it("uses an explicit token and never attaches the stored token to external URLs or login", async () => {
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ id: 7, accessToken: "session" }) });
    const fetch = vi.fn().mockImplementation(async () => new Response("{}")); vi.stubGlobal("fetch", fetch);
    await apiRequest("/api/v1/content/flashcards", { accessToken: "explicit" });
    await apiRequest("https://example.com/api/v1/content/flashcards");
    await apiRequest("/api/v1/auth/login", { body: {} });
    expect(new Headers(fetch.mock.calls[0][1].headers).get("authorization")).toBe("Bearer explicit");
    expect(new Headers(fetch.mock.calls[1][1].headers).has("authorization")).toBe(false);
    expect(new Headers(fetch.mock.calls[2][1].headers).has("authorization")).toBe(false);
  });
});

describe("browser session refresh", () => {
  function storage() {
    let value: string | null = JSON.stringify({ id: 7, accessToken: "expired" });
    const store = { getItem: () => value, setItem: (_key: string, next: string) => { value = next; }, removeItem: () => { value = null; } };
    vi.stubGlobal("localStorage", store);
    return store;
  }
  it("refreshes once for concurrent expired requests and retries with the new token", async () => {
    const store = storage();
    const notify = vi.fn(); vi.stubGlobal("window", { dispatchEvent: notify });
    const fetch = vi.fn().mockImplementation(async (path: string, init: RequestInit) => {
      if (path === "/api/v1/auth/refresh") return new Response(JSON.stringify({ accessToken: "renewed", user: { id: 7 } }));
      return new Headers(init.headers).get("authorization") === "Bearer renewed" ? new Response("{}") : new Response("{}", { status: 401 });
    });
    vi.stubGlobal("fetch", fetch);
    await Promise.all([apiRequest("/api/v1/content/flashcards"), apiRequest("/api/v1/ai/conversations")]);
    expect(fetch.mock.calls.filter(([path]) => path === "/api/v1/auth/refresh")).toHaveLength(1);
    expect(JSON.parse(store.getItem()!).accessToken).toBe("renewed");
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].detail.accessToken).toBe("renewed");
  });
  it("clears an expired session when its refresh token is invalid", async () => {
    const store = storage();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response("{}", { status: 401 })));
    await expect(apiRequest("/api/v1/analytics/dashboard")).rejects.toMatchObject({ status: 401 });
    expect(store.getItem()).toBeNull();
  });
  it("preserves the session when refresh is unavailable and never retries recursively", async () => {
    const store = storage(); const fetch = vi.fn().mockImplementation(async (path) => new Response("{}", { status: path === "/api/v1/auth/refresh" ? 503 : 401 }));
    vi.stubGlobal("fetch", fetch);
    await expect(apiRequest("/api/v1/content/flashcards")).rejects.toMatchObject({ status: 401 });
    expect(store.getItem()).not.toBeNull(); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("does not restore an account after logout while refresh is in flight", async () => {
    const store = storage(); const fetch = vi.fn().mockImplementation(async (path) => {
      if (path === "/api/v1/auth/refresh") { store.removeItem(); return new Response(JSON.stringify({ accessToken: "renewed", user: { id: 7 } })); }
      return new Response("{}", { status: 401 });
    });
    vi.stubGlobal("fetch", fetch);
    await expect(apiRequest("/api/v1/content/flashcards")).rejects.toMatchObject({ status: 401 });
    expect(store.getItem()).toBeNull(); expect(fetch).toHaveBeenCalledTimes(2);
  });
});
