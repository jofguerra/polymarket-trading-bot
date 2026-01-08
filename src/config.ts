import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Source trader to copy
  sourceTrader: process.env.SOURCE_TRADER || '',

  // Your wallet and API credentials
  funderAddress: process.env.FUNDER_ADDRESS || '',
  signerPrivateKey: process.env.SIGNER_PRIVATE_KEY || '',
  polyApiKey: process.env.POLY_API_KEY || '',
  polySecret: process.env.POLY_SECRET || '',
  polyPassphrase: process.env.POLY_PASSPHRASE || '',
  signatureType: parseInt(process.env.SIGNATURE_TYPE || '1', 10),

  // Trading parameters
  riskPercentage: parseFloat(process.env.RISK_PERCENTAGE || '2'),
  maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '1000'),
  slippageTolerance: parseFloat(process.env.SLIPPAGE_TOLERANCE || '0.5'),

  // API and network settings
  clobHttpUrl: process.env.CLOB_HTTP_URL || 'https://clob.polymarket.com',
  clobWsUrl: process.env.CLOB_WS_URL || 'wss://ws-subscriptions-clob.polymarket.com/ws',
  dataApiUrl: process.env.DATA_API_URL || 'https://data-api.polymarket.com',
  rpcUrl: process.env.RPC_URL || '',

  // Bot settings
  fetchInterval: parseInt(process.env.FETCH_INTERVAL || '1', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
};
