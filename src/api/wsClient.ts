import { logger } from '../logger.js';
import { config } from '../config.js';

export class WSClient {
  connect(): void {
    logger.debug('WSClient.connect (stub)', { url: config.clobWsUrl });
  }
  disconnect(): void {
    logger.debug('WSClient.disconnect (stub)');
  }
}

export default WSClient;
