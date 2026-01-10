import dotenv from 'dotenv';

dotenv.config();

function mustEnv(name: string, val: string): string {
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const config = {
  // Who to copy
  sourceTrader: mustEnv('SOURCE_TRADER', process.env.SOURCE_TRADER || ''),

  // Trading (required for real orders)
  funderAddress: process.env.FUNDER_ADDRESS || '',
  signerPrivateKey: mustEnv('SIGNER_PRIVATE_KEY', process.env.SIGNER_PRIVATE_KEY || ''),

  // Optional (not required if using createOrDeriveApiKey)
  polyApiKey: process.env.POLY_API_KEY || '',
  polySecret: process.env.POLY_SECRET || '',
  polyPassphrase: process.env.POLY_PASSPHRASE || '',

  // 0=EOA, 1=Polymarket Proxy, 2=Gnosis Safe proxy
  signatureType: parseInt(process.env.SIGNATURE_TYPE || '1', 10),

  // Risk
  riskPercentage: parseFloat(process.env.RISK_PERCENTAGE || '2'),
  maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '1000'),
  slippageTolerance: parseFloat(process.env.SLIPPAGE_TOLERANCE || '0.5'),

  // Endpoints
  clobHttpUrl: process.env.CLOB_HTTP_URL || 'https://clob.polymarket.com',
  clobWsUrl: process.env.CLOB_WS_URL || 'wss://ws-subscriptions-clob.polymarket.com/ws',
  dataApiUrl: process.env.DATA_API_URL || 'https://data-api.polymarket.com',
  rpcUrl: process.env.RPC_URL || '',

  // Bot
  fetchInterval: parseInt(process.env.FETCH_INTERVAL || '5', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
};
