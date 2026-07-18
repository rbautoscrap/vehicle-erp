/**
 * Ensure a single Next.js process owns port 3000, then start `next dev`.
 * Prevents corrupted .next caches from overlapping npm run build / multiple dev servers.
 */
const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const net = require("net");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT) || 3000;
const nextDir = path.join(ROOT, ".next");

function clearNext() {
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log("Cleared .next cache.");
  }
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
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`Stopped process ${pid} on port ${port}.`);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* nothing listening */
  }
}

async function main() {
  const free = await isPortFree(PORT);
  if (!free) {
    console.log(`Port ${PORT} is busy — stopping previous server…`);
    if (process.platform === "win32") {
      killPortWindows(PORT);
    }
    // brief wait for OS to release the port
    await new Promise((r) => setTimeout(r, 800));
  }

  const forceClean = process.argv.includes("--clean") || process.env.CLEAN_NEXT === "1";
  const manifest = path.join(nextDir, "routes-manifest.json");
  const buildId = path.join(nextDir, "BUILD_ID");
  const cacheBroken =
    fs.existsSync(nextDir) && (!fs.existsSync(manifest) || !fs.existsSync(buildId));

  if (forceClean || cacheBroken) {
    clearNext();
  }

  const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextBin, "dev", "-H", "0.0.0.0", "-p", String(PORT)], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
