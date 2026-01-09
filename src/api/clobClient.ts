import axios, { AxiosInstance } from 'axios';
import { ClobClient, ApiKeyCreds, Side } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import { config } from '../config';
import { logger } from '../logger';
import { Trade } from '../types';

const HOST = config.clobHttpUrl;
const CHAIN_ID = 137; // Polygon

let clob: ClobClient;
let dataClient: AxiosInstance;

export const initializeClobClient = () => {
  try {
    const signer = new Wallet(config.signerPrivateKey);

    const apiCreds: ApiKeyCreds = {
      key: config.polyApiKey,
      secret: config.polySecret,
      passphrase: config.polyPassphrase,
    };

    clob = new ClobClient(
      HOST,
      CHAIN_ID,
      signer,
      apiCreds,
      config.signatureType,
      config.funderAddress
    );

    // Initialize Data API client
    dataClient = axios.create({
      baseURL: config.dataApiUrl,
      timeout: 10000,
    });

    logger.info('ClobClient and Data API client initialized successfully', {
      clobUrl: HOST,
      dataApiUrl: config.dataApiUrl,
      chainId: CHAIN_ID,
    });
  } catch (error) {
    logger.error('Failed to initialize ClobClient', error);
    throw error;
  }
};

export const getClobClient = (): ClobClient => {
  if (!clob) {
    throw new Error('ClobClient not initialized. Call initializeClobClient() first.');
  }
  return clob;
};

/**
 * Fetch trades for a specific user from the Data API
 * Maps Data API response to our Trade interface
 */
export const getUserTrades = async (user: string, limit = 50, offset = 0): Promise<Trade[]> => {
  try {
    if (!dataClient) {
      throw new Error('Data API client not initialized');
    }

    const params = { 
      user,      // Required: User Profile Address
      limit,     // Number of trades to fetch
      offset,    // Pagination offset
      takerOnly: true  // Only fetch taker trades
    };

    // Log the exact URL and parameters being used
    const fullUrl = `${config.dataApiUrl}/trades?${new URLSearchParams(params as any).toString()}`;
    logger.info('Fetching trades from Data API', { 
      fullUrl,
      baseURL: config.dataApiUrl,
      endpoint: '/trades',
      params 
    });

    const { data } = await dataClient.get('/trades', { params });

    logger.info('Data API response received', { 
      tradeCount: data.length,
      firstTrade: data.length > 0 ? data[0] : null
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
    logger.error('Failed to fetch user trades from Data API', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      params: error.config?.params,
      fullUrl: error.config?.baseURL + error.config?.url,
      baseURL: error.config?.baseURL,
    });
    return [];
  }
};

/**
 * Place an order using the CLOB SDK
 */
export const placeOrder = async (market: string, side: Side, price: number, size: number) => {
  try {
    // Ensure CLOB client is initialized
    getClobClient();
    
    logger.info('Attempting to place order', {
      market,
      side,
      price,
      size,
    });

    // The CLOB SDK has different methods for placing orders
    // For now, we'll log the order intent
    // In production, you would use the appropriate SDK method
    logger.info('Order placement would be executed here', {
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
