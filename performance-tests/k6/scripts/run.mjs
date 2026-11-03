import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateReport } from "./generate-report.mjs";
import { startResourceSampler } from "./resources.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const resultsDirectory = path.join(rootDirectory, "results");
const allowedScenarios = new Set([
  "smoke",
  "load",
  "stress",
  "spike",
  "soak",
  "capacity",
  "chat",
]);
const highLoadScenarios = new Set(["stress", "spike", "soak", "capacity"]);

function parseEnv(contents) {
  const result = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

async function loadEnvironment() {
  let fileEnvironment = {};
  try {
    fileEnvironment = parseEnv(await readFile(path.join(rootDirectory, ".env"), "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return { ...fileEnvironment, ...process.env };
}

function timestamp() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ];
  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ];
  return `${parts.join("-")}_${time.join("-")}`;
}

async function createResultDirectory(scenario) {
  await mkdir(resultsDirectory, { recursive: true });
  const label = (process.env.RUN_LABEL || scenario).replace(/[^\w.-]+/g, "-");
  const baseName = `${timestamp()}_${label}`;
  let candidate = path.join(resultsDirectory, baseName);
  let suffix = 1;
  while (existsSync(candidate)) {
    candidate = path.join(resultsDirectory, `${baseName}_${suffix++}`);
  }
  await mkdir(candidate);
  return candidate;
}

function sanitizedUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "INVALID_URL";
  }
}

function validate(environment, scenario) {
  if (!environment.BASE_URL) {
    throw new Error("BASE_URL is required. Copy .env.example to .env and set the API Gateway URL.");
  }
  let target;
  try {
    target = new URL(environment.BASE_URL);
  } catch {
    throw new Error("BASE_URL must be a valid http:// or https:// URL.");
  }
  if (!["http:", "https:"].includes(target.protocol)) {
    throw new Error("BASE_URL must use http:// or https://.");
  }
  if (target.username || target.password || target.search) {
    throw new Error("BASE_URL must not contain credentials or query parameters.");
  }

  const targetEnvironment = (environment.TARGET_ENV || "local").toLowerCase();
  if (targetEnvironment === "production") {
    throw new Error("Production performance tests are disabled by this test suite.");
  }
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "10.0.2.2"]);
  if (
    !localHosts.has(target.hostname) &&
    (environment.ALLOW_NON_LOCAL_TESTS || "").toLowerCase() !== "true"
  ) {
    throw new Error("Non-local targets require ALLOW_NON_LOCAL_TESTS=true.");
  }
  if (
    highLoadScenarios.has(scenario) &&
    (environment.CONFIRM_HIGH_LOAD || "").toLowerCase() !== "true"
  ) {
    throw new Error(`${scenario} requires CONFIRM_HIGH_LOAD=true.`);
  }
  if (
    !environment.TEST_AUTH_TOKEN &&
    (!environment.TEST_USERNAME || !environment.TEST_PASSWORD)
  ) {
    throw new Error("Set TEST_AUTH_TOKEN or both TEST_USERNAME and TEST_PASSWORD.");
  }
}

function commandOutput(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDirectory,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function resolveK6() {
  const candidates = ["k6"];
  if (process.platform === "win32") {
    candidates.push(path.join(process.env.ProgramFiles || "C:\\Program Files", "k6", "k6.exe"));
  }
  return candidates.find((candidate) => commandOutput(candidate, ["version"])) || null;
}

function hasFailedThreshold(summary) {
  return Object.values(summary?.metrics || {}).some((metric) =>
    Object.values(metric.thresholds || {}).some((threshold) => threshold.ok === false),
  );
}

async function readSummary(summaryPath) {
  try {
    return JSON.parse(await readFile(summaryPath, "utf8"));
  } catch {
    return null;
  }
}

function loadDescription(environment, scenario) {
  const hold = environment.HOLD_DURATION || "3m";
  const repeat = Number.parseInt(environment.REPEAT || "1", 10);
  if (scenario === "smoke") {
    return {
      executor: "constant-vus",
      vus: Number.parseInt(environment.SMOKE_VUS || "1", 10),
      duration: environment.SMOKE_DURATION || "1m",
    };
  }
  if (scenario === "load") {
    return {
      executor: "constant-vus",
      vus: Number.parseInt(environment.VUS || "20", 10),
      duration: environment.DURATION || hold,
      repeat,
    };
  }
  if (scenario === "capacity") {
    return {
      executor: "constant-arrival-rate",
      rate: Number.parseInt(environment.RATE || "10", 10),
      time_unit: "1s",
      duration: environment.DURATION || hold,
      pre_allocated_vus: Number.parseInt(environment.PRE_ALLOCATED_VUS || "30", 10),
      max_vus: Number.parseInt(environment.MAX_VUS || "100", 10),
      think_time: "disabled",
      repeat,
    };
  }
  if (scenario === "stress") {
    return {
      executor: "ramping-vus",
      levels_vu: [30, 50, 75, 100],
      hold,
      ramp: "20s",
    };
  }
  if (scenario === "spike") {
    return {
      executor: "ramping-vus",
      pattern: "10 VU for 1m, 5s to 75 VU, hold 2m, 5s to 10 VU, hold 2m",
    };
  }
  if (scenario === "soak") {
    return {
      executor: "constant-vus",
      vus: Number.parseInt(environment.SOAK_VUS || "30", 10),
      duration: environment.SOAK_DURATION || "30m",
    };
  }
  return {
    executor: "shared-iterations",
    vus: 1,
    iterations: Number.parseInt(environment.CHAT_ITERATIONS || "3", 10),
    max_duration: environment.CHAT_MAX_DURATION || "8m",
    streaming: false,
  };
}

async function main() {
  const scenario = process.argv[2];
  if (!allowedScenarios.has(scenario)) {
    console.error(
      "Usage: node performance-tests/k6/scripts/run.mjs <smoke|load|stress|spike|soak|capacity|chat>",
    );
    process.exitCode = 2;
    return;
  }

  const resultDirectory = await createResultDirectory(scenario);
  const consolePath = path.join(resultDirectory, "console.log");
  const summaryPath = path.join(resultDirectory, "summary.json");
  const metricsPath = path.join(resultDirectory, "metrics.jsonl");
  const dashboardPath = path.join(resultDirectory, "dashboard.html");
  const runInfoPath = path.join(resultDirectory, "run-info.json");
  const startedAt = new Date();
  let k6Started = false;
  let sampler = null;
  let consoleContents = "";
  let consoleWrite = Promise.resolve();
  const persistConsole = () => {
    const snapshot = consoleContents;
    consoleWrite = consoleWrite.then(() => writeFile(consolePath, snapshot, "utf8"));
    return consoleWrite;
  };
  const log = async (message) => {
    const text = String(message);
    consoleContents += text.endsWith("\n") ? text : `${text}\n`;
    process.stdout.write(text.endsWith("\n") ? text : `${text}\n`);
    await persistConsole();
  };

  const environment = await loadEnvironment();
  const runInfo = {
    run_id: path.basename(resultDirectory),
    scenario,
    started_at: startedAt.toISOString(),
    finished_at: null,
    duration_seconds: null,
    target_env: environment.TARGET_ENV || "local",
    base_url: environment.BASE_URL ? sanitizedUrl(environment.BASE_URL) : "NOT_SET",
    k6_version: "NOT_AVAILABLE",
    git_commit: commandOutput("git", ["rev-parse", "HEAD"]) || "NOT_AVAILABLE",
    load: loadDescription(environment, scenario),
    thresholds: {
      p95_ms: Number.parseInt(environment.P95_LIMIT_MS || "500", 10),
      p99_ms: Number.parseInt(environment.P99_LIMIT_MS || "1000", 10),
      error_rate: Number.parseFloat(environment.ERROR_RATE_LIMIT || "0.01"),
      checks_rate: 0.99,
    },
    status: "NOT_RUN",
    exit_code: null,
    error: null,
  };

  const finish = async () => {
    const finishedAt = new Date();
    runInfo.finished_at = finishedAt.toISOString();
    runInfo.duration_seconds = (finishedAt.getTime() - startedAt.getTime()) / 1000;
    await writeFile(runInfoPath, JSON.stringify(runInfo, null, 2), "utf8");
    try {
      await generateReport(resultDirectory);
    } catch (error) {
      await writeFile(
        path.join(resultDirectory, "report.md"),
        `# Báo cáo hiệu năng k6\n\n**INCOMPLETE**\n\nKhông thể tạo báo cáo: ${error.message}\n`,
        "utf8",
      );
      await log(`Report generation failed: ${error.stack || error.message}`);
    }
  };

  await writeFile(runInfoPath, JSON.stringify(runInfo, null, 2), "utf8");
  await writeFile(consolePath, "", "utf8");

  try {
    validate(environment, scenario);
    const k6Command = resolveK6();
    const version = k6Command ? commandOutput(k6Command, ["version"]) : null;
    if (!version) {
      throw new Error("k6 is not available in PATH. Install it and verify with: k6 version");
    }
    runInfo.k6_version = version.split(/\r?\n/)[0];
    await log(`Starting ${scenario} against ${runInfo.base_url}`);
    await log(`Results: ${resultDirectory}`);

    const childEnvironment = {
      ...environment,
      K6_WEB_DASHBOARD: "true",
      K6_WEB_DASHBOARD_EXPORT: dashboardPath,
      K6_WEB_DASHBOARD_PORT: "-1",
      K6_WEB_DASHBOARD_PERIOD: "1s",
    };
    const safeK6Env = [
      ["BASE_URL", environment.BASE_URL],
      ["TARGET_ENV", environment.TARGET_ENV || "local"],
      ["SUMMARY_PATH", summaryPath],
      ["MAX_VUS", environment.MAX_VUS || "100"],
      ["P95_LIMIT_MS", environment.P95_LIMIT_MS || "500"],
      ["P99_LIMIT_MS", environment.P99_LIMIT_MS || "1000"],
      ["ERROR_RATE_LIMIT", environment.ERROR_RATE_LIMIT || "0.01"],
      ["THINK_TIME_SECONDS", environment.THINK_TIME_SECONDS || "1"],
      ["ALLOW_NON_LOCAL_TESTS", environment.ALLOW_NON_LOCAL_TESTS || "false"],
      ["CONFIRM_HIGH_LOAD", environment.CONFIRM_HIGH_LOAD || "false"],
      ["SMOKE_VUS", environment.SMOKE_VUS || "1"],
      ["SMOKE_DURATION", environment.SMOKE_DURATION || "1m"],
      ["HOLD_DURATION", environment.HOLD_DURATION || "3m"],
      ["DURATION", environment.DURATION || environment.HOLD_DURATION || "3m"],
      ["VUS", environment.VUS || "20"],
      ["RATE", environment.RATE || "10"],
      ["PRE_ALLOCATED_VUS", environment.PRE_ALLOCATED_VUS || "30"],
      ["SOAK_VUS", environment.SOAK_VUS || "30"],
      ["SOAK_DURATION", environment.SOAK_DURATION || "30m"],
      ["CHAT_ITERATIONS", environment.CHAT_ITERATIONS || "3"],
      ["CHAT_MAX_DURATION", environment.CHAT_MAX_DURATION || "8m"],
    ].flatMap(([key, value]) => ["-e", `${key}=${value}`]);
    const args = [
      "run",
      "--out",
      `json=${metricsPath}`,
      ...safeK6Env,
      path.join(rootDirectory, "scenarios", `${scenario}.js`),
    ];

    k6Started = true;
    let stopReason = null;
    let k6Child = null;
    sampler = startResourceSampler({
      jsonlPath: path.join(resultDirectory, "resources.jsonl"),
      summaryPath: path.join(resultDirectory, "resources-summary.json"),
      baseUrl: runInfo.base_url,
      onDistress: (reason) => {
        if (stopReason) return;
        stopReason = reason;
        void log(`Stopping k6: ${reason}`);
        k6Child?.kill();
      },
    });
    const exitCode = await new Promise((resolve, reject) => {
      const child = spawn(k6Command, args, {
        cwd: rootDirectory,
        env: childEnvironment,
        shell: false,
        windowsHide: true,
      });
      k6Child = child;
      child.stdout.on("data", (chunk) => {
        consoleContents += chunk;
        process.stdout.write(chunk);
        void persistConsole();
      });
      child.stderr.on("data", (chunk) => {
        consoleContents += chunk;
        process.stderr.write(chunk);
        void persistConsole();
      });
      child.on("error", reject);
      child.on("close", (code) => resolve(code ?? 1));
    });
    await sampler.stop();

    await persistConsole();
    const summary = await readSummary(summaryPath);
    runInfo.exit_code = exitCode;
    runInfo.stopped_reason = stopReason;
    if (stopReason) {
      runInfo.status = "STOPPED";
      runInfo.error = stopReason;
    } else if (hasFailedThreshold(summary)) {
      runInfo.status = "FAIL";
      runInfo.error = "One or more k6 thresholds failed.";
    } else if (exitCode === 0 && summary) {
      runInfo.status = "PASS";
    } else {
      runInfo.status = "ERROR";
      runInfo.error = summary
        ? `k6 exited with code ${exitCode}.`
        : `k6 exited with code ${exitCode} without a valid summary.json.`;
    }
    if (!existsSync(dashboardPath)) {
      await log("Warning: dashboard.html was not exported by the installed k6 version.");
    }
    await finish();
    process.exitCode = exitCode;
  } catch (error) {
    if (sampler) await sampler.stop();
    runInfo.status = k6Started ? "ERROR" : "NOT_RUN";
    runInfo.exit_code = 1;
    runInfo.error = error.message;
    await log(error.stack || error.message);
    await finish();
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
