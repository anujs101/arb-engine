import fs from "fs";
import path from "path";

const CACHE_PATH = path.resolve(__dirname, "../../data/raydium_v4_pools.json");

export function loadPoolCache(): any[] | null {
  if (!fs.existsSync(CACHE_PATH)) return null;

  const raw = fs.readFileSync(CACHE_PATH, "utf-8");
  return JSON.parse(raw);
}

export function savePoolCache(pools: any[]) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(pools, null, 2));
}