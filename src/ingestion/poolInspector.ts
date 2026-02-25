import { Connection, PublicKey } from "@solana/web3.js";

export const PROGRAM_IDS = {
  RAYDIUM_V4: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  RAYDIUM_CPMM: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
  CLMM: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
};

export type PoolProgramType =
  | "RAYDIUM_V4"
  | "RAYDIUM_CPMM"
  | "CLMM"
  | "UNKNOWN";

export async function detectPoolProgram(
  connection: Connection,
  address: string
): Promise<PoolProgramType> {
  const info = await connection.getAccountInfo(
    new PublicKey(address)
  );

  if (!info) {
    throw new Error("Account not found");
  }

  const owner = info.owner.toBase58();

  if (owner === PROGRAM_IDS.RAYDIUM_V4) {
    return "RAYDIUM_V4";
  }

  if (owner === PROGRAM_IDS.RAYDIUM_CPMM) {
    return "RAYDIUM_CPMM";
  }

  if (owner === PROGRAM_IDS.CLMM) {
    return "CLMM";
  }

  return "UNKNOWN";
}