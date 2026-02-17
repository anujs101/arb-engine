import { Connection, PublicKey } from "@solana/web3.js";

export function subscribeToVault(
  connection: Connection,
  vault: PublicKey,
  onUpdate: (amount: bigint, slot: number) => void
) {
  connection.onAccountChange(
    vault,
    (accountInfo, context) => {
      const data = accountInfo.data;

      // SPL token amount is at offset 64 (8 bytes, little-endian)
      const amount = data.readBigUInt64LE(64);

      onUpdate(amount, context.slot);
    },
    "confirmed"
  );
}