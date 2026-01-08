import axios, { AxiosInstance } from 'axios';
import { logger } from '../logger';
import { config } from '../config';
import { Market, OrderBook, Order, Trade } from '../types';

export class CLOBClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.clobHttpUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });
  }

  /**
   * Fetch all active markets
   */
  async getMarkets(): Promise<Market[]> {
    try {
      const response = await this.client.get('/markets');
      logger.debug('Fetched markets', { count: response.data.length });
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch markets', error);
      throw error;
    }
  }

  /**
   * Fetch a specific market by ID
   */
  async getMarket(marketId: string): Promise<Market> {
    try {
      const response = await this.client.get(`/markets/${marketId}`);
      logger.debug('Fetched market', { marketId });
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch market ${marketId}`, error);
      throw error;
    }
  }

  /**
   * Fetch order book for a market
   */
  async getOrderBook(marketId: string): Promise<OrderBook> {
    try {
      const response = await this.client.get(`/markets/${marketId}/orderbook`);
      logger.debug('Fetched orderbook', { marketId });
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch orderbook for ${marketId}`, error);
      throw error;
    }
  }

  /**
   * Get mid price for a market outcome
   */
  async getMidPrice(marketId: string): Promise<number> {
    try {
      const orderBook = await this.getOrderBook(marketId);
      
      if (orderBook.bids.length === 0 || orderBook.asks.length === 0) {
        return 0.5; // Default mid price
      }

      const bestBid = orderBook.bids[0].price;
      const bestAsk = orderBook.asks[0].price;
      const midPrice = (bestBid + bestAsk) / 2;

      return midPrice;
    } catch (error) {
      logger.error(`Failed to get mid price for ${marketId}`, error);
      throw error;
    }
  }

  /**
   * Place a new order
   */
  async placeOrder(order: {
    marketId: string;
    outcome: number;
    side: 'BUY' | 'SELL';
    price: number;
    size: number;
  }): Promise<Order> {
    try {
      const response = await this.client.post('/orders', {
        market: order.marketId,
        outcome: order.outcome,
        side: order.side,
        price: order.price,
        size: order.size,
      });

      logger.info('Order placed successfully', {
        orderId: response.data.id,
        marketId: order.marketId,
        side: order.side,
        size: order.size,
        price: order.price,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to place order', error);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<void> {
    try {
      await this.client.delete(`/orders/${orderId}`);
      logger.info('Order cancelled', { orderId });
    } catch (error) {
      logger.error(`Failed to cancel order ${orderId}`, error);
      throw error;
    }
  }

  /**
   * Get order status
   */
  async getOrder(orderId: string): Promise<Order> {
    try {
      const response = await this.client.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch order ${orderId}`, error);
      throw error;
    }
  }

  /**
   * Get user's orders
   */
  async getUserOrders(userAddress: string): Promise<Order[]> {
    try {
      const response = await this.client.get(`/users/${userAddress}/orders`);
      logger.debug('Fetched user orders', { userAddress, count: response.data.length });
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch orders for ${userAddress}`, error);
      throw error;
    }
  }

  /**
   * Get recent trades for a market
   */
  async getMarketTrades(marketId: string, limit: number = 100): Promise<Trade[]> {
    try {
      const response = await this.client.get(`/markets/${marketId}/trades`, {
        params: { limit },
      });
      logger.debug('Fetched market trades', { marketId, count: response.data.length });
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch trades for ${marketId}`, error);
      throw error;
    }
  }

  /**
   * Get user's trades
   */
  async getUserTrades(userAddress: string, limit: number = 100): Promise<Trade[]> {
    try {
      const response = await this.client.get(`/users/${userAddress}/trades`, {
        params: { limit },
      });
      logger.debug('Fetched user trades', { userAddress, count: response.data.length });
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch trades for ${userAddress}`, error);
      throw error;
    }
  }

  /**
   * Health check - tries multiple endpoints
   */
  async healthCheck(): Promise<boolean> {
    const endpoints = ['/health', '/markets', '/'];
    
    for (const endpoint of endpoints) {
      try {
        const response = await this.client.get(endpoint, { timeout: 5000 });
        if (response.status === 200 || response.status === 404) {
          logger.debug(`Health check passed on endpoint: ${endpoint}`);
          return true;
        }
      } catch (error) {
        logger.debug(`Health check failed on endpoint: ${endpoint}`, error);
        continue;
      }
    }
    
    logger.warn('All health check endpoints failed, but API may still be reachable');
    return false;
  }
}

export default CLOBClient;
