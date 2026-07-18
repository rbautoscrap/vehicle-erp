#!/usr/bin/env node
/** Refuse production build while the local serve lock is held. */
const { readLock, isPidAlive } = require("./lock");

const lock = readLock();
if (lock && isPidAlive(lock.pid) && lock.owner === "serve") {
  console.error(
    `[build] Local server is running (pid ${lock.pid}).\n` +
      "Stop it first, or run build in another copy of the project.\n" +
      "Building while `npm run dev` is active corrupts the .next cache on Windows."
  );
  process.exit(1);
}

const { spawnSync } = require("child_process");
const path = require("path");
const nextBin = path.join(__dirname, "..", "node_modules", "next", "dist", "bin", "next");
const result = spawnSync(process.execPath, [nextBin, "build", ...process.argv.slice(2)], {
  cwd: path.join(__dirname, ".."),
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
