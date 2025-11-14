/**
 * Production-safe logger utility
 * Logs detailed information in development, minimal in production
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Logs a message with the specified level
 * In production, only errors are logged (without sensitive details)
 */
function log(level: LogLevel, message: string, data?: unknown) {
  if (!isDevelopment && level !== 'error') {
    // Only log errors in production
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (level === 'error') {
    if (isDevelopment) {
      console.error(prefix, message, data);
    } else {
      // In production, log error without sensitive data
      console.error(prefix, message);
    }
  } else if (level === 'warn') {
    console.warn(prefix, message, data);
  } else {
    console.log(prefix, message, data);
  }
}

/**
 * Logger object with typed methods
 */
export const logger = {
  info: (message: string, data?: unknown) => log('info', message, data),
  warn: (message: string, data?: unknown) => log('warn', message, data),
  error: (message: string, data?: unknown) => log('error', message, data),
  debug: (message: string, data?: unknown) => log('debug', message, data),
};
