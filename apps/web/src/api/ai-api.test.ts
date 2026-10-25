import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiApi } from "./ai-api";

beforeEach(() => vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ id: 7, accessToken: "signed-session" }) }));
afterEach(() => vi.unstubAllGlobals());

describe("AI Gateway client", () => {
  it("sends the signed-in bearer token and Gateway path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "conversation-1",
          user_id: "7",
          title: "HARU HARU",
          created_at: "2026-08-24T00:00:00Z",
          updated_at: "2026-08-24T00:00:00Z",
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await aiApi.createConversation(7);

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/v1/ai/conversations");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer signed-session");
    expect(new Headers(init.headers).has("x-user-id")).toBe(false);
    expect(init.body).toBe(JSON.stringify({ title: "Cuộc hội thoại mới" }));
  });

  it("sends custom conversation title if provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "conversation-1",
          user_id: "7",
          title: "Học ngữ pháp -아서/어서",
          created_at: "2026-08-24T00:00:00Z",
          updated_at: "2026-08-24T00:00:00Z",
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await aiApi.createConversation(7, "Học ngữ pháp -아서/어서");

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/v1/ai/conversations");
    expect(init.body).toBe(JSON.stringify({ title: "Học ngữ pháp -아서/어서" }));
  });

  it("fetches conversations with the signed-in token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: "conversation-1",
            user_id: "7",
            title: "Hội thoại tiếng Hàn",
            created_at: "2026-08-24T00:00:00Z",
            updated_at: "2026-08-24T00:00:00Z",
          },
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const conversations = await aiApi.listConversations(7);
    expect(conversations).toHaveLength(1);
    expect(conversations[0].title).toBe("Hội thoại tiếng Hàn");

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/v1/ai/conversations");
    expect(init.method).toBe("GET");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer signed-session");
    expect(new Headers(init.headers).has("x-user-id")).toBe(false);
  });

  it("surfaces FastAPI detail errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Conversation not found" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(aiApi.getConversation(7, "missing")).rejects.toMatchObject({
      message: "Conversation not found",
      status: 404,
    });
  });
});
