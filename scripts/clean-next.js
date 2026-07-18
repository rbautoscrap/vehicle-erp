const fs = require("fs");
const path = require("path");

const nextDir = path.join(__dirname, "..", ".next");

function removeDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

removeDir(nextDir);
console.log("Cleared .next cache.");
