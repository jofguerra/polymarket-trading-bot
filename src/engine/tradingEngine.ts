import { config } from '../config';
import { logger } from '../logger';
import { getUserTrades, placeOrder } from '../api/clobClient';
import { Trade } from "../types";

let lastProcessedTimestamp = 0;

/**
 * Monitor source trader and copy their trades
 */
export const monitorAndCopyTrades = async () => {
  try {
    logger.info('Checking for new trades from source trader...');

    // Fetch trades from the source trader using Data API
    const trades = await getUserTrades(config.sourceTrader, 100, 0);

    if (trades.length === 0) {
      logger.debug('No trades found for source trader');
      return;
    }

    // Filter for new trades (trades after the last processed timestamp)
    const newTrades = trades.filter((trade) => trade.timestamp > lastProcessedTimestamp);

    if (newTrades.length === 0) {
      logger.debug('No new trades to copy');
      return;
    }

    logger.info(`Found ${newTrades.length} new trades to copy`);

    // Sort trades by timestamp to process in order
    newTrades.sort((a, b) => a.timestamp - b.timestamp);

    // Process each trade
    for (const trade of newTrades) {
      await executeCopyTrade(trade);
      lastProcessedTimestamp = Math.max(lastProcessedTimestamp, trade.timestamp);
    }
  } catch (error) {
    logger.error('Error in monitorAndCopyTrades', error);
  }
};

/**
 * Execute a copy trade based on source trader's trade
 */
const executeCopyTrade = async (sourceTrade: Trade) => {
  try {
    logger.info('Executing copy trade', {
      marketId: sourceTrade.marketId,
      side: sourceTrade.side,
      size: sourceTrade.size,
      price: sourceTrade.price,
    });

    // Calculate order size based on risk management
    const scaledSize = sourceTrade.size * (config.riskPercentage / 100);
    const cappedSize = Math.min(scaledSize, config.maxPositionSize);

    if (cappedSize <= 0) {
      logger.warn('Calculated order size is zero or negative', { scaledSize, cappedSize });
      return;
    }

    // Apply slippage tolerance to price
    const adjustedPrice = adjustPriceForSlippage(sourceTrade.price, sourceTrade.side);

    logger.info(`Placing order: ${sourceTrade.side} ${cappedSize} at ${adjustedPrice}`);

    // Place the order using CLOB SDK
    await placeOrder(
      sourceTrade.marketId,
      sourceTrade.side as Side,
      adjustedPrice,
      cappedSize
    );

    logger.info('Copy trade executed successfully', {
      marketId: sourceTrade.marketId,
      side: sourceTrade.side,
      size: cappedSize,
      price: adjustedPrice,
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
  } else {
    // For sell orders, decrease price slightly to ensure execution
    return Math.max(0, midPrice - slippageAdjustment);
  }
};
