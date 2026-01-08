import axios from 'axios';
import { config } from '../config';
import { logger } from '../logger';
import { placeOrder } from '../api/clobClient';
import { Side } from '@polymarket/clob-client';

interface TradeActivity {
  id: string;
  type: string;
  user: string;
  timestamp: string;
  trade_type: string;
  collateral: string;
  fee: string;
  price: string;
  size: string;
  market: string;
  outcome: string;
  tx_hash: string;
}

let lastProcessedTimestamp = new Date(0);

const fetchSourceTraderActivity = async (): Promise<TradeActivity[]> => {
  try {
    const response = await axios.get(`${config.dataApiUrl}/activity`, {
      params: {
        user: config.sourceTrader,
        type: 'TRADE',
        limit: 100,
      },
    });
    return response.data.data;
  } catch (error) {
    logger.error('Failed to fetch source trader activity', error);
    return [];
  }
};

const getMarketDetails = async (marketId: string) => {
  // This is a placeholder - you need to implement a way to get market details
  // like tickSize and negRisk, possibly from another API or a hardcoded map.
  return { tickSize: '0.01', negRisk: false };
};

export const monitorAndCopyTrades = async () => {
  logger.info('Checking for new trades to copy...');
  const activities = await fetchSourceTraderActivity();

  const newActivities = activities.filter(
    (activity) => new Date(activity.timestamp) > lastProcessedTimestamp
  );

  if (newActivities.length === 0) {
    logger.info('No new trades found.');
    return;
  }

  // Sort by timestamp to process in order
  newActivities.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  for (const activity of newActivities) {
    try {
      const tradeSize = parseFloat(activity.size);
      const tradePrice = parseFloat(activity.price);
      const side = activity.trade_type.toUpperCase() as Side;

      // Apply risk management
      const yourTradeSize = tradeSize * (config.riskPercentage / 100);
      const cappedTradeSize = Math.min(yourTradeSize, config.maxPositionSize);

      if (cappedTradeSize > 0) {
        logger.info(`Copying trade: ${side} ${cappedTradeSize} at ${tradePrice} on market ${activity.market}`);
        
        // You need to map the market ID from the activity to the token ID for the order
        // This is a placeholder - you'll need to implement this mapping
        const marketTokenId = activity.market; // Placeholder

        await placeOrder(marketTokenId, side, tradePrice, cappedTradeSize);
      }

      lastProcessedTimestamp = new Date(activity.timestamp);
    } catch (error) {
      logger.error(`Failed to copy trade ${activity.id}`, error);
    }
  }
};
