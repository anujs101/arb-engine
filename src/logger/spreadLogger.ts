import fs from "fs";
import path from "path";

export interface SpreadRecord {
  timestamp: number;
  poolA: string;
  poolB: string;
  spotA: number;
  spotB: number;
  spreadBps: number;
}

const LOG_DIR = path.resolve(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "spreads.json");

// Ensure logs directory exists
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

export function logSpread(record: SpreadRecord) {
  ensureLogDir();

  const line = JSON.stringify(record) + "\n";

  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) {
      console.error("Spread log write error:", err);
    }
  });
}