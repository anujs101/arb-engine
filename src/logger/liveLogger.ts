import fs from "fs";
import path from "path";

const LOG_PATH = path.resolve(__dirname, "../../logs/live_feed.json");

export function logLive(data: any) {
  fs.appendFileSync(LOG_PATH, JSON.stringify(data) + "\n");
}