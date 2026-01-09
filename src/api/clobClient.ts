import axios, { AxiosInstance } from 'axios';
import { logger } from '../logger';
import { config } from '../config';
import { Market, OrderBook, Order, Trade } from '../types';

/**
 * IMPORTANT:
 * - Copy-trading source fills must be fetched from Polymarket DATA API:
 *     https://data-api.polymarket.com/trades?user=<proxyWallet>
 * - CLOB endpoints like /users/<addr>/trades and /users/<addr>/orders DO NOT exist publicly (404).
 *
 * This file:
 * - Uses Data API for getUserTrades()
 * - Stubs getUserOrders() to avoid constant 404s until you implement authenticated CLOB.
 */

export class CLOBClient {
  private clobClient: AxiosInstance;
  private dataClient: AxiosInstance;

  private clobBaseUrl: string;
  private dataBaseUrl: string;

  constructor() {
    // CLOB base (keep for market/orderbook calls if you still want them)
    this.clobBaseUrl = (config.clobHttpUrl || 'https://clob.polymarket.com').replace(/\/+$/, '');
    this.clobClient = axios.create({
      baseURL: this.clobBaseUrl,
      timeout: 10000,
    });

    // DATA API base (for copy-trading trades)
    // Your Railway variable in the screenshot is DATA_API_URL
    const envData =
      process.env.DATA_API_URL ||
      process.env.DATA_API_URL || // fallback if you used another name earlier
      'https://data-api.polymarket.com';

    // Clean up, and guard if someone mistakenly sets ".../trades"
    this.dataBaseUrl = envData.replace(/\/+$/, '').replace(/\/trades$/, '');
    this.dataClient = axios.create({
      baseURL: this.dataBaseUrl,
      timeout: 10000,
    });

    logger.info('HTTP clients ready', {
      clobBaseUrl: this.clobBaseUrl,
      dataBaseUrl: this.dataBaseUrl,
    });
  }

  /**
   * Fetch all active markets (best-effort; may 404 depending on host behavior)
   */
  async getMarkets(): Promise<Market[]> {
    try {
      const response = await this.clobClient.get('/markets');
      logger.debug('Fetched markets', { count: response.data?.length ?? 0 });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      logger.error('Failed to fetch markets', {
        status: error?.response?.status,
        baseURL: error?.config?.baseURL,
        url: error?.config?.url,
        fullUrl: `${error?.config?.baseURL ?? ''}${error?.config?.url ?? ''}`,
        responseData: error?.response?.data,
        message: error?.message,
      });
      return [];
    }
  }

  /**
   * Fetch a specific market by ID (best-effort)
   */
  async getMarket(marketId: string): Promise<Market> {
    try {
      const response = await this.clobClient.get(`/markets/${marketId}`);
      logger.debug('Fetched market', { marketId });
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to fetch market ${marketId}`, {
        status: error?.response?.status,
        baseURL: error?.config?.baseURL,
        url: error?.config?.url,
        fullUrl: `${error?.config?.baseURL ?? ''}${error?.config?.url ?? ''}`,
        responseData: error?.response?.data,
        message: error?.message,
      });
      throw error;
    }
  }

  /**
   * Fetch order book for a market (best-effort)
   */
  async getOrderBook(marketId: string): Promise<OrderBook> {
    try {
      const response = await this.clobClient.get(`/markets/${marketId}/orderbook`);
      logger.debug('Fetched orderbook', { marketId });
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to fetch orderbook for ${marketId}`, {
        status: error?.response?.status,
        baseURL: error?.config?.baseURL,
        url: error?.config?.url,
        fullUrl: `${error?.config?.baseURL ?? ''}${error?.config?.url ?? ''}`,
        responseData: error?.response?.data,
        message: error?.message,
      });
      throw error;
    }
  }

  /**
   * Get mid price for a market outcome
   */
  async getMidPrice(marketId: string): Promise<number> {
    const orderBook = await this.getOrderBook(marketId);

    if (!orderBook?.bids?.length || !orderBook?.asks?.length) return 0.5;

    const bestBid = orderBook.bids[0].price;
    const bestAsk = orderBook.asks[0].price;
    return (bestBid + bestAsk) / 2;
  }

  /**
   * Place a new order
   *
   * NOTE:
   * Real Polymarket trading requires signed orders + authenticated CLOB.
   * This method is a stub so your bot can run without 404ing.
   */
  async placeOrder(order: {
    marketId: string;
    outcome: number;
    side: 'BUY' | 'SELL';
    price: number;
    size: number;
  }): Promise<Order> {
    logger.warn('placeOrder is currently a stub (no real trading implemented)', order);

    // Return a fake Order object to keep the engine flowing.
    return {
      id: `stub-${Date.now()}`,
      marketId: order.marketId,
      outcome: order.outcome,
      side: order.side,
      price: order.price,
      size: order.size,
      timestamp: Date.now(),
      status: 'PENDING',
    };
  }

  /**
   * Cancel an order (stub)
   */
  async cancelOrder(orderId: string): Promise<void> {
    logger.warn('cancelOrder is currently a stub', { orderId });
  }

  /**
   * Get order status (stub)
   */
  async getOrder(orderId: string): Promise<Order> {
    logger.warn('getOrder is currently a stub', { orderId });
    return {
      id: orderId,
      marketId: '',
      outcome: 0,
      side: 'BUY',
      price: 0,
      size: 0,
      timestamp: Date.now(),
      status: 'PENDING',
    };
  }

  /**
   * Get user's orders
   *
   * IMPORTANT:
   * There is no public CLOB endpoint like /users/<addr>/orders (it 404s).
   * Until you implement authenticated CLOB, return [] to avoid spam errors.
   */
  async getUserOrders(userAddress: string): Promise<Order[]> {
    logger.debug('getUserOrders stub (returns empty)', { userAddress });
    return [];
  }

  /**
   * Get recent trades for a market (optional)
   * Keeping as-is; may 404 depending on host. Not used for copy-trading.
   */
  async getMarketTrades(marketId: string, limit: number = 100): Promise<Trade[]> {
    try {
      const response = await this.clobClient.get(`/markets/${marketId}/trades`, { params: { limit } });
      logger.debug('Fetched market trades', { marketId, count: response.data?.length ?? 0 });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      logger.error(`Failed to fetch market trades for ${marketId}`, {
        status: error?.response?.status,
        baseURL: error?.config?.baseURL,
        url: error?.config?.url,
        fullUrl: `${error?.config?.baseURL ?? ''}${error?.config?.url ?? ''}`,
        responseData: error?.response?.data,
        message: error?.message,
      });
      return [];
    }
  }

  /**
   * ✅ Get user's trades (COPY TRADING SOURCE TRADES)
   * Uses Data API:
   *   GET /trades?user=<proxyWallet>&limit=...&offset=...
   */
  async getUserTrades(userAddress: string, limit: number = 50, offset: number = 0): Promise<Trade[]> {
    try {
      logger.debug('Fetching user trades (Data API)', {
        fullUrl: `${this.dataBaseUrl}/trades`,
        params: { user: userAddress, limit, offset },
      });

      const response = await this.dataClient.get('/trades', {
        params: { user: userAddress, limit, offset, takerOnly: true },
      });

      const rows: any[] = Array.isArray(response.data) ? response.data : [];

      // Map Data API -> your src/types.ts Trade
      const mapped: Trade[] = rows.map((t: any) => ({
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

      logger.debug('Fetched user trades (Data API)', { userAddress, count: mapped.length });
      return mapped;
    } catch (error: any) {
      // IMPORTANT: pass an object (not the Error) so your logger prints config details
      logger.error(`Failed to fetch trades for ${userAddress}`, {
        status: error?.response?.status,
        baseURL: error?.config?.baseURL,
        url: error?.config?.url,
        fullUrl: `${error?.config?.baseURL ?? ''}${error?.config?.url ?? ''}`,
        params: error?.config?.params,
        responseData: error?.response?.data,
        message: error?.message,
      });
      throw error;
    }
  }

  /**
   * Health check - tries multiple endpoints
   */
  async healthCheck(): Promise<boolean> {
    const endpoints = ['/health', '/markets', '/'];

    for (const endpoint of endpoints) {
      try {
        const response = await this.clobClient.get(endpoint, { timeout: 5000 });
        if (response.status === 200 || response.status === 404) {
          logger.debug(`Health check passed on endpoint: ${endpoint}`);
          return true;
        }
      } catch {
        // ignore
      }
    }

    logger.warn('All health check endpoints failed, but API may still be reachable');
    return false;
  }
}

export default CLOBClient;
