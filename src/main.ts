import { Connection, PublicKey } from "@solana/web3.js";
import { RPC_HTTP } from "./config";
import { fetchRaydiumPool } from "./ingestion/raydiumPool";
import { subscribeToVault } from "./ingestion/vaultSubscriber";
import { PoolState } from "./types";

const RAYDIUM_SOL_USDC =
  "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";

async function main() {
  const connection = new Connection(RPC_HTTP, "confirmed");

  console.log("Fetching Raydium pool...");
  const decoded = await fetchRaydiumPool(
    connection,
    RAYDIUM_SOL_USDC
  );

  console.log("Base Vault:", decoded.baseVault.toBase58());
  console.log("Quote Vault:", decoded.quoteVault.toBase58());
  console.log("Fee:", decoded.tradeFeeNumerator.toString(), "/", decoded.tradeFeeDenominator.toString());

  const poolState: PoolState = {
    address: RAYDIUM_SOL_USDC,
    reserveA: 0n,
    reserveB: 0n,
    feeNumerator: decoded.tradeFeeNumerator,
    feeDenominator: decoded.tradeFeeDenominator,
    lastUpdatedSlot: 0,
    decimalsA: 9, // SOL
    decimalsB: 6, // USDC
  };

  subscribeToVault(connection, decoded.baseVault, (amount, slot) => {
    poolState.reserveA = amount;
    poolState.lastUpdatedSlot = slot;

    console.log("SOL Reserve:", amount.toString(), "Slot:", slot);
  });

  subscribeToVault(connection, decoded.quoteVault, (amount, slot) => {
    poolState.reserveB = amount;
    poolState.lastUpdatedSlot = slot;

    console.log("USDC Reserve:", amount.toString(), "Slot:", slot);
  });

  console.log("Subscribed to vault updates...");
}

main().catch(console.error);