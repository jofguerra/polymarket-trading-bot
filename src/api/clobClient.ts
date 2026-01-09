import axios, { AxiosError, AxiosInstance } from 'axios';
import { logger } from '../logger';
import { config } from '../config';
import { Market, OrderBook, Order, Trade } from '../types';

/**
 * CLOBClient
 * - Uses CLOB HTTP base URL for market/orderbook-related calls (public-ish endpoints vary by implementation).
 * - Uses Data API for "copy trades" (source trader fills) via /trades?user=...
 *
 * IMPORTANT:
 * Polymarket "copy trades" should be fetched from:
 *   https://data-api.polymarket.com/trades?user=<proxyWallet>
 * NOT from clob.polymarket.com/users/<addr>/trades (404).
 */
export class CLOBClient {
  private clobClient: AxiosInstance;
  private dataClient: AxiosInstance;

  private clobBaseUrl: string;
  private dataBaseUrl: string;

  constructor() {
    // CLOB base (your existing config)
    this.clobBaseUrl = config.clobHttpUrl?.replace(/\/+$/, '') || 'https://clob.polymarket.com';
    this.clobClient = axios.create({
      baseURL: this.clobBaseUrl,
      timeout: 10000,
    });

    // Data API base (copy-trading data endpoints)
    // Prefer config.dataApiUrl if you added it, otherwise env, otherwise default.
    const cfgAny = config as unknown as { dataApiUrl?: string };
    this.dataBaseUrl = (cfgAny.dataApiUrl || process.env.DATA_API_URL || 'https://data-api.polymarket.com').replace(/\/+$/, '');
    this.dataClient = axios.create({
      baseURL: this.dataBaseUrl,
      timeout: 10000,
    });

    logger.info('HTTP clients ready', {
      clobBaseUrl: this.clobBaseUrl,
      dataBaseUrl: this.dataBaseUrl,
    });
  }

  // ----------------------------
  // Data API (COPY TRADES)
  // ----------------------------

  /**
   * Fetch trades for a given user (proxyWallet/profile address) from Data API.
   * This is the correct endpoint for "copy trades".
   *
   * Example:
   *  GET https://data-api.polymarket.com/trades?user=0x...&limit=50&offset=0
   */
  async getUserTrades(userAddress: string, limit: number = 50, offset: number = 0): Promise<Trade[]> {
    try {
      const res = await this.dataClient.get('/trades', {
        params: {
          user: userAddress,
          limit,
          offset,
        },
      });

      const rows: any[] = Array.isArray(res.data) ? res.data : [];
      // Map Data API -> your Trade type. If your Trade type differs, adjust here.
      return rows.map((t: any) => ({
        id: `${t.transactionHash ?? 'tx'}:${t.asset ?? 'asset'}:${t.timestamp ?? 'ts'}`,
        orderId: t.transactionHash ?? '',
        marketId: t.conditionId ?? '',
        outcome: t.outcomeIndex ?? 0,
        side: t.side ?? '',
        price: typeof t.price === 'string' ? parseFloat(t.price) : Number(t.price ?? 0),
        size: typeof t.size === 'string' ? parseFloat(t.size) : Number(t.size ?? 0),
        timestamp: Number(t.timestamp ?? 0),
        traderAddress: t.proxyWallet ?? userAddress,
      }));
    } catch (err) {
      this.logAxiosError(`Failed to fetch trades for ${userAddress}`, err);
      throw err;
    }
  }

  // ----------------------------
  // CLOB-ish endpoints (MARKETS / BOOK)
  // NOTE: These endpoints differ depending on which API you're hitting.
  // Keep these as "best effort" with fallbacks.
  // ----------------------------

  /**
   * Attempt to fetch markets from the CLOB host.
   * If your CLOB host doesn't provide /markets, you should switch this to Gamma API instead.
   */
  async getMarkets(limit: number = 100, offset: number = 0): Promise<Market[]> {
    try {
      const res = await this.clobClient.get('/markets', { params: { limit, offset } });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      this.logAxiosError('Failed to fetch markets from CLOB host', err);
      return [];
    }
  }

  /**
   * Get a single market by id (best effort).
   */
  async getMarket(marketId: string): Promise<Market | null> {
    try {
      const res = await this.clobClient.get(`/markets/${marketId}`);
      return res.data ?? null;
    } catch (err) {
      this.logAxiosError(`Failed to fetch market ${marketId}`, err);
      return null;
    }
  }

  /**
   * Get order book for a market/outcome/token.
   *
   * Different deployments expose different shapes. We try a couple patterns:
   *  1) GET /book/{marketId}
   *  2) GET /book?market={marketId}
   *
   * If your true endpoint is /book?token_id=..., you should call with tokenId instead.
   */
  async getOrderBook(marketId: string): Promise<OrderBook> {
    // Default empty book
    const empty: OrderBook = {
      marketId,
      bids: [],
      asks: [],
      timestamp: Date.now(),
    };

    // Try /book/{id}
    try {
      const res1 = await this.clobClient.get(`/book/${marketId}`);
      if (res1?.data) return this.normalizeOrderBook(marketId, res1.data);
    } catch (_) {
      // ignore and try fallback
    }

    // Try /book?market=...
    try {
      const res2 = await this.clobClient.get('/book', { params: { market: marketId } });
      if (res2?.data) return this.normalizeOrderBook(marketId, res2.data);
    } catch (err) {
      this.logAxiosError(`Failed to fetch order book for ${marketId}`, err);
      return empty;
    }

    return empty;
  }

  /**
   * Get mid price for a market.
   */
  async getMidPrice(marketId: string): Promise<number> {
    const book = await this.getOrderBook(marketId);

    if (!book.bids?.length || !book.asks?.length) return 0.5;

    const bestBid = book.bids[0]?.price ?? 0;
    const bestAsk = book.asks[0]?.price ?? 1;

    return (bestBid + bestAsk) / 2;
  }

  /**
   * Place an order.
   *
   * IMPORTANT: Real Polymarket order placement requires authenticated CLOB client + signed orders.
   * If your bot currently just logs orders, keep this as a stub.
   *
   * If you later wire @polymarket/clob-client, replace this entirely.
   */
  async placeOrder(order: Order): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      logger.info('Order placement requested (stub)', order);
      // Stub success for now (replace with real signed CLOB order flow)
      return { success: true, order };
    } catch (err: any) {
      logger.error('Failed to place order', {
        message: err?.message,
        stack: err?.stack,
      });
      return { success: false, error: err?.message ?? 'Unknown error' };
    }
  }

  /**
   * Cancel an order (stub).
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      logger.info('Cancel order requested (stub)', { orderId });
      return true;
    } catch (err) {
      this.logAxiosError(`Failed to cancel order ${orderId}`, err);
      return false;
    }
  }

  /**
   * Fetch open orders (stub).
   */
  async getOpenOrders(): Promise<Order[]> {
    try {
      logger.debug('getOpenOrders (stub) called');
      return [];
    } catch (err) {
      this.logAxiosError('Failed to fetch open orders', err);
      return [];
    }
  }

  /**
   * Basic health check (best effort).
   */
  async healthCheck(): Promise<boolean> {
    const endpoints = ['/health', '/ping', '/'];
    for (const endpoint of endpoints) {
      try {
        await this.clobClient.get(endpoint);
        logger.debug(`Health check OK on endpoint: ${endpoint}`);
        return true;
      } catch (err) {
        logger.debug(`Health check failed on endpoint: ${endpoint}`, {
          message: (err as any)?.message,
        });
      }
    }

    logger.warn('All health check endpoints failed, but API may still be reachable');
    return false;
  }

  // ----------------------------
  // Helpers
  // ----------------------------

  private normalizeOrderBook(marketId: string, data: any): OrderBook {
    // Expect either:
    //  - { bids: [{price, size}], asks: [{price, size}] }
    //  - { bids: [[price, size]], asks: [[price, size]] }
    const bidsRaw = data?.bids ?? [];
    const asksRaw = data?.asks ?? [];

    const bids = Array.isArray(bidsRaw)
      ? bidsRaw.map((x: any) => this.normalizeLevel(x)).filter(Boolean)
      : [];
    const asks = Array.isArray(asksRaw)
      ? asksRaw.map((x: any) => this.normalizeLevel(x)).filter(Boolean)
      : [];

    return {
      marketId,
      bids: bids as any,
      asks: asks as any,
      timestamp: Date.now(),
    };
  }

  private normalizeLevel(x: any): { price: number; size: number } | null {
    // { price, size }
    if (x && typeof x === 'object' && 'price' in x && 'size' in x) {
      const price = typeof x.price === 'string' ? parseFloat(x.price) : Number(x.price);
      const size = typeof x.size === 'string' ? parseFloat(x.size) : Number(x.size);
      return { price, size };
    }
    // [price, size]
    if (Array.isArray(x) && x.length >= 2) {
      const price = typeof x[0] === 'string' ? parseFloat(x[0]) : Number(x[0]);
      const size = typeof x[1] === 'string' ? parseFloat(x[1]) : Number(x[1]);
      return { price, size };
    }
    return null;
  }

  private logAxiosError(context: string, err: unknown) {
    const ax = err as AxiosError;
    logger.error(context, {
      message: (ax as any)?.message,
      status: ax?.response?.status,
      baseURL: (ax as any)?.config?.baseURL,
      url: (ax as any)?.config?.url,
      fullUrl: `${(ax as any)?.config?.baseURL ?? ''}${(ax as any)?.config?.url ?? ''}`,
      params: (ax as any)?.config?.params,
      responseData: ax?.response?.data,
      stack: (ax as any)?.stack,
    });
  }
}

export default CLOBClient;
