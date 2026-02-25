import { fetchSolUsdtPools } from "./indexers/raydiumApiIndexer";
import { fetchRaydiumPool } from "./ingestion/raydiumPool";
import { MonitorManager } from "./monitoring/monitorManager";
import { Connection } from "@solana/web3.js";
import { RPC_HTTP, RPC_WS } from "./config";
import { MonitoredPool } from "./types";
import { SpreadEngine } from "./spreadEngine";

const SOL_MINT =
  "So11111111111111111111111111111111111111112";

async function main() {
  const connection = new Connection(RPC_HTTP, {
    commitment: "confirmed",
    wsEndpoint: RPC_WS,
  });
  const spreadEngine = new SpreadEngine();
  const manager = new MonitorManager(connection);

  console.log("Fetching SOL/USDT pools from Raydium API...");
  const apiPools = await fetchSolUsdtPools();

  console.log(`Found ${apiPools.length} SOL/USDT pools.`);

  // Only use Standard pools (CPMM)
  const cpmmPools = apiPools.filter((p) => p.type === "Standard");

  console.log(`Using ${cpmmPools.length} CPMM pools.`);

  const poolsWithVaults = await Promise.all(
    cpmmPools.map(async (p) => {
      const poolData = await fetchRaydiumPool(connection, p.id);

      // Normalize orientation: SOL always reserveA
      const isSolMintA = p.mintA === SOL_MINT;

      return {
  address: p.id,
  baseMint: SOL_MINT,
  quoteMint: p.mintA === SOL_MINT ? p.mintB : p.mintA,
  decimalsA: isSolMintA ? p.decimalsA : p.decimalsB,
  decimalsB: isSolMintA ? p.decimalsB : p.decimalsA,
  feeRate: p.feeRate ?? 0.0025,
  baseVault: isSolMintA
    ? poolData.baseVault.toBase58()
    : poolData.quoteVault.toBase58(),
  quoteVault: isSolMintA
    ? poolData.quoteVault.toBase58()
    : poolData.baseVault.toBase58(),
};
    })
  );

  await manager.initialize(poolsWithVaults as MonitoredPool[]);

  console.log("Monitoring started.");
}

main().catch(console.error);