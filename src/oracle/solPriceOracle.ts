import {
  PriceServiceConnection,
} from "@pythnetwork/price-service-client";

export class SolPriceOracle {
  private price: number = 0;
  private connection: PriceServiceConnection;

  constructor() {
    this.connection = new PriceServiceConnection(
  "https://hermes.pyth.network",
  { timeout: 15000 } // instead of 5000
);
  }

  async initialize() {
  try {
    await this.updatePrice();
  } catch (err) {
    console.warn("Oracle init failed, retrying in background.");
  }

  setInterval(() => {
    this.updatePrice().catch(() =>
      console.warn("Oracle update failed")
    );
  }, 5000);
}

  private async updatePrice() {
    const priceFeeds =
      await this.connection.getLatestPriceFeeds([
        "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
      ]);

    if (!priceFeeds || priceFeeds.length === 0) {
      console.warn("Pyth price unavailable, keeping last price.");
  return;
    }

    const priceFeed = priceFeeds[0];
    const price = priceFeed.getPriceUnchecked();

    if (!price) {
      throw new Error(
        "Invalid SOL price"
      );
    }

    const numericPrice =
      Number(price.price) *
      Math.pow(10, price.expo);

    this.price = numericPrice;

    console.log(
      `SOL Price Updated: $${this.price}`
    );
  }

  getPrice(): number {
    return this.price;
  }
}