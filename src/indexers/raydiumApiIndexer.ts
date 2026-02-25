//fetching 200 sol/usdt pools but unable to parse them correctly, i want you to fix the parsing issue 
import fetch from "node-fetch";

export interface RaydiumApiPool {
  id: string;
  baseMint: string;
  quoteMint: string;
  baseDecimals: number;
  quoteDecimals: number;
}

const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

export async function fetchSolUsdtPools(): Promise<RaydiumApiPool[]> {
  console.log("Fetching pools from Raydium v3 API...");

  const res = await fetch(
    "https://api-v3.raydium.io/pools/info/list-v2?size=200&mintA=So11111111111111111111111111111111111111112&mintB=EPjFWdd5AufqSSqeM2q1xzybapC8G4wEGGkZwyTDt1v"
  );

  if (!res.ok) {
    console.error("Status:", res.status);
    console.error("Status Text:", res.statusText);
    const body = await res.text();
    console.error("Body:", body);
    throw new Error("Failed to fetch Raydium pool list");
  }

  const json = (await res.json()) as any;

  if (!json?.success || !json?.data?.data) {
    console.error("Unexpected API structure:", json);
    throw new Error("Unexpected API structure");
  }

  const pools = json.data.data;

  console.log(`Fetched ${pools.length} pools from API.`);

  const filtered = pools.filter(
    (p: any) =>
      (p.mintA?.address === SOL_MINT &&
        p.mintB?.address === USDT_MINT) ||
      (p.mintA?.address === USDT_MINT &&
        p.mintB?.address === SOL_MINT)
  );
  
  console.log(`Found ${filtered.length} SOL/USDT pools.`);

  return filtered.map((p: any) => ({
    id: p.id,
    baseMint: p.mintA.address === SOL_MINT ? p.mintA.address : p.mintB.address,
    quoteMint: p.mintA.address === SOL_MINT ? p.mintB.address : p.mintA.address,
    baseDecimals: p.mintA.address === SOL_MINT ? p.mintA.decimals : p.mintB.decimals,
    quoteDecimals: p.mintA.address === SOL_MINT ? p.mintB.decimals : p.mintA.decimals,
  }));
}