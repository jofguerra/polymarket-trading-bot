import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  // Wallet Configuration
  userAddress: string;
  proxyWallet: string;
  privateKey: string;

  // API Endpoints
  clobHttpUrl: string;
  clobWsUrl: string;

  // Trading Parameters
  fetchInterval: number;
  tooOldTimestamp: number;
  retryLimit: number;

  // Database
  mongoUri: string;

  // Blockchain
  rpcUrl: string;
  usdcContractAddress: string;

  // Trading Config
  maxPositionSize: number;
  riskPercentage: number;
  slippageTolerance: number;

  // Logging
  logLevel: string;
}

function getEnvVariable(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue || '';
}

export const config: Config = {
  // Wallet Configuration
  userAddress: getEnvVariable('USER_ADDRESS'),
  proxyWallet: getEnvVariable('PROXY_WALLET'),
  privateKey: getEnvVariable('PRIVATE_KEY'),

  // API Endpoints
  clobHttpUrl: getEnvVariable('CLOB_HTTP_URL', 'https://clob.polymarket.com/'),
  clobWsUrl: getEnvVariable('CLOB_WS_URL', 'wss://ws-subscriptions-clob.polymarket.com/ws'),

  // Trading Parameters
  fetchInterval: parseInt(getEnvVariable('FETCH_INTERVAL', '1'), 10),
  tooOldTimestamp: parseInt(getEnvVariable('TOO_OLD_TIMESTAMP', '3600'), 10),
  retryLimit: parseInt(getEnvVariable('RETRY_LIMIT', '3'), 10),

  // Database
  mongoUri: getEnvVariable('MONGO_URI', ''),

  // Blockchain
  rpcUrl: getEnvVariable('RPC_URL', ''),
  usdcContractAddress: getEnvVariable('USDC_CONTRACT_ADDRESS', '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'),

  // Trading Config
  maxPositionSize: parseInt(getEnvVariable('MAX_POSITION_SIZE', '1000'), 10),
  riskPercentage: parseFloat(getEnvVariable('RISK_PERCENTAGE', '2')),
  slippageTolerance: parseFloat(getEnvVariable('SLIPPAGE_TOLERANCE', '0.5')),

  // Logging
  logLevel: getEnvVariable('LOG_LEVEL', 'info'),
};

export default config;
