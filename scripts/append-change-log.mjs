// Appends one change-log entry to docs/log.md with coderName + local timestamp.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logPath = path.join(repoRoot, "docs", "log.md");
const developerConfigPath = path.join(repoRoot, "developer.config.json");

function formatLocalTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function readCoderName() {
  if (!fs.existsSync(developerConfigPath)) {
    throw new Error("Missing developer.config.json. Set coderName before logging.");
  }

  const config = JSON.parse(fs.readFileSync(developerConfigPath, "utf8"));
  const coderName = typeof config.coderName === "string" ? config.coderName.trim() : "";

  if (!coderName) {
    throw new Error("developer.config.json has empty coderName. Set it before logging.");
  }

  return coderName;
}

/**
 * @param {string} changeDescription - mô tả phần thêm / sửa
 * @param {string} capabilityDescription - chức năng đó làm gì
 */
export function appendChangeLog(changeDescription, capabilityDescription) {
  const change = changeDescription?.trim();
  const capability = capabilityDescription?.trim();

  if (!change || !capability) {
    throw new Error("appendChangeLog(changeDescription, capabilityDescription) needs two non-empty strings.");
  }

  const coderName = readCoderName();
  const timestamp = formatLocalTimestamp();
  const entry = [
    "",
    `--- ${coderName} <${timestamp}>------`,
    `- ${change}`,
    `- ${capability}`,
    "----------------------------------------",
    "",
  ].join("\n");

  fs.appendFileSync(logPath, entry, "utf8");
  return { coderName, timestamp, logPath };
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const [changeDescription, capabilityDescription] = process.argv.slice(2);

  try {
    const result = appendChangeLog(changeDescription, capabilityDescription);
    console.log(`Logged as ${result.coderName} <${result.timestamp}> → ${result.logPath}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
