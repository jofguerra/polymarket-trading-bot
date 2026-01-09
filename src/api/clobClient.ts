import axios, { AxiosInstance } from 'axios';
import { logger } from '../logger';
import { config } from '../config';
import { Market, OrderBook, Order, Trade } from '../types';

export class CLOBClient {
  private clobClient: AxiosInstance;
  private dataClient: AxiosInstance;
  private dataBase: string;

  constructor() {
    const clobBase = (config.clobHttpUrl || 'https://clob.polymarket.com').replace(/\/+$/, '');
    this.clobClient = axios.create({ baseURL: clobBase, timeout: 10000 });

    // IMPORTANT: Data API base
    this.dataBase = (config.dataApiUrl || 'https://data-api.polymarket.com')
      .replace(/\/+$/, '')
      .replace(/\/trades$/, '');

    this.dataClient = axios.create({ baseURL: this.dataBase, timeout: 10000 });

    logger.info('HTTP clients ready', { clobBase, dataBase: this.dataBase });
  }

  // Best-effort CLOB calls (optional)
  async getMarkets(): Promise<Market[]> {
    try {
      const res = await this.clobClient.get('/markets');
      return Array.isArray(res.data) ? res.data : [];
    } catch (e: any) {
      logger.warn('getMarkets failed (non-fatal)', { status: e?.response?.status });
      return [];
    }
  }

  async getOrderBook(marketId: string): Promise<OrderBook> {
    const res = await this.clobClient.get(`/markets/${marketId}/orderbook`);
    return res.data;
  }

  // ✅ COPY TRADING: use DATA API (this is the fix)
  async getUserTrades(userAddress: string, limit: number = 50, offset: number = 0): Promise<Trade[]> {
    const url = `${this.dataBase}/trades`;

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
      });
      throw e;
    }
  }

  // ✅ prevent orders 404 spam (until you implement authenticated CLOB)
  async getUserOrders(_userAddress: string): Promise<Order[]> {
    return [];
  }

  // Stub trading
  async placeOrder(_order: any): Promise<Order> {
    logger.warn('placeOrder is stubbed (no real trading yet).');
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

