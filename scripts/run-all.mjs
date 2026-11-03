import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const userDir = path.join(root, "apps", "user-service");
const python = [
  path.join(userDir, ".venv", "Scripts", "python.exe"),
  path.join(userDir, ".venv", "bin", "python"),
].find((candidate) => existsSync(candidate));

if (!python) {
  console.error("Không thấy apps/user-service/.venv. Tạo venv và cài requirements trước khi chạy run:all.");
  process.exit(1);
}

const nodeApps = spawn(
  "corepack",
  [
    "pnpm", "--parallel",
    "--filter", "@korean-learning/content-service",
    "--filter", "@korean-learning/analytics-service",
    "--filter", "@korean-learning/api-gateway",
    "--filter", "@korean-learning/web",
    "dev",
  ],
  { cwd: root, stdio: "inherit", shell: true },
);

const userService = spawn(
  python,
  ["-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8001"],
  { cwd: userDir, stdio: "inherit" },
);

const children = [nodeApps, userService];
let stopping = false;

function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.pid == null || child.exitCode != null) continue;
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  }
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

nodeApps.on("exit", (code) => {
  if (!stopping) {
    stop();
    process.exit(code ?? 0);
  }
});

userService.on("exit", (code) => {
  if (!stopping) {
    console.error(`User Service đã dừng (mã ${code ?? 0}).`);
    stop();
    process.exit(code ?? 1);
  }
});
