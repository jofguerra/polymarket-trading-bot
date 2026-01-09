import axios, { AxiosInstance } from 'axios';
import { logger } from '../logger';
import { config } from '../config';
import { Market, OrderBook, Order, Trade } from '../types';

export class CLOBClient {
  private clobClient: AxiosInstance;
  private dataClient: AxiosInstance;

  constructor() {
    // CLOB (leave it if you still want markets/orderbooks)
    const clobBase = (config.clobHttpUrl || 'https://clob.polymarket.com').replace(/\/+$/, '');
    this.clobClient = axios.create({ baseURL: clobBase, timeout: 10000 });

    // DATA API (this is what you need for copy-trading)
    const dataBase = (config.dataApiUrl || 'https://data-api.polymarket.com')
      .replace(/\/+$/, '')
      .replace(/\/trades$/, '');

    this.dataClient = axios.create({ baseURL: dataBase, timeout: 10000 });

    logger.info('HTTP clients ready', { clobBase, dataBase });
  }

  // --- Best-effort CLOB calls (may or may not exist depending on host) ---
  async getMarkets(): Promise<Market[]> {
    try {
      const res = await this.clobClient.get('/markets');
      return Array.isArray(res.data) ? res.data : [];
    } catch (e: any) {
      logger.warn('getMarkets failed (non-fatal)', {
        status: e?.response?.status,
        fullUrl: `${e?.config?.baseURL ?? ''}${e?.config?.url ?? ''}`,
      });
      return [];
    }
  }

  async getOrderBook(marketId: string): Promise<OrderBook> {
    const res = await this.clobClient.get(`/markets/${marketId}/orderbook`);
    return res.data;
  }

  // --- COPY TRADING: source trader fills (THIS MUST BE DATA API) ---
  async getUserTrades(userAddress: string, limit: number = 50, offset: number = 0): Promise<Trade[]> {
    try {
      const res = await this.dataClient.get('/trades', {
        params: { user: userAddress, limit, offset, takerOnly: true },
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
        fullUrl: `${e?.config?.baseURL ?? ''}${e?.config?.url ?? ''}`,
        params: e?.config?.params,
        responseData: e?.response?.data,
      });
      throw e;
    }
  }

  // --- STOP 404 SPAM: until you implement authenticated CLOB, do NOT call /users/<addr>/orders ---
  async getUserOrders(_userAddress: string): Promise<Order[]> {
    return [];
  }

  // Stub trading until you wire real authenticated Polymarket SDK
  async placeOrder(_order: any): Promise<Order> {
    logger.warn('placeOrder is stubbed (no real trading implemented yet).');
    return {
      id: `stub-${Date.now()}`,
      marketId: '',
      outcome: 0,
      side: 'BUY',
      price: 0,
      size: 0,
      timestamp: Date.now(),
      status: 'PENDING',
    } as any;
  }
}

export default CLOBClient;
