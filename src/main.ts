import { Connection } from "@solana/web3.js";
import { RPC_HTTP, RPC_WS } from "./config";
import { fetchSolUsdtPools } from "./indexers/raydiumApiIndexer";
import { fetchRaydiumPool } from "./ingestion/raydiumPool";
import { MonitorManager } from "./monitoring/monitorManager";
import { SpreadEngine } from "./spreadEngine";
import { SolPriceOracle } from "./oracle/solPriceOracle";
import { MonitoredPool } from "./types";
import { OpportunityEngine } from "./core/opportunityEngine";
const SOL_MINT =
  "So11111111111111111111111111111111111111112";

async function main() {
  const connection = new Connection(RPC_HTTP, {
    commitment: "confirmed",
    wsEndpoint: RPC_WS,
  });

  // -----------------------------------------
  // 1️⃣ Initialize Oracle
  // -----------------------------------------
  const solOracle = new SolPriceOracle();
  await solOracle.initialize();
  console.log("SOL Oracle initialized.");

  // -----------------------------------------
  // 2️⃣ Initialize Spread Engine (event-driven)
  // -----------------------------------------
  const spreadEngine = new SpreadEngine(solOracle);
  console.log("Spread engine initialized.");

  // -----------------------------------------
  // 3️⃣ Initialize Monitor Manager
  // -----------------------------------------
  const manager = new MonitorManager(connection);
  const opportunityEngine = new OpportunityEngine();
  console.log("Fetching SOL/USDT pools from Raydium API...");
  const apiPools = await fetchSolUsdtPools();

  console.log(`Found ${apiPools.length} SOL/USDT pools.`);

  // Use Standard or concentrated pools for monitoring
  const usablePools = apiPools.filter(
  (p) => p.type === "Standard" || p.type === "Concentrated"
);

  console.log(`Using ${usablePools.length} usable pools.`);

  const poolsWithVaults: MonitoredPool[] =
    await Promise.all(
      usablePools.map(async (p) => {
        const poolData = await fetchRaydiumPool(
          connection,
          p.id
        );

        const isSolMintA = p.mintA === SOL_MINT;
        
        return {
          address: p.id,
          type: p.type === "Standard" ? "CPMM" : "CLMM",

          baseMint: SOL_MINT,
          quoteMint: isSolMintA ? p.mintB : p.mintA,

          baseDecimals: isSolMintA
            ? p.decimalsA
            : p.decimalsB,

          quoteDecimals: isSolMintA
            ? p.decimalsB
            : p.decimalsA,

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

  await manager.initialize(poolsWithVaults);

  console.log("Monitoring started.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
});