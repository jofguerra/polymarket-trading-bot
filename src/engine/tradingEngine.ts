import { config } from '../config.js';
import { logger } from '../logger.js';
import { getUserTrades, placeOrder } from '../api/clobClient.js';
import { Trade } from '../types.js';

let lastProcessedTimestamp = 0;

// Dedupe repeated Data API rows (very common)
const seen = new Set<string>();
const MAX_SEEN = 10000;

function tradeKey(t: Trade): string {
  if (t.orderId) return t.orderId; // tx hash
  return `${t.marketId}:${t.tokenId}:${t.side}:${t.price}:${t.size}:${t.timestamp}`;
}

export const monitorAndCopyTrades = async (): Promise<void> => {
  try {
    const trades: Trade[] = await getUserTrades(config.sourceTrader, 100, 0);

    if (!trades.length) {
      logger.debug('No trades found for source trader');
      return;
    }

    // Keep >= to not miss same-second fills; dedupe prevents repeats
    const candidates = trades.filter((t: Trade) => t.timestamp >= lastProcessedTimestamp);

    const newTrades: Trade[] = candidates.filter((t: Trade) => {
      const key = tradeKey(t);
      if (seen.has(key)) return false;
      seen.add(key);
      if (seen.size > MAX_SEEN) seen.clear();
      return true;
    });

    if (!newTrades.length) {
      logger.debug('No new trades to copy');
      return;
    }

    newTrades.sort((a: Trade, b: Trade) => a.timestamp - b.timestamp);

    logger.info(`Copying ${newTrades.length} new trades (from ${config.sourceTrader})`);

    for (const t of newTrades) {
      await executeCopyTrade(t);
      lastProcessedTimestamp = Math.max(lastProcessedTimestamp, t.timestamp);
    }
  } catch (error) {
    logger.error('Error in monitorAndCopyTrades', error);
  }
};

const executeCopyTrade = async (sourceTrade: Trade): Promise<void> => {
  try {
    if (!sourceTrade.tokenId || sourceTrade.tokenId.length < 10) {
      logger.warn('Skipping trade: missing/invalid tokenId', {
        tokenId: sourceTrade.tokenId,
        marketId: sourceTrade.marketId,
        orderId: sourceTrade.orderId
      });
      return;
    }

    const scaledSize = sourceTrade.size * (config.riskPercentage / 100);
    const cappedSize = Math.min(scaledSize, config.maxPositionSize);

    if (cappedSize <= 0) return;

    const adjustedPrice = adjustPriceForSlippage(sourceTrade.price, sourceTrade.side);

    logger.info('Placing order', {
      tokenId: sourceTrade.tokenId,
      side: sourceTrade.side,
      size: cappedSize,
      price: adjustedPrice
    });

    // ✅ tokenId is what you actually trade
    await placeOrder(sourceTrade.tokenId, sourceTrade.side, adjustedPrice, cappedSize);
  } catch (error) {
    logger.error('Failed to execute copy trade', error);
  }
};

const adjustPriceForSlippage = (midPrice: number, side: 'BUY' | 'SELL'): number => {
  const slippageAdjustment = midPrice * (config.slippageTolerance / 100);
  return side === 'BUY' ? midPrice + slippageAdjustment : Math.max(0, midPrice - slippageAdjustment);
};
