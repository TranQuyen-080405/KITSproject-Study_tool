import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../../..");

function cpuTimes() {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    for (const value of Object.values(cpu.times)) total += value;
    idle += cpu.times.idle;
  }
  return { idle, total };
}

function average(values) {
  const numbers = values.filter((value) => Number.isFinite(value));
  if (numbers.length === 0) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function maximum(values) {
  const numbers = values.filter((value) => Number.isFinite(value));
  return numbers.length === 0 ? null : Math.max(...numbers);
}

export function summarizeSamples(samples) {
  const databases = new Map();
  for (const sample of samples) {
    for (const row of sample.database?.activity || []) {
      const key = row.database;
      const current = databases.get(key) || 0;
      databases.set(key, Math.max(current, Number(row.count) || 0));
    }
  }
  const processes = new Map();
  for (const sample of samples) {
    for (const row of sample.processes || []) {
      const current = processes.get(row.name) || { count: 0, working_set_mb_max: 0 };
      processes.set(row.name, {
        count: Math.max(current.count, Number(row.count) || 0),
        working_set_mb_max: Math.max(current.working_set_mb_max, Number(row.working_set_mb) || 0),
      });
    }
  }
  return {
    samples: samples.length,
    cpu_percent_avg: average(samples.map((sample) => sample.cpu_percent)),
    cpu_percent_max: maximum(samples.map((sample) => sample.cpu_percent)),
    memory_used_percent_max: maximum(samples.map((sample) => sample.memory_used_percent)),
    memory_free_mb_min: samples.length
      ? Math.min(...samples.map((sample) => sample.memory_free_mb).filter(Number.isFinite))
      : null,
    database_connections_max: Object.fromEntries(databases),
    process_memory_mb_max: Object.fromEntries(processes),
    database_error: samples.find((sample) => sample.database && sample.database.available === false)
      ?.database.reason || null,
  };
}

function runCommand(command, args, env) {
  return new Promise((resolve) => {
    let stdout = "";
    const child = spawn(command, args, { windowsHide: true, env });
    const timer = setTimeout(() => child.kill(), 8000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve("");
    });
    child.on("close", () => {
      clearTimeout(timer);
      resolve(stdout);
    });
  });
}

async function databaseUrl() {
  try {
    const contents = await readFile(path.join(repoRoot, "apps", "content-service", ".env"), "utf8");
    const line = contents.split(/\r?\n/).find((entry) => entry.startsWith("CONTENT_DATABASE_URL="));
    return line ? line.slice("CONTENT_DATABASE_URL=".length).trim() : "";
  } catch {
    return "";
  }
}

async function sampleDatabase(pythonPath) {
  const url = await databaseUrl();
  if (!url || !pythonPath) return { available: false, reason: "database sampler is not configured" };
  const stdout = await runCommand(
    pythonPath,
    [path.join(scriptDirectory, "sample-db.py")],
    { ...process.env, SAMPLE_DATABASE_URL: url },
  );
  try {
    return JSON.parse(stdout);
  } catch {
    return { available: false, reason: "database sampler returned no JSON" };
  }
}

async function sampleProcesses() {
  if (process.platform !== "win32") return null;
  const command = [
    "Get-Process node,postgres,python -ErrorAction SilentlyContinue",
    "| Group-Object ProcessName",
    "| ForEach-Object {",
    "[PSCustomObject]@{ name = $_.Name; count = $_.Count; working_set_mb = [math]::Round((($_.Group | Measure-Object WorkingSet64 -Sum).Sum / 1MB), 1) }",
    "}",
    "| ConvertTo-Json -Compress",
  ].join(" ");
  const stdout = await runCommand("powershell.exe", ["-NoProfile", "-Command", command]);
  if (!stdout.trim()) return null;
  try {
    const parsed = JSON.parse(stdout);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return null;
  }
}

async function probe(baseUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(`${baseUrl}/health`, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function startResourceSampler({ jsonlPath, summaryPath, baseUrl, onDistress }) {
  const pythonPath = path.join(repoRoot, "apps", "user-service", ".venv", "Scripts", "python.exe");
  let previous = cpuTimes();
  let stopped = false;
  let running = false;
  let healthFailures = 0;
  let lowMemoryStreak = 0;
  const samples = [];

  const tick = async () => {
    if (stopped || running) return;
    running = true;
    try {
      const now = cpuTimes();
      const idle = now.idle - previous.idle;
      const total = now.total - previous.total;
      previous = now;
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const [database, processes, healthy] = await Promise.all([
        sampleDatabase(pythonPath),
        sampleProcesses(),
        probe(baseUrl),
      ]);
      const record = {
        at: new Date().toISOString(),
        cpu_percent: Number((total > 0 ? (1 - idle / total) * 100 : 0).toFixed(1)),
        memory_used_percent: Number(((1 - freeMem / totalMem) * 100).toFixed(1)),
        memory_free_mb: Number((freeMem / 1048576).toFixed(0)),
        database,
        processes,
        gateway_health_ok: healthy,
      };
      samples.push(record);
      await writeFile(jsonlPath, `${samples.map((sample) => JSON.stringify(sample)).join("\n")}\n`);
      if (healthy) healthFailures = 0;
      else healthFailures += 1;
      if (record.memory_free_mb < 350) lowMemoryStreak += 1;
      else lowMemoryStreak = 0;
      if (healthFailures >= 3) onDistress?.("Gateway /health failed 3 times in a row.");
      else if (lowMemoryStreak >= 2) onDistress?.("Free memory stayed under 350 MB.");
    } catch {
      // A missed sample is not a test result.
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, 10000);
  timer.unref?.();

  return {
    stop: async () => {
      if (stopped) return summarizeSamples(samples);
      stopped = true;
      clearInterval(timer);
      const summary = summarizeSamples(samples);
      await writeFile(summaryPath, JSON.stringify(summary, null, 2));
      return summary;
    },
  };
}
