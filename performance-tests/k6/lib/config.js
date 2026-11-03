const integerEnv = (name, fallback) => {
  const value = Number.parseInt(__ENV[name] || "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const numberEnv = (name, fallback) => {
  const value = Number.parseFloat(__ENV[name] || "");
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const booleanEnv = (name) => (__ENV[name] || "").toLowerCase() === "true";

const durationEnv = (name, fallback) => {
  const value = (__ENV[name] || "").trim();
  return value || fallback;
};

export const settings = {
  baseUrl: (__ENV.BASE_URL || "").replace(/\/+$/, ""),
  targetEnv: (__ENV.TARGET_ENV || "local").toLowerCase(),
  p95LimitMs: integerEnv("P95_LIMIT_MS", 500),
  p99LimitMs: integerEnv("P99_LIMIT_MS", 1000),
  errorRateLimit: numberEnv("ERROR_RATE_LIMIT", 0.01),
  thinkTimeSeconds: numberEnv("THINK_TIME_SECONDS", 1),
};

export const summaryTrendStats = ["avg", "med", "p(90)", "p(95)", "p(99)", "max"];

const readEndpoints = [
  "GET /health",
  "GET /api/v1/users/me",
  "GET /api/v1/content/flashcards",
  "GET /api/v1/analytics/dashboard",
  "GET /api/v1/analytics/reviews/due",
];

function readThresholds({ dropped = false, abortOnOverload = false } = {}) {
  const thresholds = {
    http_req_failed: [`rate<${settings.errorRateLimit}`],
    checks: ["rate>0.99"],
    http_req_duration: [
      `p(95)<${settings.p95LimitMs}`,
      `p(99)<${settings.p99LimitMs}`,
    ],
  };
  if (abortOnOverload) {
    thresholds.http_req_failed.push({
      threshold: "rate<0.05",
      abortOnFail: true,
      delayAbortEval: "30s",
    });
  }
  for (const name of readEndpoints) {
    thresholds[`http_req_duration{name:${name}}`] = [`p(95)<${settings.p95LimitMs}`];
  }
  if (dropped) thresholds.dropped_iterations = ["count==0"];
  return thresholds;
}

function withSummary(options) {
  return { summaryTrendStats, ...options };
}

// k6 does not provide the URL constructor, so this stays dependency-free.
function parseBaseUrl(value) {
  const match = /^(https?):\/\/([^/?#]+)([^?#]*)(\?[^#]*)?/.exec(value);
  if (!match) return null;

  const authority = match[2];
  const hasCredentials = authority.includes("@");
  const hostPort = hasCredentials ? authority.slice(authority.lastIndexOf("@") + 1) : authority;
  let hostname = hostPort;
  if (hostPort.startsWith("[")) {
    const end = hostPort.indexOf("]");
    hostname = end > 1 ? hostPort.slice(1, end) : "";
  } else {
    hostname = hostPort.replace(/:\d+$/, "");
  }

  return hostname
    ? {
        protocol: `${match[1]}:`,
        hostname,
        hasCredentials,
        search: match[4] || "",
      }
    : null;
}

export function assertTargetSafety({ highLoad = false } = {}) {
  if (!settings.baseUrl) {
    throw new Error("BASE_URL is required. Use the API Gateway URL, not the frontend URL.");
  }

  const target = parseBaseUrl(settings.baseUrl);
  if (!target || !["http:", "https:"].includes(target.protocol)) {
    throw new Error("BASE_URL must be a valid http:// or https:// URL.");
  }
  if (target.hasCredentials || target.search) {
    throw new Error("BASE_URL must not contain credentials or query parameters.");
  }
  if (settings.targetEnv === "production") {
    throw new Error("Production performance tests are disabled by this test suite.");
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "10.0.2.2"]);
  if (!localHosts.has(target.hostname) && !booleanEnv("ALLOW_NON_LOCAL_TESTS")) {
    throw new Error("Non-local targets require ALLOW_NON_LOCAL_TESTS=true.");
  }
  if (highLoad && !booleanEnv("CONFIRM_HIGH_LOAD")) {
    throw new Error("Stress, spike, soak, and capacity tests require CONFIRM_HIGH_LOAD=true.");
  }
}

export function scenarioOptions(scenario) {
  const hold = durationEnv("HOLD_DURATION", "3m");
  const gracefulStop = "10s";

  if (scenario === "smoke") {
    return withSummary({
      scenarios: {
        smoke: {
          executor: "constant-vus",
          vus: integerEnv("SMOKE_VUS", 1),
          duration: durationEnv("SMOKE_DURATION", "1m"),
          gracefulStop,
        },
      },
      thresholds: readThresholds(),
    });
  }

  if (scenario === "load") {
    return withSummary({
      scenarios: {
        load_test: {
          executor: "constant-vus",
          vus: integerEnv("VUS", 20),
          duration: durationEnv("DURATION", hold),
          gracefulStop,
        },
      },
      thresholds: readThresholds({ abortOnOverload: true }),
    });
  }

  if (scenario === "stress") {
    return withSummary({
      scenarios: {
        stress: {
          executor: "ramping-vus",
          startVUs: 30,
          gracefulRampDown: gracefulStop,
          stages: [
            { duration: hold, target: 30 },
            { duration: "20s", target: 50 },
            { duration: hold, target: 50 },
            { duration: "20s", target: 75 },
            { duration: hold, target: 75 },
            { duration: "20s", target: 100 },
            { duration: hold, target: 100 },
          ],
        },
      },
      thresholds: readThresholds({ abortOnOverload: true }),
    });
  }

  if (scenario === "spike") {
    return withSummary({
      scenarios: {
        spike: {
          executor: "ramping-vus",
          startVUs: 10,
          gracefulRampDown: gracefulStop,
          stages: [
            { duration: "1m", target: 10 },
            { duration: "5s", target: 75 },
            { duration: "2m", target: 75 },
            { duration: "5s", target: 10 },
            { duration: "2m", target: 10 },
          ],
        },
      },
      thresholds: readThresholds({ abortOnOverload: true }),
    });
  }

  if (scenario === "soak") {
    return withSummary({
      scenarios: {
        soak: {
          executor: "constant-vus",
          vus: integerEnv("SOAK_VUS", 30),
          duration: durationEnv("SOAK_DURATION", "30m"),
          gracefulStop,
        },
      },
      thresholds: readThresholds({ abortOnOverload: true }),
    });
  }

  if (scenario === "capacity") {
    return withSummary({
      scenarios: {
        capacity: {
          executor: "constant-arrival-rate",
          rate: integerEnv("RATE", 10),
          timeUnit: "1s",
          duration: durationEnv("DURATION", hold),
          preAllocatedVUs: integerEnv("PRE_ALLOCATED_VUS", 30),
          maxVUs: integerEnv("MAX_VUS", 100),
          gracefulStop,
        },
      },
      thresholds: readThresholds({ dropped: true, abortOnOverload: true }),
    });
  }

  return withSummary({
    scenarios: {
      chat: {
        executor: "shared-iterations",
        vus: 1,
        iterations: integerEnv("CHAT_ITERATIONS", 3),
        maxDuration: durationEnv("CHAT_MAX_DURATION", "8m"),
      },
    },
    thresholds: {
      http_req_failed: ["rate<0.01"],
      checks: ["rate>0.99"],
    },
  });
}
