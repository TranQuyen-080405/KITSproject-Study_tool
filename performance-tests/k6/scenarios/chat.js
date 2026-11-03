import http from "k6/http";
import { check } from "k6";
import { Trend } from "k6/metrics";
import { assertTargetSafety, scenarioOptions, settings } from "../lib/config.js";
import { createTestContext } from "../lib/requests.js";
import { buildSummary } from "../lib/summary.js";

assertTargetSafety();

const chatE2E = new Trend("chat_e2e_duration", true);

const json = (response) => {
  try {
    return response.json();
  } catch {
    return null;
  }
};

const authHeaders = (token) => ({
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  timeout: "180s",
});

export const options = scenarioOptions("chat");

export function setup() {
  const context = createTestContext();
  const response = http.post(
    `${settings.baseUrl}/api/v1/ai/conversations`,
    JSON.stringify({ title: "k6 chat probe" }),
    {
      ...authHeaders(context.accessToken),
      tags: { name: "POST /api/v1/ai/conversations" },
    },
  );
  const body = json(response);
  const valid = check(response, {
    "create conversation returns 201": (result) => result.status === 201,
    "create conversation returns an id": () => typeof body?.id === "string" && body.id.length > 0,
  });
  if (!valid || !body?.id) {
    throw new Error(`Chat setup failed with HTTP ${response.status}.`);
  }
  return { accessToken: context.accessToken, conversationId: body.id };
}

export default function sendChat(data) {
  const response = http.post(
    `${settings.baseUrl}/api/v1/ai/conversations/${encodeURIComponent(data.conversationId)}/messages`,
    JSON.stringify({ content: "Xin chào bằng tiếng Hàn là gì? Trả lời một câu ngắn." }),
    {
      ...authHeaders(data.accessToken),
      tags: { name: "POST /api/v1/ai/conversations/:id/messages" },
    },
  );
  chatE2E.add(response.timings.duration);
  const body = json(response);
  check(response, {
    "chat returns 201": (result) => result.status === 201,
    "chat returns assistant text": () =>
      typeof body?.assistant_message?.content === "string" &&
      body.assistant_message.content.length > 0,
  });
}

export function teardown(data) {
  if (!data?.conversationId) return;
  http.del(
    `${settings.baseUrl}/api/v1/ai/conversations/${encodeURIComponent(data.conversationId)}`,
    null,
    {
      ...authHeaders(data.accessToken),
      tags: { name: "DELETE /api/v1/ai/conversations/:id" },
    },
  );
}

export const handleSummary = buildSummary;
