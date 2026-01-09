import axios, { AxiosInstance } from 'axios';
import { logger } from '../logger';
import { config } from '../config';
import { Market, OrderBook, Order, Trade } from '../types';

/**
 * Copy-trading reads come from Data API:
 *   https://data-api.polymarket.com/trades?user=<proxyWallet>
 *
 * This module exports BOTH:
 * - function-style API (initializeClobClient/getUserTrades/placeOrder) used by bot.ts/tradingEngine.ts
 * - a class CLOBClient for anyone using `new CLOBClient()`
 */

// ----------------------
// Shared clients
// ----------------------
let clobClient: AxiosInstance | null = null;
let dataClient: AxiosInstance | null = null;
let dataBase: string = 'https://data-api.polymarket.com';

function normalizeBase(u: string): string {
  return u.replace(/\/+$/, '').replace(/\/trades$/, '');
}

export function initializeClobClient(): void {
  const clobBase = normalizeBase(config.clobHttpUrl || 'https://clob.polymarket.com');
  dataBase = normalizeBase(config.dataApiUrl || 'https://data-api.polymarket.com');

  clobClient = axios.create({ baseURL: clobBase, timeout: 10000 });
  dataClient = axios.create({ baseURL: dataBase, timeout: 10000 });

  logger.info('HTTP clients initialized', { clobBase, dataBase });
}

// ----------------------
// Function exports (what your code expects)
// ----------------------

export async function getUserTrades(userAddress: string, limit: number = 50, offset: number = 0): Promise<Trade[]> {
  if (!dataClient) initializeClobClient();

  const url = `${dataBase}/trades`; // full URL to avoid any confusion

  try {
    const res = await axios.get(url, {
      params: { user: userAddress, limit, offset, takerOnly: true },
      timeout: 10000,
    });

    const rows: any[] = Array.isArray(res.data) ? res.data : [];

    return rows.map((t: any) => ({
      id: `${t.transactionHash}:${t.asset}:${t.timestamp}`,
      orderId: String(t.transactionHash ?? ''),
      marketId: String(t.conditionId ?? ''),
      outcome: Number(t.outcomeIndex ?? 0),
      side: String(t.side ?? 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
      price: typeof t.price === 'string' ? parseFloat(t.price) : Number(t.price ?? 0),
      size: typeof t.size === 'string' ? parseFloat(t.size) : Number(t.size ?? 0),
      timestamp: Number(t.timestamp ?? 0),
      traderAddress: String(t.proxyWallet ?? userAddress),
    }));
  } catch (e: any) {
    logger.error(`Failed to fetch trades for ${userAddress}`, {
      status: e?.response?.status,
      url,
      params: e?.config?.params,
      responseData: e?.response?.data,
      message: e?.message,
    });
    throw e;
  }
}

// Stub: keep engine compiling. Real Polymarket trading requires signed + authenticated CLOB.
export async function placeOrder(
  tokenId: string,
  side: 'BUY' | 'SELL',
  price: number,
  size: number
): Promise<{ success: boolean }> {
  logger.warn('placeOrder is stubbed (no real trading yet).', { tokenId, side, price, size });
  return { success: true };
}

// ----------------------
// Class wrapper
// ----------------------
export class CLOBClient {
  async getMarkets(): Promise<Market[]> {
    if (!clobClient) initializeClobClient();
    try {
      const res = await clobClient!.get('/markets');
      return Array.isArray(res.data) ? res.data : [];
    } catch (e: any) {
      logger.warn('getMarkets failed (non-fatal)', { status: e?.response?.status });
      return [];
    }
  }

  async getOrderBook(marketId: string): Promise<OrderBook> {
    if (!clobClient) initializeClobClient();
    const res = await clobClient!.get(`/markets/${marketId}/orderbook`);
    return res.data;
  }

  async getUserTrades(userAddress: string, limit = 50, offset = 0): Promise<Trade[]> {
    return getUserTrades(userAddress, limit, offset);
  }

  // until you implement authenticated CLOB
  async getUserOrders(_userAddress: string): Promise<Order[]> {
    return [];
  }

  async placeOrder(order: { tokenId: string; side: 'BUY' | 'SELL'; price: number; size: number }): Promise<{ success: boolean }> {
    return placeOrder(order.tokenId, order.side, order.price, order.size);
  }
}

export default CLOBClient;
