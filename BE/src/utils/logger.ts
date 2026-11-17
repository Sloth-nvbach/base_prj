/**
 * Simple structured logger for backend services.
 * Uses console in development, can be replaced with Winston/Pino in production.
 */
import { env } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const isDev = env.nodeEnv === 'development';

const formatEntry = (entry: LogEntry): string => {
  const base = `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.message}`;
  if (entry.context && Object.keys(entry.context).length > 0) {
    return `${base} ${JSON.stringify(entry.context)}`;
  }
  return base;
};

const log = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context
  };

  if (isDev || level === 'error' || level === 'warn') {
    const formatted = formatEntry(entry);
    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }
};

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context)
};