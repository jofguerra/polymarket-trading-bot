import { ClobClient, ApiKeyCreds, OrderType, Side } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import { config } from '../config';
import { logger } from '../logger';

const HOST = config.clobHttpUrl;
const CHAIN_ID = 137; // Polygon

let clob: ClobClient;

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
    logger.info('ClobClient initialized successfully');
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

// Example function to place an order
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
