//fetching 200 sol/usdt pools but unable to parse them correctly, i want you to fix the parsing issue 
  import fetch from "node-fetch";
import fs from "fs";
import path from "path";

export interface RaydiumApiPool {
  id: string;
  type: string;
  programId: string;
  mintA: string;
  mintB: string;
  decimalsA: number;
  decimalsB: number;
  feeRate?: number;
  tvl?: number;
}

const SOL_MINT =
  "So11111111111111111111111111111111111111112";
const USDT_MINT =
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

const POOL_LOG_PATH = path.resolve(
  __dirname,
  "../../logs/spreads.json"
);

export async function fetchSolUsdtPools(): Promise<RaydiumApiPool[]> {
  console.log("Fetching SOL/USDT pools from Raydium API...");

  const res = await fetch(
    "https://api-v3.raydium.io/pools/info/list-v2?size=200&mintA=So11111111111111111111111111111111111111112&mintB=EPjFWdd5AufqSSqeM2q1xzybapC8G4wEGGkZwyTDt1v"
  );

  if (!res.ok) {
    const body = await res.text();
    console.error("Status:", res.status);
    console.error("Body:", body);
    throw new Error("Failed to fetch Raydium pool list");
  }

  const json = (await res.json()) as any;

  if (!json?.success || !Array.isArray(json?.data?.data)) {
    console.error("Unexpected API structure:", json);
    throw new Error("Unexpected API structure");
  }

  const pools = json.data.data;

  console.log(`Fetched ${pools.length} pools from API.`);

  // Filter SOL/USDT only
  const filtered = pools.filter(
    (p: any) =>
      (p.mintA?.address === SOL_MINT &&
        p.mintB?.address === USDT_MINT) ||
      (p.mintA?.address === USDT_MINT &&
        p.mintB?.address === SOL_MINT)
  );

  console.log(`Found ${filtered.length} SOL/USDT pools.`);

  const structured: RaydiumApiPool[] = filtered.map((p: any) => ({
    id: p.id,
    type: p.type,
    programId: p.programId,
    mintA: p.mintA.address,
    mintB: p.mintB.address,
    decimalsA: p.mintA.decimals,
    decimalsB: p.mintB.decimals,
    feeRate: p.feeRate ?? undefined,
    tvl: p.tvl ?? undefined,
  }));

  // Save snapshot structurally (overwrite, not append)
  fs.writeFileSync(
    POOL_LOG_PATH,
    JSON.stringify(
      {
        timestamp: Date.now(),
        pair: "SOL/USDT",
        poolCount: structured.length,
        pools: structured,
      },
      null,
      2
    )
  );

  console.log("Pool snapshot saved to spreads.json");

  return structured;
}