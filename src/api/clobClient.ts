// ============================================================================
// EXACT DROP-IN REPLACEMENT FOR YOUR src/api/clobClient.ts
// ============================================================================
// This replaces the entire file with the corrected CLOBClient class
// that uses the Data API for fetching user trades instead of the broken
// /users/{address}/trades endpoint.
// ============================================================================

import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../logger';

export interface Trade {
  id: string;
  orderId: string;
  marketId: string;
  outcome: number;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  timestamp: number;
  traderAddress: string;
}

export class CLOBClient {
  private baseUrl: string;
  private client: AxiosInstance;
  private dataClient: AxiosInstance; // ← NEW: Data API client

  constructor() {
    this.baseUrl = config.clobHttpUrl;
    
    // CLOB API client (for placing orders, etc.)
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });

    // Data API client (for fetching trades) ← NEW
    const dataBase = (process.env.DATA_API_URL || 'https://data-api.polymarket.com').replace(/\/+$/, '');
    this.dataClient = axios.create({
      baseURL: dataBase,
      timeout: 10000,
    });

    logger.info('CLOBClient initialized', { 
      clobHttpUrl: this.baseUrl, 
      dataApiUrl: dataBase 
    });
  }

  /**
   * FIXED: Fetch trades for a specific user using the Data API
   * (NOT the broken /users/{address}/trades endpoint)
   */
  async getUserTrades(userAddress: string, limit: number = 50, offset: number = 0): Promise<Trade[]> {
    try {
      logger.debug('Fetching trades from Data API', { userAddress, limit, offset });

      const res = await this.dataClient.get('/trades', {
        params: { 
          user: userAddress,  // ← REQUIRED parameter
          limit, 
          offset 
        },
      });

      logger.debug('Data API response received', { 
        userAddress, 
        count: res.data?.length ?? 0 
      });

      // Map Data API response to Trade interface
      const trades = res.data.map((t: any) => ({
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

      return trades;
    } catch (err: any) {
      logger.error(`Failed to fetch trades for ${userAddress}`, {
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        baseURL: err?.config?.baseURL,
        url: err?.config?.url,
        fullUrl: `${err?.config?.baseURL ?? ''}${err?.config?.url ?? ''}`,
        params: err?.config?.params,
        responseData: err?.response?.data,
      });
      throw err;
    }
  }

  /**
   * Get the base URL for the CLOB API
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get the axios client for making requests
   */
  getClient(): AxiosInstance {
    return this.client;
  }

  /**
   * Get the Data API client
   */
  getDataClient(): AxiosInstance {
    return this.dataClient;
  }
}

export default CLOBClient;
