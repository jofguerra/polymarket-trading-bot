import WebSocket from 'ws';
import { logger } from '../logger';
import { config } from '../config';

export interface WSMessage {
  type: string;
  data: unknown;
  timestamp: number;
}

export class PolymarketWSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;
  private isConnecting = false;
  private messageHandlers: Map<string, (data: unknown) => void> = new Map();

  constructor() {
    this.url = config.clobWsUrl;
  }

  /**
   * Connect to WebSocket
   */
  async connect(): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          logger.info('WebSocket connected');
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          resolve();
        };

        this.ws.onmessage = (event: WebSocket.MessageEvent) => {
          try {
            const message = JSON.parse(event.data as string) as WSMessage;
            this.handleMessage(message);
          } catch (error) {
            logger.error('Failed to parse WebSocket message', error);
          }
        };

        this.ws.onerror = (error: WebSocket.ErrorEvent) => {
          logger.error('WebSocket error', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = () => {
          logger.warn('WebSocket disconnected');
          this.isConnecting = false;
          this.attemptReconnect();
        };
      } catch (error) {
        logger.error('Failed to create WebSocket', error);
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Subscribe to market updates
   */
  subscribeToMarket(marketId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('WebSocket not connected, cannot subscribe');
      return;
    }

    const message = {
      type: 'subscribe',
      market: marketId,
    };

    this.ws.send(JSON.stringify(message));
    logger.debug('Subscribed to market', { marketId });
  }

  /**
   * Unsubscribe from market updates
   */
  unsubscribeFromMarket(marketId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'unsubscribe',
      market: marketId,
    };

    this.ws.send(JSON.stringify(message));
    logger.debug('Unsubscribed from market', { marketId });
  }

  /**
   * Register a message handler
   */
  on(messageType: string, handler: (data: unknown) => void): void {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * Unregister a message handler
   */
  off(messageType: string): void {
    this.messageHandlers.delete(messageType);
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: WSMessage): void {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      try {
        handler(message.data);
      } catch (error) {
        logger.error(`Error in message handler for ${message.type}`, error);
      }
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.info('Attempting to reconnect', {
      attempt: this.reconnectAttempts,
      delay: delay / 1000,
    });

    setTimeout(() => {
      this.connect().catch((error) => {
        logger.error('Reconnection failed', error);
      });
    }, delay);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export default PolymarketWSClient;
