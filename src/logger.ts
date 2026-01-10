import { config } from './config.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const currentLevel: LogLevel = (config.logLevel as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return levels[level] >= levels[currentLevel];
}

function safeMeta(meta: unknown): unknown {
  if (meta instanceof Error) return { message: meta.message, stack: meta.stack };
  return meta;
}

export const logger = {
  debug(msg: string, meta?: unknown) {
    if (!shouldLog('debug')) return;
    console.log(`[DEBUG] ${msg}`, meta !== undefined ? safeMeta(meta) : '');
  },
  info(msg: string, meta?: unknown) {
    if (!shouldLog('info')) return;
    console.log(`[INFO] ${msg}`, meta !== undefined ? safeMeta(meta) : '');
  },
  warn(msg: string, meta?: unknown) {
    if (!shouldLog('warn')) return;
    console.warn(`[WARN] ${msg}`, meta !== undefined ? safeMeta(meta) : '');
  },
  error(msg: string, meta?: unknown) {
    if (!shouldLog('error')) return;
    console.error(`[ERROR] ${msg}`, meta !== undefined ? safeMeta(meta) : '');
  }
};
