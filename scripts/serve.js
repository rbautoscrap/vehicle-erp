/**
 * Stable local server runner for Windows.
 * - Single instance (lock file)
 * - Clears broken .next cache
 * - Health-checks /login
 * - Auto-restarts on crash or repeated 500s
 */
const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");
const net = require("net");
const { acquireLock, releaseLock } = require("./lock");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT) || 3000;
const HOST = "127.0.0.1";
const nextDir = path.join(ROOT, ".next");
const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const FORCE_CLEAN = process.argv.includes("--clean") || process.env.CLEAN_NEXT === "1";

let child = null;
let shuttingDown = false;
let restartCount = 0;
let consecutiveBadHealth = 0;

function log(...args) {
  console.log("[serve]", ...args);
}

function clearNext() {
  if (!fs.existsSync(nextDir)) return;
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    log("Cleared .next cache.");
  } catch (err) {
    log("Failed to clear .next (will retry):", err.message);
    // Best-effort Windows cleanup via rimraf-like delay
    try {
      execSync(`cmd /c rmdir /s /q "${nextDir}"`, { stdio: "ignore" });
      log("Cleared .next via rmdir.");
    } catch {
      /* ignore */
    }
  }
}

function cacheLooksBroken() {
  if (!fs.existsSync(nextDir)) return false;
  const manifest = path.join(nextDir, "routes-manifest.json");
  const buildId = path.join(nextDir, "BUILD_ID");
  if (!fs.existsSync(manifest) || !fs.existsSync(buildId)) return true;
  return false;
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

function killPortWindows(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = Number(parts[parts.length - 1]);
      if (pid && pid !== process.pid) pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
        log(`Stopped pid ${pid} on port ${port}.`);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* nothing listening */
  }
}

function killChildTree() {
  if (!child || !child.pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(-child.pid, "SIGTERM");
    }
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
  child = null;
}

function healthCheck() {
  return new Promise((resolve) => {
    const req = http.get(
      { host: HOST, port: PORT, path: "/login", timeout: 4000 },
      (res) => {
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForHealthy(timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await healthCheck()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function startNext({ clean }) {
  if (clean || FORCE_CLEAN || cacheLooksBroken()) {
    clearNext();
  }

  const free = await isPortFree(PORT);
  if (!free) {
    log(`Port ${PORT} busy — freeing it…`);
    killPortWindows(PORT);
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Prefer Turbopack on Windows — fewer broken webpack chunk/manifest files in .next
  const useTurbo =
    process.env.NEXT_DISABLE_TURBOPACK !== "1" && process.platform === "win32";
  const args = ["dev", "-H", "0.0.0.0", "-p", String(PORT)];
  if (useTurbo) args.push("--turbopack");

  log(
    `Starting Next.js on http://${HOST}:${PORT}${useTurbo ? " (turbopack)" : ""} …`
  );
  child = spawn(process.execPath, [nextBin, ...args], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    child = null;
    if (shuttingDown) return;
    log(`Next.js exited (code=${code}, signal=${signal}). Restarting…`);
    // Soft restart first; clear cache only after repeated exits
    scheduleRestart({ clean: restartCount >= 1 });
  });

  const ok = await waitForHealthy(60000);
  if (!ok) {
    log("Health check failed after start — recovering…");
    killChildTree();
    scheduleRestart({ clean: true });
    return;
  }

  consecutiveBadHealth = 0;
  restartCount = 0;
  log(`Ready: http://localhost:${PORT}`);
}

let restartTimer = null;
function scheduleRestart({ clean }) {
  if (shuttingDown) return;
  if (restartTimer) return;
  restartCount += 1;
  const delay = Math.min(15000, 1500 * restartCount);
  log(`Restart #${restartCount} in ${delay}ms…`);
  restartTimer = setTimeout(async () => {
    restartTimer = null;
    try {
      await startNext({ clean: clean || restartCount > 1 });
    } catch (err) {
      log("Restart failed:", err);
      scheduleRestart({ clean: true });
    }
  }, delay);
}

async function monitor() {
  if (shuttingDown || !child || restartTimer) return;
  const ok = await healthCheck();
  if (ok) {
    consecutiveBadHealth = 0;
    return;
  }
  consecutiveBadHealth += 1;
  // Be patient: page compiles after logout/login can briefly stall /login.
  log(`Unhealthy response (${consecutiveBadHealth}/6)…`);
  if (consecutiveBadHealth >= 6) {
    const shouldClean = consecutiveBadHealth >= 6 && restartCount >= 1;
    consecutiveBadHealth = 0;
    log(
      shouldClean
        ? "Recovering (clear cache + restart)…"
        : "Recovering (soft restart, keep cache)…"
    );
    killChildTree();
    scheduleRestart({ clean: shouldClean });
  }
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  log("Shutting down…");
  if (restartTimer) clearTimeout(restartTimer);
  killChildTree();
  releaseLock();
  process.exit(0);
}

async function main() {
  if (!fs.existsSync(nextBin)) {
    console.error("Next.js is not installed. Run: npm install");
    process.exit(1);
  }

  const lock = acquireLock("serve");
  if (!lock.ok) {
    console.error(lock.message);
    process.exit(1);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("exit", releaseLock);

  await startNext({ clean: FORCE_CLEAN || cacheLooksBroken() });
  setInterval(() => {
    monitor().catch(() => {});
  }, 12000);
}

main().catch((err) => {
  console.error(err);
  releaseLock();
  process.exit(1);
});
