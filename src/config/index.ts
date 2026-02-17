import dotenv from "dotenv";
dotenv.config();

export const RPC_HTTP = process.env.RPC_HTTP!;
export const RPC_WS = process.env.RPC_WS!;

if (!RPC_HTTP || !RPC_WS) {
  throw new Error("Missing RPC configuration in .env");
}