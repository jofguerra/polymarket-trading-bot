import { logger } from '../logger';
import { config } from '../config';
import CLOBClient from '../api/clobClient';
import { Order, Trade, Position } from '../types';

export interface TradingEngineConfig {
  sourceTrader: string;
  maxOrderSize: number;
  minOrderSize: number;
  riskPercentage: number;
  slippageTolerance: number;
}

export class TradingEngine {
  private clobClient: CLOBClient;
  private config: TradingEngineConfig;
  private activeOrders: Map<string, Order> = new Map();
  private positions: Map<string, Position> = new Map();
  private lastSyncTime = 0;

  constructor(clobClient: CLOBClient, config: TradingEngineConfig) {
    this.clobClient = clobClient;
    this.config = config;
  }

  /**
   * Monitor source trader and execute copy trades
   */
  async monitorAndCopyTrades(): Promise<void> {
    try {
      const sourceTraderTrades = await this.clobClient.getUserTrades(this.config.sourceTrader, 50);

      if (sourceTraderTrades.length === 0) {
        logger.debug('No new trades from source trader');
        return;
      }

      // Filter trades newer than last sync
      const newTrades = sourceTraderTrades.filter((trade) => trade.timestamp > this.lastSyncTime);

      if (newTrades.length === 0) {
        logger.debug('No new trades to copy');
        return;
      }

      logger.info('Found new trades to copy', { count: newTrades.length });

      for (const trade of newTrades) {
        await this.executeCopyTrade(trade);
      }

      this.lastSyncTime = Math.max(...sourceTraderTrades.map((t) => t.timestamp));
    } catch (error) {
      logger.error('Error monitoring source trader', error);
    }
  }

  /**
   * Execute a copy trade
   */
  private async executeCopyTrade(sourceTrade: Trade): Promise<void> {
    try {
      logger.info('Executing copy trade', {
        marketId: sourceTrade.marketId,
        side: sourceTrade.side,
        size: sourceTrade.size,
        price: sourceTrade.price,
      });

      // Calculate order size based on risk management
      const orderSize = this.calculateOrderSize(sourceTrade.size);

      if (orderSize < this.config.minOrderSize) {
        logger.warn('Order size below minimum', { orderSize, minSize: this.config.minOrderSize });
        return;
      }

      if (orderSize > this.config.maxOrderSize) {
        logger.warn('Order size exceeds maximum', { orderSize, maxSize: this.config.maxOrderSize });
        return;
      }

      // Get current market price with slippage tolerance
      const midPrice = await this.clobClient.getMidPrice(sourceTrade.marketId, sourceTrade.outcome);
      const adjustedPrice = this.adjustPriceForSlippage(midPrice, sourceTrade.side);

      // Place the order
      const order = await this.clobClient.placeOrder({
        marketId: sourceTrade.marketId,
        outcome: sourceTrade.outcome,
        side: sourceTrade.side,
        price: adjustedPrice,
        size: orderSize,
      });

      this.activeOrders.set(order.id, order);

      logger.info('Copy trade executed successfully', {
        orderId: order.id,
        size: orderSize,
        price: adjustedPrice,
      });
    } catch (error) {
      logger.error('Failed to execute copy trade', error);
    }
  }

  /**
   * Calculate order size based on risk management
   */
  private calculateOrderSize(sourceTradeSize: number): number {
    // Apply risk percentage to scale down orders
    const scaledSize = sourceTradeSize * (this.config.riskPercentage / 100);
    
    // Round to reasonable precision
    return Math.round(scaledSize * 100) / 100;
  }

  /**
   * Adjust price for slippage tolerance
   */
  private adjustPriceForSlippage(midPrice: number, side: 'BUY' | 'SELL'): number {
    const slippageAdjustment = midPrice * (this.config.slippageTolerance / 100);

    if (side === 'BUY') {
      // For buy orders, increase price slightly to ensure execution
      return midPrice + slippageAdjustment;
    } else {
      // For sell orders, decrease price slightly to ensure execution
      return Math.max(0, midPrice - slippageAdjustment);
    }
  }

  /**
   * Update position tracking
   */
  async updatePositions(): Promise<void> {
    try {
      const userOrders = await this.clobClient.getUserOrders(config.proxyWallet);

      // Clear old positions
      this.positions.clear();

      // Update positions from active orders
      for (const order of userOrders) {
        if (order.status === 'FILLED' || order.status === 'PARTIALLY_FILLED') {
          const key = `${order.marketId}-${order.outcome}`;
          const existingPosition = this.positions.get(key);

          const filledSize = order.filledSize || 0;
          const positionValue = filledSize * order.price;

          if (existingPosition) {
            existingPosition.balance += filledSize;
            existingPosition.value += positionValue;
          } else {
            this.positions.set(key, {
              marketId: order.marketId,
              outcome: order.outcome,
              balance: filledSize,
              value: positionValue,
              timestamp: Date.now(),
            });
          }
        }
      }

      logger.debug('Positions updated', { count: this.positions.size });
    } catch (error) {
      logger.error('Failed to update positions', error);
    }
  }

  /**
   * Cancel all active orders
   */
  async cancelAllOrders(): Promise<void> {
    try {
      const cancelPromises = Array.from(this.activeOrders.keys()).map((orderId) =>
        this.clobClient.cancelOrder(orderId).catch((error) => {
          logger.error(`Failed to cancel order ${orderId}`, error);
        })
      );

      await Promise.all(cancelPromises);
      this.activeOrders.clear();

      logger.info('All orders cancelled');
    } catch (error) {
      logger.error('Failed to cancel all orders', error);
    }
  }

  /**
   * Get current positions
   */
  getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get active orders
   */
  getActiveOrders(): Order[] {
    return Array.from(this.activeOrders.values());
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      activeOrdersCount: this.activeOrders.size,
      positionsCount: this.positions.size,
      totalPositionValue: Array.from(this.positions.values()).reduce((sum, pos) => sum + pos.value, 0),
    };
  }
}

export default TradingEngine;
