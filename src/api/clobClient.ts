import axios, { AxiosInstance } from "axios";
import { logger } from "../logger";
import { config } from "../config";

/**
 * Minimal Trade type for copy-trading.
 * (Matches Data API fields you saw: proxyWallet, side, asset, conditionId, size, price, timestamp, transactionHash, outcomeIndex)
 */
export interface Trade {
  id: string;
  traderAddress: string;      // proxyWallet
  transactionHash: string;
  tokenId: string;            // Data API "asset"
  conditionId: string;
  outcomeIndex: number;
  side: "BUY" | "SELL";
  price: number;
  size: number;
  timestamp: number;
}

/**
 * NOTE:
 * - Copy-trading source fills must be fetched from Data API:
 *   https://data-api.polymarket.com/trades?user=<proxyWallet>
 * - DO NOT call clob.polymarket.com/users/<addr>/trades (it 404s).
 */

let dataClient: AxiosInstance | null = null;

/** Accept multiple env var names to avoid Railway mismatch */
function resolveDataApiBase(): string {
  const fromConfig =
    (config as unknown as { dataApiUrl?: string }).dataApiUrl;

  const raw =
    fromConfig ||
    process.env.DATA_API_URL ||
    process.env.DATA_API_URL ||
    process.env.DATA_API_URL ||
    "https://data-api.polymarket.com";

  // Clean up trailing slashes and guard against accidental "/trades"
  return raw.replace(/\/+$/, "").replace(/\/trades$/, "");
}

/** Initialize clients once */
export function initializeClobClient(): void {
  const dataBase = resolveDataApiBase();

  dataClient = axios.create({
    baseURL: dataBase,
    timeout: 10000,
  });

  logger.info("Data API client initialized", { dataApiBaseUrl: dataBase });
}

/**
 * Fetch source trader fills from Data API.
 * user should be the trader's proxyWallet address.
 */
export async function getUserTrades(
  user: string,
  limit: number = 50,
  offset: number = 0
): Promise<Trade[]> {
  if (!dataClient) initializeClobClient();

  try {
    const res = await dataClient!.get("/trades", {
      params: {
        user,
        limit,
        offset,
        takerOnly: true,
      },
    });

    const rows: any[] = Array.isArray(res.data) ? res.data : [];

    return rows.map((t: any) => ({
      id: `${t.transactionHash}:${t.asset}:${t.timestamp}`,
      traderAddress: String(t.proxyWallet || user),
      transactionHash: String(t.transactionHash || ""),
      tokenId: String(t.asset || ""),
      conditionId: String(t.conditionId || ""),
      outcomeIndex: Number(t.outcomeIndex ?? 0),
      side: (String(t.side || "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY"),
      price: typeof t.price === "string" ? parseFloat(t.price) : Number(t.price ?? 0),
      size: typeof t.size === "string" ? parseFloat(t.size) : Number(t.size ?? 0),
      timestamp: Number(t.timestamp ?? 0),
    }));
  } catch (err: any) {
    logger.error(`Failed to fetch trades for ${user}`, {
      status: err?.response?.status,
      baseURL: err?.config?.baseURL,
      url: err?.config?.url,
      fullUrl: `${err?.config?.baseURL ?? ""}${err?.config?.url ?? ""}`,
      params: err?.config?.params,
      responseData: err?.response?.data,
      message: err?.message,
    });
    throw err;
  }
}

/**
 * Stub order placement (your engine expects it).
 * Real Polymarket trading requires signed orders + authenticated CLOB.
 */
export async function placeOrder(
  tokenId: string,
  side: "BUY" | "SELL",
  price: number,
  size: number
): Promise<{ success: boolean; tokenId: string; side: "BUY" | "SELL"; price: number; size: number }> {
  logger.info("placeOrder (stub)", { tokenId, side, price, size });
  return { success: true, tokenId, side, price, size };
}

/**
 * Class wrapper if your code does `new CLOBClient()`.
 */
export class CLOBClient {
  constructor() {
    if (!dataClient) initializeClobClient();
  }

  async getUserTrades(user: string, limit = 50, offset = 0): Promise<Trade[]> {
    return getUserTrades(user, limit, offset);
  }

  async placeOrder(tokenId: string, side: "BUY" | "SELL", price: number, size: number) {
    return placeOrder(tokenId, side, price, size);
  }

  getDataClient(): AxiosInstance {
    if (!dataClient) initializeClobClient();
    return dataClient!;
  }
}

export default CLOBClient;
