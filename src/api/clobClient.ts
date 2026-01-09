import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../logger';
import { Trade } from '../types';

let dataClient: AxiosInstance;

export const initializeClobClient = () => {
  try {
    // Initialize Data API client for fetching trades
    dataClient = axios.create({
      baseURL: config.dataApiUrl,
      timeout: 10000,
    });

    logger.info('Data API client initialized successfully', {
      dataApiUrl: config.dataApiUrl,
    });
  } catch (error) {
    logger.error('Failed to initialize Data API client', error);
    throw error;
  }
};

/**
 * Fetch trades for a specific user from the Data API
 * Maps Data API response to our Trade interface
 * Version: 2.1 - Added detailed logging to debug URL issues
 */
export const getUserTrades = async (user: string, limit = 50, offset = 0): Promise<Trade[]> => {
  try {
    if (!dataClient) {
      logger.error('Data API client not initialized');
      return [];
    }

    const params = { 
      user,           // REQUIRED: User Profile Address
      limit,          // Number of trades to fetch
      offset,         // Pagination offset
      takerOnly: true // Only fetch taker trades
    };

    // Log the exact URL being called
    logger.info('getUserTrades request', {
      baseURL: dataClient?.defaults?.baseURL,
      path: '/trades',
      params,
      fullUrl: `${dataClient?.defaults?.baseURL ?? ''}/trades?user=${user}&limit=${limit}&offset=${offset}`
    });

    const { data } = await dataClient.get('/trades', { params });

    logger.info('Data API response received', { 
      tradeCount: data.length
    });

    // Map Data API response to Trade interface
    const trades = data.map((t: any) => ({
      id: `${t.transactionHash}:${t.timestamp}`,
      orderId: t.transactionHash,
      marketId: t.conditionId,
      outcome: t.outcomeIndex,
      side: t.side as 'BUY' | 'SELL',
      price: typeof t.price === 'string' ? parseFloat(t.price) : t.price,
      size: typeof t.size === 'string' ? parseFloat(t.size) : t.size,
      timestamp: t.timestamp,
      traderAddress: t.proxyWallet,
    }));

    logger.debug('Trades mapped successfully', { mappedCount: trades.length });
    return trades;
  } catch (error: any) {
    logger.error('getUserTrades failed', {
      status: error?.response?.status,
      baseURL: error?.config?.baseURL,
      url: error?.config?.url,
      fullUrl: `${error?.config?.baseURL ?? ''}${error?.config?.url ?? ''}`,
      params: error?.config?.params,
      responseData: error?.response?.data,
    });
    return [];
  }
};

/**
 * Stub: Get user orders (disabled until proper CLOB auth is implemented)
 * Returns empty array to avoid 404 spam
 */
export const getUserOrders = async (_user: string) => {
  return [];
};

/**
 * Placeholder for order placement
 * In production, this would use the CLOB SDK to place orders
 */
export const placeOrder = async (market: string, side: string, price: number, size: number) => {
  try {
    logger.info('Order placement logged', {
      market,
      side,
      price,
      size,
    });
    return { success: true, market, side, price, size };
  } catch (error) {
    logger.error('Failed to place order', error);
    throw error;
  }
};
