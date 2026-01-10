export interface Market {
  id: string;
  question: string;
  description?: string;
  outcomes: string[];
  outcomeTokens: string[];
  creationTime: number;
  resolutionTime?: number;
  status: 'active' | 'resolved' | 'closed';
}

export interface OrderBook {
  marketId: string;
  bids: PriceLevel[];
  asks: PriceLevel[];
  timestamp: number;
}

export interface PriceLevel {
  price: number;
  size: number;
}

export interface Order {
  id: string;
  marketId: string;
  outcome: number;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  timestamp: number;
  status: 'PENDING' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED';
  filledSize?: number;
}

export interface Trade {
  id: string;
  orderId: string;       // transactionHash
  marketId: string;      // conditionId
  tokenId: string;       // asset (this is what you trade)
  outcome: number;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  timestamp: number;
  traderAddress: string; // proxyWallet
}

export interface Position {
  marketId: string;
  outcome: number;
  balance: number;
  value: number;
  timestamp: number;
}

export interface UserActivity {
  traderAddress: string;
  trades: Trade[];
  positions: Position[];
  lastUpdated: number;
}

export interface CopyTradingConfig {
  sourceTrader: string;
  maxOrderSize: number;
  minOrderSize: number;
  riskPercentage: number;
  enabled: boolean;
  lastSync: number;
}

export interface BotState {
  isRunning: boolean;
  lastUpdate: number;
  ordersPlaced: number;
  totalVolume: number;
  activePositions: number;
  errors: string[];
}
