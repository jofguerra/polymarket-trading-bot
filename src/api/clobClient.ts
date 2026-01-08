import axios, { AxiosInstance } from 'axios';
import { ClobClient, ApiKeyCreds, OrderType, Side } from '@polymarket/clob-client';
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
      apiKey: config.polyApiKey,
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

    logger.info('ClobClient and Data API client initialized successfully');
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

    const { data } = await dataClient.get('/trades', {
      params: { user, limit, offset, takerOnly: true },
    });

    // Map Data API response to Trade interface
    return data.map((t: any) => ({
      id: `${t.transactionHash}:${t.timestamp}`,
      orderId: t.transactionHash,
      marketId: t.conditionId,
      outcome: t.outcomeIndex,
      side: t.side as 'BUY' | 'SELL',
      price: parseFloat(t.price),
      size: parseFloat(t.size),
      timestamp: t.timestamp,
      traderAddress: t.proxyWallet,
    }));
  } catch (error) {
    logger.error('Failed to fetch user trades from Data API', error);
    return [];
  }
};

/**
 * Place an order using the CLOB SDK
 */
export const placeOrder = async (market: string, side: Side, price: number, size: number) => {
  try {
    const client = getClobClient();
    const order = {
      market,
      side,
      price,
      size,
    };

    // You might need to fetch tickSize and negRisk from somewhere
    // For now, using placeholders
    const marketInfo = { tickSize: '0.01', negRisk: false };

    const response = await client.createAndPostOrder(order, marketInfo, OrderType.GTC);
    logger.info('Order placed successfully', { response });
    return response;
  } catch (error) {
    logger.error('Failed to place order', error);
    throw error;
  }
};
