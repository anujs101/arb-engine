import fs from "fs";
import path from "path";
import { DetectionResult } from "../detector/spread";

const LOG_PATH = path.resolve(__dirname, "../../logs/spreads.json");

export function logDetection(
  result: DetectionResult,
  poolASlot: number,
  poolBSlot: number
) {
  const entry = {
  timestamp: result.timestamp,
  direction: result.direction,
  spreadBps: result.spreadBps.toString(),
  microInput: result.microInput.toString(),
  microProfit: result.microProfit.toString(),
  profitable: result.microProfit > 0n,
  poolASlot,
  poolBSlot,
};

  fs.appendFileSync(
    LOG_PATH,
    JSON.stringify(entry) + "\n",
    "utf-8"
  );
}