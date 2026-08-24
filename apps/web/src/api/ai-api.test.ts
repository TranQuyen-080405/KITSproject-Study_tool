import { afterEach, describe, expect, it, vi } from "vitest";
import { aiApi } from "./ai-api";

afterEach(() => vi.unstubAllGlobals());

describe("AI Gateway client", () => {
  it("sends the logged-in user id and Gateway path", async () => {
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
    expect(new Headers(init.headers).get("x-user-id")).toBe("7");
    expect(init.body).toBe(JSON.stringify({ title: "HARU HARU" }));
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
