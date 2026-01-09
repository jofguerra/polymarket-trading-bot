import dotenv from 'dotenv';

dotenv.config();

function mustEnv(name: string, val: string): string {
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const config = {
  // Source trader to copy (must be a proxy wallet / address that appears in Data API trades)
  sourceTrader: mustEnv('SOURCE_TRADER', process.env.SOURCE_TRADER || ''),

  // Wallet / signer settings for REAL trading (CLOB SDK)
  funderAddress: process.env.FUNDER_ADDRESS || '', // should be your proxy wallet that holds USDC
  signerPrivateKey: mustEnv('SIGNER_PRIVATE_KEY', process.env.SIGNER_PRIVATE_KEY || ''),

  // Optional (not required if you use createOrDeriveApiKey in clobClient.ts)
  polyApiKey: process.env.POLY_API_KEY || '',
  polySecret: process.env.POLY_SECRET || '',
  polyPassphrase: process.env.POLY_PASSPHRASE || '',

  // 0 = EOA, 1 = Polymarket Proxy, 2 = Polymarket Gnosis Safe Proxy
  signatureType: parseInt(process.env.SIGNATURE_TYPE || '1', 10),

  // Trading parameters
  riskPercentage: parseFloat(process.env.RISK_PERCENTAGE || '2'),
  maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '1000'),
  slippageTolerance: parseFloat(process.env.SLIPPAGE_TOLERANCE || '0.5'),

  // API / network settings
  clobHttpUrl: process.env.CLOB_HTTP_URL || 'https://clob.polymarket.com',
  clobWsUrl: process.env.CLOB_WS_URL || 'wss://ws-subscriptions-clob.polymarket.com/ws',
  dataApiUrl: process.env.DATA_API_URL || 'https://data-api.polymarket.com',
  rpcUrl: process.env.RPC_URL || '',

  // Bot settings (use 5s by default to avoid spamming)
  fetchInterval: parseInt(process.env.FETCH_INTERVAL || '5', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
};
