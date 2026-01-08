import { logger } from './logger';
import PolymarketCopyTradingBot from './bot';

async function main(): Promise<void> {
  const bot = new PolymarketCopyTradingBot();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });

  try {
    // Initialize bot
    await bot.initialize();

    // Start bot
    await bot.start();

    // Log status every minute
    setInterval(() => {
      const state = bot.getState();
      const stats = bot.getStats();

      logger.info('Bot status', {
        running: state.isRunning,
        activePositions: stats.positionsCount,
        activeOrders: stats.activeOrdersCount,
        totalPositionValue: stats.totalPositionValue,
        lastUpdate: new Date(state.lastUpdate).toISOString(),
        errors: state.errors.length,
      });
    }, 60000);
  } catch (error) {
    logger.error('Fatal error', error);
    process.exit(1);
  }
}

main();
