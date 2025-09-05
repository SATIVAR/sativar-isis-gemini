/* eslint-disable @typescript-eslint/no-explicit-any */
import { LogStore, LogEntry, LogLevel } from './logStore';

function toMetadata(args: any[]): Record<string, any> | undefined {
  if (!args || args.length === 0) return undefined;
  if (args.length === 1 && typeof args[0] === 'object') return args[0];
  return { args };
}

function write(level: LogLevel, message: string, ...args: any[]) {
  const metadata = toMetadata(args);
  LogStore.add({ level, message, metadata });
  const ts = new Date().toISOString();
  switch (level) {
    case 'info':
      console.log(`[INFO] [${ts}] ${message}`, ...(metadata ? [metadata] : []));
      break;
    case 'warn':
      console.warn(`[WARN] [${ts}] ${message}`, ...(metadata ? [metadata] : []));
      break;
    case 'error':
      console.error(`[ERROR] [${ts}] ${message}`, ...(metadata ? [metadata] : []));
      break;
    case 'debug':
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.debug(`[DEBUG] [${ts}] ${message}`, ...(metadata ? [metadata] : []));
      } else if (typeof window !== 'undefined' && import.meta.env?.DEV) {
        console.debug(`[DEBUG] [${ts}] ${message}`, ...(metadata ? [metadata] : []));
      }
      break;
  }
}

const logger = {
  info: (message: string, ...args: any[]) => write('info', message, ...args),
  warn: (message: string, ...args: any[]) => write('warn', message, ...args),
  error: (message: string, ...args: any[]) => write('error', message, ...args),
  debug: (message: string, ...args: any[]) => write('debug', message, ...args),

  // convenience timer
  time(label: string) {
    const start = performance.now();
    return {
      end: (meta?: Record<string, any>) => {
        const durationMs = Math.round(performance.now() - start);
        write('info', `${label} completed`, { durationMs, ...(meta || {}) });
        return durationMs;
      }
    };
  }
};

export type { LogEntry };
export default logger;