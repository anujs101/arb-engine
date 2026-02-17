import { Connection, PublicKey } from "@solana/web3.js";
import { LIQUIDITY_STATE_LAYOUT_V4 } from "@raydium-io/raydium-sdk";

export interface RaydiumDecodedPool {
  baseVault: PublicKey;
  quoteVault: PublicKey;
  tradeFeeNumerator: bigint;
  tradeFeeDenominator: bigint;
}

export async function fetchRaydiumPool(
  connection: Connection,
  poolAddress: string
): Promise<RaydiumDecodedPool> {
  const accountInfo = await connection.getAccountInfo(
    new PublicKey(poolAddress)
  );

  if (!accountInfo) {
    throw new Error("Pool account not found");
  }

  const decoded = LIQUIDITY_STATE_LAYOUT_V4.decode(accountInfo.data);

  return {
    baseVault: new PublicKey(decoded.baseVault),
    quoteVault: new PublicKey(decoded.quoteVault),
    tradeFeeNumerator: BigInt(decoded.tradeFeeNumerator),
    tradeFeeDenominator: BigInt(decoded.tradeFeeDenominator),
  };
}