import { logger } from './logger';
import { config } from './config';
import CLOBClient from './api/clobClient';
import PolymarketWSClient from './api/wsClient';
import TradingEngine from './engine/tradingEngine';
import { BotState } from './types';

export class PolymarketCopyTradingBot {
  private clobClient: CLOBClient;
  private wsClient: PolymarketWSClient;
  private tradingEngine: TradingEngine;
  private state: BotState;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.clobClient = new CLOBClient();
    this.wsClient = new PolymarketWSClient();
    this.tradingEngine = new TradingEngine(this.clobClient, {
      sourceTrader: config.userAddress,
      maxOrderSize: config.maxPositionSize,
      minOrderSize: 1,
      riskPercentage: config.riskPercentage,
      slippageTolerance: config.slippageTolerance,
    });

    this.state = {
      isRunning: false,
      lastUpdate: 0,
      ordersPlaced: 0,
      totalVolume: 0,
      activePositions: 0,
      errors: [],
    };
  }

  /**
   * Initialize the bot
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Polymarket Copy Trading Bot');

      // Validate configuration
      this.validateConfig();

      // Test CLOB API connection
      const isHealthy = await this.clobClient.healthCheck();
      if (!isHealthy) {
        throw new Error('CLOB API health check failed');
      }

      logger.info('Bot initialization successful');
    } catch (error) {
      logger.error('Bot initialization failed', error);
      throw error;
    }
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    try {
      if (this.state.isRunning) {
        logger.warn('Bot is already running');
        return;
      }

      logger.info('Starting Polymarket Copy Trading Bot');

      // Connect to WebSocket
      await this.wsClient.connect();

      // Set up WebSocket handlers
      this.setupWebSocketHandlers();

      // Start monitoring loop
      this.startMonitoring();

      // Start position update loop
      this.startPositionUpdates();

      this.state.isRunning = true;
      logger.info('Bot started successfully');
    } catch (error) {
      logger.error('Failed to start bot', error);
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    try {
      logger.info('Stopping Polymarket Copy Trading Bot');

      // Stop monitoring
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }

      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }

      // Cancel all active orders
      await this.tradingEngine.cancelAllOrders();

      // Disconnect WebSocket
      this.wsClient.disconnect();

      this.state.isRunning = false;
      logger.info('Bot stopped successfully');
    } catch (error) {
      logger.error('Error stopping bot', error);
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!config.userAddress || config.userAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('Invalid USER_ADDRESS configuration');
    }

    if (!config.proxyWallet || config.proxyWallet === '0x0000000000000000000000000000000000000000') {
      throw new Error('Invalid PROXY_WALLET configuration');
    }

    if (!config.privateKey) {
      throw new Error('Missing PRIVATE_KEY configuration');
    }

    logger.info('Configuration validated');
  }

  /**
   * Set up WebSocket handlers
   */
  private setupWebSocketHandlers(): void {
    this.wsClient.on('orderbook', (data) => {
      logger.debug('Received orderbook update', data);
    });

    this.wsClient.on('trade', (data) => {
      logger.debug('Received trade update', data);
    });

    this.wsClient.on('error', (data) => {
      logger.error('WebSocket error', data);
      this.addError('WebSocket error');
    });
  }

  /**
   * Start monitoring source trader
   */
  private startMonitoring(): void {
    const interval = config.fetchInterval * 1000;

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.tradingEngine.monitorAndCopyTrades();
        this.state.lastUpdate = Date.now();
      } catch (error) {
        logger.error('Error in monitoring loop', error);
        this.addError(`Monitoring error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, interval);

    logger.info('Monitoring started', { interval });
  }

  /**
   * Start position updates
   */
  private startPositionUpdates(): void {
    const interval = 30000; // Update every 30 seconds

    this.updateInterval = setInterval(async () => {
      try {
        await this.tradingEngine.updatePositions();

        const stats = this.tradingEngine.getStats();
        this.state.activePositions = stats.positionsCount;

        logger.debug('Position update', stats);
      } catch (error) {
        logger.error('Error updating positions', error);
        this.addError(`Position update error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, interval);

    logger.info('Position updates started', { interval });
  }

  /**
   * Add error to state
   */
  private addError(error: string): void {
    this.state.errors.push(error);

    // Keep only last 100 errors
    if (this.state.errors.length > 100) {
      this.state.errors = this.state.errors.slice(-100);
    }
  }

  /**
   * Get bot state
   */
  getState(): BotState {
    return {
      ...this.state,
      lastUpdate: this.state.lastUpdate,
    };
  }

  /**
   * Get trading statistics
   */
  getStats() {
    return this.tradingEngine.getStats();
  }

  /**
   * Get active positions
   */
  getPositions() {
    return this.tradingEngine.getPositions();
  }

  /**
   * Get active orders
   */
  getActiveOrders() {
    return this.tradingEngine.getActiveOrders();
  }
}

export default PolymarketCopyTradingBot;
