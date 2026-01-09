import { logger } from './logger';
import { config } from './config';
import { initializeClobClient } from './api/clobClient';
import { monitorAndCopyTrades } from './engine/tradingEngine';

class TradingBot {
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupProcessHooks();
  }

  async start(): Promise<void> {
    logger.info('Starting Polymarket Copy Trading Bot');

    try {
      // Initialize Data API client
      initializeClobClient();

      // Start monitoring loop
      this.startMonitoring();

      logger.info('Bot started successfully');
    } catch (error) {
      logger.error('Failed to start bot', error);
      process.exit(1);
    }
  }

  stop(): void {
    logger.info('Stopping bot...');
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    process.exit(0);
  }

  private startMonitoring(): void {
    logger.info(`Starting monitoring loop, checking every ${config.fetchInterval} seconds`);
    this.monitoringInterval = setInterval(
      () => monitorAndCopyTrades().catch(err => logger.error('Error in monitoring loop', err)),
      config.fetchInterval * 1000
    );
  }

  private setupProcessHooks(): void {
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }
}

export default TradingBot;
