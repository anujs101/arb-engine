import { fetchSolUsdtPools } from "./indexers/raydiumApiIndexer";
import { fetchRaydiumPool } from "./ingestion/raydiumPool";
import { MonitorManager } from "./monitoring/monitorManager";
import { Connection, PublicKey } from "@solana/web3.js";
import { RPC_HTTP,RPC_WS } from "./config";
async function main() {
  const connection = new Connection(RPC_HTTP, {
    commitment: "confirmed",
    wsEndpoint: RPC_WS,
  });

  const manager = new MonitorManager(connection);

  console.log("Fetching SOL/USDT pools from Raydium API...");
  const apiPools = await fetchSolUsdtPools();

  console.log(`Found ${apiPools.length} SOL/USDT pools.`);

  // Fetch on-chain pool data to get vault addresses
  const poolsWithVaults = await Promise.all(
    apiPools.map(async (p) => {
      const poolData = await fetchRaydiumPool(connection, p.id);
      return {
        address: p.id,
        baseMint: p.baseMint,
        quoteMint: p.quoteMint,
        baseVault: poolData.baseVault.toBase58(),
        quoteVault: poolData.quoteVault.toBase58(),
      };
    })
  );

  await manager.initialize(poolsWithVaults);

  console.log("Monitoring started.");
}

main().catch(console.error);