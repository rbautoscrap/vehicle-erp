const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const LOCK_PATH = path.join(ROOT, ".server.lock");

function readLock() {
  try {
    if (!fs.existsSync(LOCK_PATH)) return null;
    return JSON.parse(fs.readFileSync(LOCK_PATH, "utf8"));
  } catch {
    return null;
  }
}

function isPidAlive(pid) {
  if (!pid || !Number.isFinite(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireLock(owner) {
  const existing = readLock();
  if (existing && isPidAlive(existing.pid) && existing.owner !== owner) {
    return {
      ok: false,
      message: `Another process is running (${existing.owner}, pid ${existing.pid}). Stop it first.`,
    };
  }
  const payload = {
    pid: process.pid,
    owner,
    startedAt: new Date().toISOString(),
  };
  fs.writeFileSync(LOCK_PATH, JSON.stringify(payload, null, 2), "utf8");
  return { ok: true };
}

function releaseLock() {
  try {
    const existing = readLock();
    if (existing && existing.pid === process.pid) {
      fs.unlinkSync(LOCK_PATH);
    }
  } catch {
    /* ignore */
  }
}

module.exports = {
  LOCK_PATH,
  readLock,
  isPidAlive,
  acquireLock,
  releaseLock,
};
