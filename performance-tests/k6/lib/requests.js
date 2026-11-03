import http from "k6/http";
import { check, group, sleep } from "k6";
import { settings } from "./config.js";

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
  },
});

export function createTestContext() {
  if (__ENV.TEST_AUTH_TOKEN) {
    return { accessToken: __ENV.TEST_AUTH_TOKEN };
  }
  if (!__ENV.TEST_USERNAME || !__ENV.TEST_PASSWORD) {
    throw new Error(
      "Set TEST_AUTH_TOKEN or both TEST_USERNAME and TEST_PASSWORD in performance-tests/k6/.env.",
    );
  }

  const response = http.post(
    `${settings.baseUrl}/api/v1/auth/login`,
    JSON.stringify({
      username: __ENV.TEST_USERNAME,
      password: __ENV.TEST_PASSWORD,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "X-Client-Platform": "android",
      },
      tags: { name: "POST /api/v1/auth/login" },
    },
  );
  const body = json(response);
  const valid = check(response, {
    "login returns 200": (result) => result.status === 200,
    "login returns an access token": () =>
      typeof body?.accessToken === "string" && body.accessToken.length > 0,
    "login returns a user id": () => Number.isFinite(Number(body?.user?.id)),
  });

  if (!valid || !body?.accessToken) {
    throw new Error(`Test login failed with HTTP ${response.status}.`);
  }
  return { accessToken: body.accessToken };
}

export function executeReads(context) {
  const authenticated = authHeaders(context.accessToken);

  group("Gateway availability", () => {
    const response = http.get(`${settings.baseUrl}/health`, {
      tags: { name: "GET /health" },
    });
    const body = json(response);
    check(response, {
      "gateway health returns 200": (result) => result.status === 200,
      "gateway health reports ok": () => body?.status === "ok",
    });
  });

  group("Account", () => {
    const response = http.get(
      `${settings.baseUrl}/api/v1/users/me`,
      {
        ...authenticated,
        tags: { name: "GET /api/v1/users/me" },
      },
    );
    const body = json(response);
    check(response, {
      "profile returns 200": (result) => result.status === 200,
      "profile has user id": () => Number.isFinite(Number(body?.id)),
    });
  });

  group("Browse flashcard decks", () => {
    const listResponse = http.get(
      `${settings.baseUrl}/api/v1/content/flashcards`,
      {
        ...authenticated,
        tags: { name: "GET /api/v1/content/flashcards" },
      },
    );
    const listBody = json(listResponse);
    check(listResponse, {
      "flashcard list returns 200": (result) => result.status === 200,
      "flashcard list has an array": () => Array.isArray(listBody?.flashcards),
      "flashcard list has a count": () => Number.isFinite(Number(listBody?.count)),
    });

    const firstDeckId = listBody?.flashcards?.[0]?.id;
    if (firstDeckId !== undefined && firstDeckId !== null) {
      const detailResponse = http.get(
        `${settings.baseUrl}/api/v1/content/flashcards/${encodeURIComponent(firstDeckId)}`,
        {
          ...authenticated,
          tags: { name: "GET /api/v1/content/flashcards/:id" },
        },
      );
      const detailBody = json(detailResponse);
      check(detailResponse, {
        "flashcard detail returns 200": (result) => result.status === 200,
        "flashcard detail has matching id": () =>
          String(detailBody?.flashcard?.id) === String(firstDeckId),
      });
    }
  });

  group("Review dashboard", () => {
    const dashboardResponse = http.get(
      `${settings.baseUrl}/api/v1/analytics/dashboard`,
      {
        ...authenticated,
        tags: { name: "GET /api/v1/analytics/dashboard" },
      },
    );
    const dashboardBody = json(dashboardResponse);
    check(dashboardResponse, {
      "analytics dashboard returns 200": (result) => result.status === 200,
      "analytics dashboard has totals": () =>
        Number.isFinite(Number(dashboardBody?.totalWords)) &&
        Number.isFinite(Number(dashboardBody?.dueNow)),
    });

    const dueResponse = http.get(
      `${settings.baseUrl}/api/v1/analytics/reviews/due?limit=20&scope=due`,
      {
        ...authenticated,
        tags: { name: "GET /api/v1/analytics/reviews/due" },
      },
    );
    const dueBody = json(dueResponse);
    check(dueResponse, {
      "due reviews return 200": (result) => result.status === 200,
      "due reviews have an array": () => Array.isArray(dueBody?.reviews),
      "due reviews have a count": () => Number.isFinite(Number(dueBody?.count)),
    });
  });

}

export default function runReadOnlyJourney(context) {
  executeReads(context);
  sleep(settings.thinkTimeSeconds);
}
