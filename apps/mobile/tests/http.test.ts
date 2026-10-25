import { describe, expect, it, vi } from "vitest";
import { ApiError, createClient } from "../src/http";
import type { Session } from "../src/types";

const user = { id: 7, username: "learner", email: "learner@example.com", displayName: "Learner", emailVerified: true };
const original: Session = { user, accessToken: "old", refreshToken: "refresh-old", expiresIn: 900 };
const renewed: Session = { ...original, accessToken: "new", refreshToken: "refresh-new" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
function setup(fetcher: typeof fetch, platform: "android" | "web" = "android") {
  let saved: Session | null = original;
  const storage = { read: async () => saved, write: async (value: Session | null) => { saved = value; } };
  return { client: createClient("http://server", storage, platform, fetcher), saved: () => saved };
}

describe("mobile sessions", () => {
  it("restores a stored account through the authenticated profile endpoint", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json(user));
    const { client } = setup(fetcher);
    await client.restore();
    expect(client.getSession()?.user.id).toBe(7);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: "omit", headers: { Authorization: "Bearer old", "X-Client-Platform": "android" } });
  });
  it("shares one refresh for concurrent expired requests and persists the rotated token", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url, options) => {
      if (String(url).endsWith("/refresh")) { await new Promise((resolve) => setTimeout(resolve, 15)); return json(renewed); }
      if (String(url).endsWith("/me")) return json(user);
      return (options?.headers as Record<string, string>).Authorization === "Bearer old" ? json({ error: "expired" }, 401) : json({ ok: true });
    });
    const { client, saved } = setup(fetcher);
    await client.restore();
    const results = await Promise.all([client.request("/one"), client.request("/two")]);
    expect(results).toEqual([{ ok: true }, { ok: true }]);
    const refreshCalls = fetcher.mock.calls.filter(([url]) => String(url).endsWith("/refresh"));
    expect(refreshCalls).toHaveLength(1);
    expect(JSON.parse(String(refreshCalls[0][1]?.body))).toEqual({ refreshToken: "refresh-old" });
    expect(saved()?.refreshToken).toBe("refresh-new");
  });
  it("removes persisted credentials when refresh is rejected", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => String(url).endsWith("/me") ? json(user) : json({ error: "invalid" }, 401));
    const { client, saved } = setup(fetcher);
    await client.restore();
    await expect(client.request("/decks")).rejects.toBeInstanceOf(ApiError);
    expect(saved()).toBeNull(); expect(client.getSession()).toBeNull();
  });
  it("retains credentials on a temporary server outage during refresh", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => String(url).endsWith("/me") ? json(user) : String(url).endsWith("/refresh") ? json({ error: "unavailable" }, 503) : json({}, 401));
    const { client, saved } = setup(fetcher);
    await client.restore();
    await expect(client.request("/decks")).rejects.toMatchObject({ status: 503 });
    expect(saved()?.refreshToken).toBe("refresh-old");
  });
  it("clears local credentials even if logout cannot reach the server", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => { if (String(url).endsWith("/me")) return json(user); throw new Error("offline"); });
    const { client, saved } = setup(fetcher); await client.restore();
    await expect(client.signOut()).rejects.toMatchObject({ status: 0 }); expect(saved()).toBeNull();
  });
  it("uses browser cookies without the Android client header in the browser preview", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json(original));
    const { client } = setup(fetcher, "web"); await client.signIn("/api/v1/auth/login", {});
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: "include", headers: { "X-Client-Platform": "web" } });
  });
  it("exposes structured backend error codes for account verification", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({ error: { code: "EMAIL_NOT_VERIFIED", message: "Verify email" } }, 403));
    const { client } = setup(fetcher);
    await expect(client.signIn("/login", {})).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED", message: "Verify email" });
  });
});
