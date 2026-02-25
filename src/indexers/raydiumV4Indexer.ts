import { Connection, PublicKey } from "@solana/web3.js";
import { LIQUIDITY_STATE_LAYOUT_V4 } from "@raydium-io/raydium-sdk";
import fs from "fs";
import path from "path";

/**
 * ===============================
 * CONSTANTS
 * ===============================
 */

const RAYDIUM_V4_PROGRAM_ID =
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";

const SOL_MINT =
  "So11111111111111111111111111111111111111112";

const USDC_MINT =
  "EPjFWdd5AufqSSqeM2q1xzybapC8G4wEGGkZwyTDt1v";

const CACHE_PATH = path.resolve(
  __dirname,
  "../../data/raydium_v4_pools.json"
);

/**
 * ===============================
 * TYPES
 * ===============================
 */

export interface RaydiumV4Pool {
  address: string;
  baseMint: string;
  quoteMint: string;
  baseVault: string;
  quoteVault: string;
}

/**
 * ===============================
 * CORE INDEXER (Metadata Only)
 * ===============================
 */

export async function indexRaydiumV4Pools(
  connection: Connection
): Promise<RaydiumV4Pool[]> {
 const accounts = await connection.getProgramAccounts(
  new PublicKey(RAYDIUM_V4_PROGRAM_ID),
  {
    filters: [
      {
        memcmp: {
          offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("baseMint"),
          bytes: SOL_MINT,
        },
      },
      {
        memcmp: {
          offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("quoteMint"),
          bytes: USDC_MINT,
        },
      },
    ],
  }
);

  const pools: RaydiumV4Pool[] = [];

  for (const acc of accounts) {
    try {
      const decoded = LIQUIDITY_STATE_LAYOUT_V4.decode(
        acc.account.data
      );

      const baseMint = new PublicKey(decoded.baseMint).toBase58();
      const quoteMint = new PublicKey(decoded.quoteMint).toBase58();
      const baseVault = new PublicKey(decoded.baseVault).toBase58();
      const quoteVault = new PublicKey(decoded.quoteVault).toBase58();

      pools.push({
        address: acc.pubkey.toBase58(),
        baseMint,
        quoteMint,
        baseVault,
        quoteVault,
      });
    } catch {
      // Skip non-pool accounts
      continue;
    }
  }

  return pools;
}

/**
 * ===============================
 * SOL/USDC FILTER
 * ===============================
 */

export function filterSolUsdcPools(
  pools: RaydiumV4Pool[]
): RaydiumV4Pool[] {
  return pools.filter(
    (p) =>
      (p.baseMint === SOL_MINT &&
        p.quoteMint === USDC_MINT) ||
      (p.baseMint === USDC_MINT &&
        p.quoteMint === SOL_MINT)
  );
}

/**
 * ===============================
 * CACHE LAYER
 * ===============================
 */

export function loadPoolCache(): RaydiumV4Pool[] | null {
  if (!fs.existsSync(CACHE_PATH)) return null;

  try {
    const raw = fs.readFileSync(CACHE_PATH, "utf-8");

    if (!raw || raw.trim().length === 0) {
      return null;
    }

    return JSON.parse(raw);
  } catch (err) {
    console.warn("Cache corrupted. Rebuilding...");
    return null;
  }
}

export function savePoolCache(pools: RaydiumV4Pool[]) {
  fs.writeFileSync(
    CACHE_PATH,
    JSON.stringify(pools, null, 2)
  );
}

/**
 * ===============================
 * INDEX WITH CACHE
 * ===============================
 */

export async function getRaydiumV4Pools(
  connection: Connection,
  useCache = true
): Promise<RaydiumV4Pool[]> {
  if (useCache) {
    const cached = loadPoolCache();
    if (cached) return cached;
  }

  const pools = await indexRaydiumV4Pools(connection);

  savePoolCache(pools);

  return pools;
}