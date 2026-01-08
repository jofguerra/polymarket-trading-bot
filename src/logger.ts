import { config } from './config';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const logLevelMap: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = logLevelMap[config.logLevel.toLowerCase()] || LogLevel.INFO;
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: string, message: string, data?: unknown): string {
    const timestamp = this.formatTimestamp();
    let output = `[${timestamp}] [${level}] ${message}`;
    if (data) {
      output += ` ${JSON.stringify(data)}`;
    }
    return output;
  }

  debug(message: string, data?: unknown): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }

  info(message: string, data?: unknown): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log(this.formatMessage('INFO', message, data));
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  error(message: string, error?: Error | unknown): void {
    if (this.logLevel <= LogLevel.ERROR) {
      let errorData: unknown = error;
      if (error instanceof Error) {
        errorData = {
          message: error.message,
          stack: error.stack,
        };
      }
      console.error(this.formatMessage('ERROR', message, errorData));
    }
  }
}

export const logger = new Logger();
export default logger;
