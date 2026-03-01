// src/core/opportunityEngine.ts

import { eventBus } from "../eventBus";
import { SpreadOpportunity } from "../spreadEngine";

interface TrackedOpportunity {
  firstSeen: number;
  lastSeen: number;
  occurrences: number;
  bestNetUsd: number;
}

export class OpportunityEngine {
  private active: Map<string, TrackedOpportunity> =
    new Map();

  constructor() {
    eventBus.on(
      "spreadOpportunity",
      (opp: SpreadOpportunity) => {
        this.handleOpportunity(opp);
      }
    );
  }

  private handleOpportunity(
    opp: SpreadOpportunity
  ) {
    const key = `${opp.buyPool}->${opp.sellPool}`;

    const now = Date.now();

    if (!this.active.has(key)) {
      this.active.set(key, {
        firstSeen: now,
        lastSeen: now,
        occurrences: 1,
        bestNetUsd: opp.netUsd,
      });
    } else {
      const existing = this.active.get(key)!;
      existing.lastSeen = now;
      existing.occurrences += 1;
      existing.bestNetUsd = Math.max(
        existing.bestNetUsd,
        opp.netUsd
      );
    }

    this.evaluate(key);
  }

  private evaluate(key: string) {
    const data = this.active.get(key);
    if (!data) return;

    const duration =
      data.lastSeen - data.firstSeen;

    // ----------------------------------
    // Persistence filter
    // ----------------------------------
    if (duration < 50) return; // <50ms too transient

    // ----------------------------------
    // Occurrence filter
    // ----------------------------------
    if (data.occurrences < 2) return;

    // ----------------------------------
    // Profit threshold
    // ----------------------------------
    if (data.bestNetUsd < 5) return; // $5 min

    console.log(`
🔥 EXECUTION CANDIDATE
Pair: ${key}
Best Net: $${data.bestNetUsd.toFixed(4)}
Persistence: ${duration}ms
Occurrences: ${data.occurrences}
`);
  }
}