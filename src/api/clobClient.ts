import axios, { AxiosInstance } from 'axios';
import { logger } from '../logger';
import { config } from '../config';
import { Market, OrderBook, Order, Trade } from '../types';

// Polymarket CLOB SDK
import { ClobClient, Side } from '@polymarket/clob-client';
// ethers v5
import { Wallet } from 'ethers';

/**
 * Copy-trading reads come from Data API:
 *   https://data-api.polymarket.com/trades?user=<proxyWallet>
 *
 * Trading (placing orders) uses Polymarket CLOB SDK:
 *   createOrDeriveApiKey() + createAndPostOrder()
 */

// ----------------------
// Shared clients
// ----------------------
let clobHttp: AxiosInstance | null = null;
let dataHttp: AxiosInstance | null = null;
let dataBase = 'https://data-api.polymarket.com';

// SDK trading client (authenticated)
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

/**
 * Lazy-init authenticated trading client (CLOB SDK)
 */
async function getTradingClient(): Promise<ClobClient> {
  if (tradingClient) return tradingClient;

  const host = normalizeBase(config.clobHttpUrl || 'https://clob.polymarket.com');
  const chainId = 137; // Polygon

  if (!config.signerPrivateKey) {
    throw new Error('Missing SIGNER_PRIVATE_KEY in environment variables');
  }

  // Signer (EOA private key)
  const signer = new Wallet(pkWith0x(config.signerPrivateKey));

  // Recommended: derive API creds from signer
  const tempClient = new ClobClient(host, chainId, signer);
  const apiCreds = await tempClient.createOrDeriveApiKey();

  // funderAddress should be the Polymarket "proxy wallet" that holds your USDC and positions
  const funderAddress = config.funderAddress || signer.address;

  // signatureType:
  // 0 = EOA
  // 1 = Polymarket Proxy
  // 2 = Polymarket Gnosis Safe Proxy
  const signatureType = Number.isFinite(config.signatureType) ? config.signatureType : 1;

  tradingClient = new ClobClient(
    host,
    chainId,
    signer,
    apiCreds,
    signatureType,
    funderAddress
  );

  logger.info('Trading client initialized', {
    host,
    chainId,
    signer: signer.address,
    funderAddress,
    signatureType
  });

  return tradingClient;
}

// ----------------------
// Function exports (used by bot.ts / tradingEngine.ts)
// ----------------------

export async function getUserTrades(
  userAddress: string,
  limit: number = 50,
  offset: number = 0
): Promise<Trade[]> {
  if (!dataHttp) initializeClobClient();

  const url = `${dataBase}/trades`;

  try {
    const res = await axios.get(url, {
      params: { user: userAddress, limit, offset, takerOnly: true },
      timeout: 10000,
    });

    const rows: any[] = Array.isArray(res.data) ? res.data : [];

    return rows.map((t: any) => ({
      id: `${t.transactionHash}:${t.asset}:${t.timestamp}`,
      orderId: String(t.transactionHash ?? ''),      // tx hash
      marketId: String(t.conditionId ?? ''),         // conditionId
      tokenId: String(t.asset ?? ''),                // ✅ asset/tokenID (needed to trade)
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

/**
 * Place a real order on Polymarket CLOB
 * tokenId MUST be the "asset" from Data API
 */
export async function placeOrder(
  tokenId: string,
  side: 'BUY' | 'SELL',
  price: number,
  size: number
): Promise<{ success: boolean; orderID?: string }> {
  const client = await getTradingClient();

  // Polymarket requires price in [0,1] and positive size
  if (!tokenId || tokenId.length < 10) throw new Error(`Invalid tokenId: ${tokenId}`);
  if (price <= 0 || price >= 1) throw new Error(`Invalid price: ${price}`);
  if (size <= 0) throw new Error(`Invalid size: ${size}`);

  const res: any = await client.createAndPostOrder({
    tokenID: tokenId,
    side: side === 'BUY' ? Side.BUY : Side.SELL,
    price,
    size
  });

  logger.info('Order submitted', {
    tokenId,
    side,
    price,
    size,
    orderID: res?.orderID ?? res?.id ?? undefined
  });

  return { success: true, orderID: res?.orderID ?? res?.id ?? undefined };
}

// ----------------------
// Class wrapper (optional)
// ----------------------
export class CLOBClient {
  async getMarkets(): Promise<Market[]> {
    if (!clobHttp) initializeClobClient();
    try {
      const res = await clobHttp!.get('/markets');
      return Array.isArray(res.data) ? res.data : [];
    } catch (e: any) {
      logger.warn('getMarkets failed (non-fatal)', { status: e?.response?.status });
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

  // You can implement this later with authenticated SDK calls if needed
  async getUserOrders(_userAddress: string): Promise<Order[]> {
    return [];
  }

  async placeOrder(order: { tokenId: string; side: 'BUY' | 'SELL'; price: number; size: number }): Promise<{ success: boolean; orderID?: string }> {
    return placeOrder(order.tokenId, order.side, order.price, order.size);
  }
}

export default CLOBClient;
