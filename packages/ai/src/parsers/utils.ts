// Logger interface for parsers
export interface Logger {
  error?(message: string, ...args: unknown[]): void;

  warn?(message: string, ...args: unknown[]): void;

  info?(message: string, ...args: unknown[]): void;

  debug?(message: string, ...args: unknown[]): void;
}
// Simple console logger implementation
export class ConsoleLogger implements Logger {
  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    console.log(`[INFO] ${message}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    // Only log debug in development or when DEBUG env var is set
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
}
