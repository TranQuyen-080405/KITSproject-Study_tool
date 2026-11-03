import { spawn } from "node:child_process";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { writeAggregateReport } from "./aggregate-results.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const runScript = path.join(scriptDirectory, "run.mjs");
const repoRoot = path.resolve(scriptDirectory, "../../..");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readSummary(resultDirectory) {
  try {
    return JSON.parse(await readFile(path.join(resultDirectory, "summary.json"), "utf8"));
  } catch {
    return null;
  }
}

function overloadReason(summary, exitCode) {
  const failed = summary?.metrics?.http_req_failed?.values?.rate;
  const checks = summary?.metrics?.checks?.values?.rate;
  if (Number.isFinite(failed) && failed >= 0.05) {
    return `error rate ${(failed * 100).toFixed(2)}%`;
  }
  if (Number.isFinite(checks) && checks < 0.95) {
    return `checks ${(checks * 100).toFixed(2)}%`;
  }
  if (!summary && exitCode !== 0) return `k6 exited ${exitCode} without a summary`;
  return null;
}

function runScenario(scenario, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [runScript, scenario], {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      shell: false,
      windowsHide: true,
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
      process.stderr.write(chunk);
    });
    child.on("error", (error) => resolve({ code: 1, resultDir: null, error }));
    child.on("close", (code) => {
      const match = output.match(/Results: (.+)/);
      resolve({ code: code ?? 1, resultDir: match?.[1]?.trim() || null });
    });
  });
}

async function gatewayUp() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch("http://localhost:3000/health", { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function measuredRun(scenario, env) {
  const result = await runScenario(scenario, env);
  const summary = result.resultDir ? await readSummary(result.resultDir) : null;
  const reason = overloadReason(summary, result.code);
  console.log(
    reason
      ? `Overload at ${env.RUN_LABEL || scenario}: ${reason}`
      : `Finished ${env.RUN_LABEL || scenario} with exit ${result.code}`,
  );
  return { ...result, summary, reason };
}

async function main() {
  if (!(await gatewayUp())) {
    throw new Error("Gateway http://localhost:3000/health is not responding. Start the stack before the suite.");
  }

  const confirm = {
    CONFIRM_HIGH_LOAD: "true",
    P95_LIMIT_MS: process.env.P95_LIMIT_MS || "500",
    P99_LIMIT_MS: process.env.P99_LIMIT_MS || "1000",
    SMOKE_DURATION: "1m",
    HOLD_DURATION: "3m",
    DURATION: "3m",
  };
  let stopHigherLoad = false;
  let stopCapacity = false;
  let stopHeavy = false;

  await mkdir(path.join(scriptDirectory, "..", "results"), { recursive: true });
  await writeFile(
    path.join(scriptDirectory, "..", "results", "suite-notes.json"),
    JSON.stringify(
      {
        access_token_minutes: Number(process.env.ACCESS_TOKEN_MINUTES || 180),
        docker: false,
      },
      null,
      2,
    ),
  );
  console.log("Suite: smoke, load 5/10/20/30/50 × 3, capacity 5/10/15/20, stress, spike, soak, chat");
  const smoke = await measuredRun("smoke", { ...confirm, RUN_LABEL: "smoke" });
  if (smoke.reason || !smoke.summary) {
    throw new Error(`Smoke did not produce a usable run (${smoke.reason || "no summary"}). Higher load was not started.`);
  }
  await sleep(10000);

  for (const vus of [5, 10, 20, 30, 50]) {
    if (stopHigherLoad) {
      console.log(`Skipping load VU=${vus} after an earlier overload.`);
      continue;
    }
    for (let repeat = 1; repeat <= 3; repeat += 1) {
      if (!(await gatewayUp())) {
        stopHigherLoad = true;
        stopHeavy = true;
        console.log("Gateway health failed between runs. Stopping higher load.");
        break;
      }
      const result = await measuredRun("load", {
        ...confirm,
        VUS: String(vus),
        REPEAT: String(repeat),
        RUN_LABEL: `load-vu${vus}-r${repeat}`,
      });
      if (result.reason) {
        stopHigherLoad = true;
        stopHeavy = true;
        break;
      }
      await sleep(10000);
    }
  }

  for (const rate of [5, 10, 15, 20]) {
    if (stopCapacity) {
      console.log(`Skipping capacity RATE=${rate} after an earlier overload.`);
      continue;
    }
    if (!(await gatewayUp())) {
      stopCapacity = true;
      stopHeavy = true;
      break;
    }
    const result = await measuredRun("capacity", {
      ...confirm,
      RATE: String(rate),
      RUN_LABEL: `capacity-rate${rate}`,
    });
    if (result.reason) {
      stopCapacity = true;
      stopHeavy = true;
    }
    await sleep(10000);
  }

  if (!stopHeavy && (await gatewayUp())) {
    await measuredRun("stress", { ...confirm, RUN_LABEL: "stress" });
    await sleep(15000);
    if (await gatewayUp()) {
      await measuredRun("spike", { ...confirm, RUN_LABEL: "spike" });
      await sleep(15000);
    }
    if (await gatewayUp()) {
      await measuredRun("soak", { ...confirm, RUN_LABEL: "soak" });
      await sleep(10000);
    }
  } else {
    console.log("Skipping stress, spike, and soak because an earlier level overloaded the API or the machine.");
  }

  if (await gatewayUp()) {
    await measuredRun("chat", { ...confirm, CONFIRM_HIGH_LOAD: "false", RUN_LABEL: "chat" });
  }

  const report = await writeAggregateReport();
  console.log(`Aggregate report: ${report}`);
}

main().catch(async (error) => {
  console.error(error.stack || error.message);
  try {
    const report = await writeAggregateReport();
    console.log(`Partial aggregate report: ${report}`);
  } catch (aggregateError) {
    console.error(aggregateError);
  }
  process.exitCode = 1;
});
