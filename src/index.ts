import { logger } from './logger';
import TradingBot from './bot';

const bot = new TradingBot();

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  bot.stop();
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  bot.stop();
});

// Start the bot
bot.start().catch((error) => {
  logger.error('Fatal error', error);
  process.exit(1);
});
