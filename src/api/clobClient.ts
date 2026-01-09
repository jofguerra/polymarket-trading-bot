import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../logger';
import { Market, OrderBook, Order, Trade } from '../types';

/**
 * NOTE:
 * - Copy-trading (reading someone else's fills) should use the Data API:
 *   GET https://data-api.polymarket.com/trades?user=<proxyWallet>
 * - Do NOT call clob.polymarket.com/users/<addr>/trades (it 404s).
 */

// -----------------------------
// Internal shared clients
// -----------------------------
let clobHttp: AxiosInstance | null = null;
let dataApi: AxiosInstance | null = null;

function getClobBaseUrl(): string {
  const base = (config.clobHttpUrl || 'https://clob.polymarket.com').replace(/\/+$/, '');
  return base;
}

function getDataApiBaseUrl(): string {
  // Prefer config.dataApiUrl if you added it; otherwise env; otherwise default.
  const cfgAny = config as unknown as { dataApiUrl?: string };
  const base = (cfgAny.dataApiUrl || process.env.DATA_API_URL || 'https://data-api.polymarket.com').replace(/\/+$/, '');
  return base;
}

/**
 * Initialize both HTTP clients (CLOB + Data API).
 * Your bot can call this explicitly, or the class constructor will call it lazily.
 */
export const initializeClobClient = (): void => {
  const clobBase = getClobBaseUrl();
  const dataBase = getDataApiBaseUrl();

  clobHttp = axios.create({
    baseURL: clobBase,
    timeout: 10000,
  });

  dataApi = axios.create({
    baseURL: dataBase,
    timeout: 10000,
  });

  logger.info('HTTP clients initialized', {
    clobHttpUrl: clobBase,
    dataApiUrl: dataBase,
  });
};

// -----------------------------
// Named exports expected by your existing bot/engine
// -----------------------------

/**
 * Fetch trades for a user from the Polymarket Data API.
 * user = proxyWallet (or profile address)
 */
export const getUserTrades = async (user: string, limit = 50, offset = 0): Promise<Trade[]> => {
  if (!dataApi) initializeClobClient();

  try {
    const res = await dataApi!.get('/trades', {
      params: { user, limit, offset, takerOnly: true },
    });

    const rows: any[] = Array.isArray(res.data) ? res.data : [];

    // Map Data API -> your Trade interface
    return rows.map((t: any) => ({
      id: `${t.transactionHash ?? 'tx'}:${t.asset ?? 'asset'}:${t.timestamp ?? 'ts'}`,
      orderId: t.transactionHash ?? '',
      marketId: t.conditionId ?? '',
      outcome: t.outcomeIndex ?? 0,
      side: (t.side ?? 'BUY') as 'BUY' | 'SELL',
      price: typeof t.price === 'string' ? parseFloat(t.price) : Number(t.price ?? 0),
      size: typeof t.size === 'string' ? parseFloat(t.size) : Number(t.size ?? 0),
      timestamp: Number(t.timestamp ?? 0),
      traderAddress: t.proxyWallet ?? user,
    }));
  } catch (error: any) {
    logger.error('Failed to fetch user trades from Data API', {
      message: error?.message,
      status: error?.response?.status,
      baseURL: error?.config?.baseURL,
      url: error?.config?.url,
      params: error?.config?.params,
      responseData: error?.response?.data,
    });
    throw error;
  }
};

/**
 * Placeholder order placement.
 * Real Polymarket order placement requires signed orders (EIP-712) + authenticated CLOB.
 * Keep as stub until you wire the official SDK.
 */
export const placeOrder = async (
  market: string,
  side: 'BUY' | 'SELL',
  price: number,
  size: number
): Promise<{ success: boolean; market: string; side: 'BUY' | 'SELL'; price: number; size: number }> => {
  logger.info('Order placement (stub)', { market, side, price, size });
  return { success: true, market, side, price, size };
};

// -----------------------------
// Class wrapper (for code that uses `new CLOBClient()`)
// -----------------------------
export class CLOBClient {
  constructor() {
    if (!clobHttp || !dataApi) initializeClobClient();
  }

  async healthCheck(): Promise<boolean> {
    if (!clobHttp) initializeClobClient();

    const endpoints = ['/health', '/markets', '/'];
    for (const ep of endpoints) {
      try {
        const r = await clobHttp!.get(ep, { timeout: 5000 });
        if (r.status === 200 || r.status === 404) return true;
      } catch {
        // ignore
      }
    }
    return false;
  }

  // Market endpoints are best-effort and may vary by host
  async getMarkets(): Promise<Market[]> {
    if (!clobHttp) initializeClobClient();
    const res = await clobHttp!.get('/markets');
    return Array.isArray(res.data) ? res.data : [];
  }

  async getOrderBook(marketId: string): Promise<OrderBook> {
    if (!clobHttp) initializeClobClient();
    const res = await clobHttp!.get(`/markets/${marketId}/orderbook`);
    return res.data as OrderBook;
  }

  // Copy trades (Data API)
  async getUserTrades(userAddress: string, limit = 50, offset = 0): Promise<Trade[]> {
    return getUserTrades(userAddress, limit, offset);
  }

  // Stub
  async placeOrder(order: {
    marketId: string;
    outcome: number;
    side: 'BUY' | 'SELL';
    price: number;
    size: number;
  }): Promise<Order> {
    // if you have an Order type, return something compatible; otherwise keep stub minimal
    await placeOrder(order.marketId, order.side, order.price, order.size);
    return {
      id: `stub-${Date.now()}`,
      marketId: order.marketId,
      outcome: order.outcome,
      side: order.side,
      price: order.price,
      size: order.size,
      status: 'OPEN',
      createdAt: Date.now(),
    } as unknown as Order;
  }
}

export default CLOBClient;
