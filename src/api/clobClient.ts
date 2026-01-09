import axios, { AxiosInstance } from "axios";
import { logger } from "../logger";
import { Trade } from "../types";

let dataClient: AxiosInstance | null = null;

function resolveDataApiBase(): string {
  const raw =
    process.env.DATA_API_URL ||      // <-- your Railway variable in the screenshot
    process.env.DATA_API_URL ||      // fallback if you used another name earlier
    "https://data-api.polymarket.com";

  // remove trailing slashes, and guard if someone sets ".../trades"
  return raw.replace(/\/+$/, "").replace(/\/trades$/, "");
}

export function initializeClobClient(): void {
  const base = resolveDataApiBase();

  dataClient = axios.create({
    baseURL: base,
    timeout: 10000,
  });

  logger.info("Data API client initialized", { dataApiBaseUrl: base });
}

/**
 * Fetch source trader trades from Polymarket Data API.
 * user should be the SOURCE trader's proxyWallet address.
 */
export async function getUserTrades(
  user: string,
  limit: number = 50,
  offset: number = 0
): Promise<Trade[]> {
  if (!dataClient) initializeClobClient();

  try {
    const res = await dataClient!.get("/trades", {
      params: { user, limit, offset, takerOnly: true },
    });

    const rows: any[] = Array.isArray(res.data) ? res.data : [];

    // Map Data API -> src/types.ts Trade
    return rows.map((t: any) => ({
      id: `${t.transactionHash}:${t.asset}:${t.timestamp}`,
      orderId: String(t.transactionHash ?? ""),
      marketId: String(t.conditionId ?? ""),
      outcome: Number(t.outcomeIndex ?? 0),
      side: String(t.side ?? "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY",
      price: typeof t.price === "string" ? parseFloat(t.price) : Number(t.price ?? 0),
      size: typeof t.size === "string" ? parseFloat(t.size) : Number(t.size ?? 0),
      timestamp: Number(t.timestamp ?? 0),
      traderAddress: String(t.proxyWallet ?? user),
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
 * Stub for now. Real trading requires signed orders + authenticated CLOB.
 * Keep this so the engine compiles/runs.
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
}

export default CLOBClient;
