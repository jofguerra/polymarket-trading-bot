import { config } from '../config';
import { logger } from '../logger';
import { getUserTrades, placeOrder } from '../api/clobClient';
import { Trade } from '../types';

let lastProcessedTimestamp = 0;

// Dedup set to prevent executing same trade repeatedly (Data API can return duplicates)
const seen = new Set<string>();
const MAX_SEEN = 10000;

function tradeKey(t: Trade): string {
  // Primary dedupe: tx hash (you mapped orderId = transactionHash)
  if (t.orderId) return t.orderId;

  // Fallback (should rarely be used)
  return `${t.marketId}:${t.tokenId}:${t.side}:${t.price}:${t.size}:${t.timestamp}`;
}

/**
 * Monitor source trader and copy their trades
 */
export const monitorAndCopyTrades = async (): Promise<void> => {
  try {
    logger.debug('Polling source trader for trades...');

    const trades: Trade[] = await getUserTrades(config.sourceTrader, 100, 0);

    if (!trades.length) {
      logger.debug('No trades found for source trader');
      return;
    }

    // Keep equal timestamp trades if they are new (dedupe handles repeats)
    const candidates = trades.filter((t: Trade) => t.timestamp >= lastProcessedTimestamp);

    const newTrades: Trade[] = candidates.filter((t: Trade) => {
      const key = tradeKey(t);
      if (seen.has(key)) return false;
      seen.add(key);

      if (seen.size > MAX_SEEN) {
        // simple prune to avoid unbounded growth
        seen.clear();
      }
      return true;
    });

    if (!newTrades.length) {
      logger.debug('No new trades to copy');
      return;
    }

    // Sort by timestamp to process oldest first
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

/**
 * Execute a copy trade based on source trader's trade
 */
const executeCopyTrade = async (sourceTrade: Trade): Promise<void> => {
  try {
    // You MUST place orders by tokenId (asset), not conditionId
    if (!sourceTrade.tokenId || sourceTrade.tokenId.length < 10) {
      logger.warn('Skipping trade: missing/invalid tokenId', {
        tokenId: sourceTrade.tokenId,
        marketId: sourceTrade.marketId,
        orderId: sourceTrade.orderId
      });
      return;
    }

    // Scale/cap size
    const scaledSize = sourceTrade.size * (config.riskPercentage / 100);
    const cappedSize = Math.min(scaledSize, config.maxPositionSize);

    if (cappedSize <= 0) {
      logger.debug('Skipping trade: size <= 0 after scaling', { scaledSize, cappedSize });
      return;
    }

    // Slippage adjustment
    const adjustedPrice = adjustPriceForSlippage(sourceTrade.price, sourceTrade.side);

    // Reduce per-trade log spam
    logger.debug('Placing copy order', {
      tokenId: sourceTrade.tokenId,
      marketId: sourceTrade.marketId,
      side: sourceTrade.side,
      size: cappedSize,
      price: adjustedPrice,
      tx: sourceTrade.orderId
    });

    await placeOrder(
      sourceTrade.tokenId, // ✅ tokenId (asset)
      sourceTrade.side,    // 'BUY' | 'SELL'
      adjustedPrice,
      cappedSize
    );

    logger.debug('Copy order submitted', {
      tokenId: sourceTrade.tokenId,
      side: sourceTrade.side,
      size: cappedSize,
      price: adjustedPrice
    });
  } catch (error) {
    logger.error('Failed to execute copy trade', error);
  }
};

/**
 * Adjust price for slippage tolerance
 */
const adjustPriceForSlippage = (midPrice: number, side: 'BUY' | 'SELL'): number => {
  const slippageAdjustment = midPrice * (config.slippageTolerance / 100);

  if (side === 'BUY') {
    // For buy orders, increase price slightly to ensure execution
    return midPrice + slippageAdjustment;
  }
  // For sell orders, decrease price slightly to ensure execution
  return Math.max(0, midPrice - slippageAdjustment);
};
