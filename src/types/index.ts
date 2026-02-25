/**
 * Represents the on-chain state of a constant-product liquidity pool.
 *
 * All reserves are stored in raw on-chain units:
 * - SOL: lamports (1e9)
 * - USDC: micro-units (1e6)
 *
 * No normalization or decimal scaling is performed at this layer.
 */
export interface PoolState {
  /** Public key (base58) of the pool account */
  address: string;

  /** Reserve of token A in raw base units */
  reserveA: bigint;

  /** Reserve of token B in raw base units */
  reserveB: bigint;

  /** Fee numerator (e.g., 3 for 0.3%) */
  feeNumerator: bigint;

  /** Fee denominator (e.g., 1000 for 0.3%) */
  feeDenominator: bigint;

  /** Last updated slot number */
  lastUpdatedSlot: number;

  /** Token A decimals (e.g., 9 for SOL) */
  decimalsA: number;

  /** Token B decimals (e.g., 6 for USDC) */
  decimalsB: number;
}

/**
 * Represents a cross-DEX arbitrage opportunity snapshot.
 * Captures state at a specific moment.
 */
export interface SpreadOpportunity {
  timestamp: number; // ms since epoch

  poolA: PoolState;
  poolB: PoolState;

  /** Spot spread in basis points (scaled integer, not float) */
  spreadBps: bigint;
}

/**
 * Result returned by the deterministic optimizer.
 */
export interface OptimizationResult {
  /** Optimal input amount (raw base units of input token) */
  optimalInput: bigint;

  /** Deterministic profit (raw base units of input token) */
  profit: bigint;

  /** Number of ternary iterations performed */
  iterations: number;

  /** Final lower bound after convergence */
  finalLowerBound: bigint;

  /** Final upper bound after convergence */
  finalUpperBound: bigint;

  /** Whether local peak refinement was applied */
  refinementApplied: boolean;
}

/**
 * Represents a logged arbitrage event lifecycle.
 */
export interface SpreadLogEntry {
  detectedAt: number;
  collapsedAt?: number;

  spreadBps: bigint;

  optimalInput: bigint;
  deterministicProfit: bigint;

  /** Duration in milliseconds (if collapsed) */
  lifetimeMs?: number;
}

/**
 * Configuration for optimizer bounds.
 */
export interface OptimizationBounds {
  lowerBound: bigint;
  upperBound: bigint;
}

/**
 * Risk filter configuration (V1 deterministic mode).
 */
export interface RiskConfig {
  minSpreadBps: bigint;
  maxSpreadBps: bigint;
  minProfit: bigint;
  maxSpreadAgeMs: number;
}
export type PoolType = "CPMM" | "CLMM";

export interface MonitoredPool {
  address: string;
  type: PoolType;
  baseMint: string;
  quoteMint: string;
  baseVault?: string;     // CPMM only
  quoteVault?: string;    // CPMM only
  decimalsA: number;
  decimalsB: number;
  feeRate: number;
}
export interface PoolModel {
  readonly address: string
  readonly baseMint: string
  readonly quoteMint: string
  readonly feeRate: number

  getSpotPrice(): number
  simulateSwap(input: bigint): bigint
}