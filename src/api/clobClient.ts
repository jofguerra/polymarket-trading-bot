import axios, { AxiosInstance } from 'axios';
import { logger } from '../logger.js';
import { config } from '../config.js';
import { Market, OrderBook, Order, Trade } from '../types.js';

import { ClobClient, Side } from '@polymarket/clob-client';
import { Wallet } from 'ethers';

// HTTP clients
let clobHttp: AxiosInstance | null = null;
let dataHttp: AxiosInstance | null = null;
let dataBase = 'https://data-api.polymarket.com';

// Trading client (authenticated SDK)
let tradingClient: ClobClient | null = null;

function normalizeBase(u: string): string {
  return u.replace(/\/+$/, '').replace(/\/trades$/, '');
}

function pkWith0x(pk: string): string {
  if (!pk) return pk;
  return pk.startsWith('0x') ? pk : `0x${pk}`;
}

export function initializeClobClient(): void {
  const clobBase = normalizeBase(config.clobHttpUrl || 'https://clob.polymarket.com');
  dataBase = normalizeBase(config.dataApiUrl || 'https://data-api.polymarket.com');

  clobHttp = axios.create({ baseURL: clobBase, timeout: 10000 });
  dataHttp = axios.create({ baseURL: dataBase, timeout: 10000 });

  logger.info('HTTP clients initialized', { clobBase, dataBase });
}

async function getTradingClient(): Promise<ClobClient> {
  if (tradingClient) return tradingClient;

  const host = normalizeBase(config.clobHttpUrl || 'https://clob.polymarket.com');
  const chainId = 137;

  const signer = new Wallet(pkWith0x(config.signerPrivateKey));

  // derive/ensure API creds
  const temp = new ClobClient(host, chainId, signer);
  const apiCreds = await temp.createOrDeriveApiKey();

  const funderAddress = config.funderAddress || signer.address;
  const signatureType = Number.isFinite(config.signatureType) ? config.signatureType : 1;

  tradingClient = new ClobClient(host, chainId, signer, apiCreds, signatureType, funderAddress);

  logger.info('Trading client initialized', {
    host,
    chainId,
    signer: signer.address,
    funderAddress,
    signatureType
  });

  return tradingClient;
}

export async function getUserTrades(userAddress: string, limit: number = 50, offset: number = 0): Promise<Trade[]> {
  if (!dataHttp) initializeClobClient();

  const url = `${dataBase}/trades`;

  const res = await axios.get(url, {
    params: { user: userAddress, limit, offset, takerOnly: true },
    timeout: 10000
  });

  const rows: any[] = Array.isArray(res.data) ? res.data : [];

  return rows.map((t: any) => ({
    id: `${t.transactionHash}:${t.asset}:${t.timestamp}`,
    orderId: String(t.transactionHash ?? ''),
    marketId: String(t.conditionId ?? ''),
    tokenId: String(t.asset ?? ''),
    outcome: Number(t.outcomeIndex ?? 0),
    side: String(t.side ?? 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
    price: typeof t.price === 'string' ? parseFloat(t.price) : Number(t.price ?? 0),
    size: typeof t.size === 'string' ? parseFloat(t.size) : Number(t.size ?? 0),
    timestamp: Number(t.timestamp ?? 0),
    traderAddress: String(t.proxyWallet ?? userAddress)
  }));
}

export async function placeOrder(
  tokenId: string,
  side: 'BUY' | 'SELL',
  price: number,
  size: number
): Promise<{ success: boolean; orderID?: string }> {
  const client = await getTradingClient();

  if (!tokenId || tokenId.length < 10) throw new Error(`Invalid tokenId: ${tokenId}`);
  if (!(price > 0 && price < 1)) throw new Error(`Invalid price: ${price}`);
  if (!(size > 0)) throw new Error(`Invalid size: ${size}`);

  const res: any = await client.createAndPostOrder({
    tokenID: tokenId,
    side: side === 'BUY' ? Side.BUY : Side.SELL,
    price,
    size
  });

  logger.info('Order submitted', { tokenId, side, price, size, orderID: res?.orderID ?? res?.id });

  return { success: true, orderID: res?.orderID ?? res?.id };
}

// Optional class wrapper
export class CLOBClient {
  async getMarkets(): Promise<Market[]> {
    if (!clobHttp) initializeClobClient();
    try {
      const res = await clobHttp!.get('/markets');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  }

  async getOrderBook(marketId: string): Promise<OrderBook> {
    if (!clobHttp) initializeClobClient();
    const res = await clobHttp!.get(`/markets/${marketId}/orderbook`);
    return res.data;
  }

  async getUserTrades(userAddress: string, limit = 50, offset = 0): Promise<Trade[]> {
    return getUserTrades(userAddress, limit, offset);
  }

  async getUserOrders(_userAddress: string): Promise<Order[]> {
    return [];
  }

  async placeOrder(order: { tokenId: string; side: 'BUY' | 'SELL'; price: number; size: number }) {
    return placeOrder(order.tokenId, order.side, order.price, order.size);
  }
}

export default CLOBClient;
