/**
 * Structured Logging Infrastructure
 * Production-ready logging with levels, formatting, and integration
 */

// ============================================
// TYPES
// ============================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

interface LoggerConfig {
  level: LogLevel;
  context?: string;
  includeTimestamp: boolean;
  includeStack: boolean;
  redactFields: string[];
}

// ============================================
// LOG LEVEL PRIORITY
// ============================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// ============================================
// SENSITIVE FIELDS TO REDACT
// ============================================

const DEFAULT_REDACT_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
  'creditCard',
  'ssn',
  'email', // Partial redaction
];

// ============================================
// LOGGER CLASS
// ============================================

class Logger {
  private config: LoggerConfig;
  private context?: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      includeTimestamp: true,
      includeStack: process.env.NODE_ENV !== 'production',
      redactFields: DEFAULT_REDACT_FIELDS,
      ...config,
    };
    this.context = config.context;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private redact(obj: unknown): unknown {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.redact(item));
    }

    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (this.config.redactFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        if (key.toLowerCase() === 'email' && typeof value === 'string') {
          // Partial email redaction
          const [local, domain] = value.split('@');
          redacted[key] = `${local?.substring(0, 2)}***@${domain}`;
        } else {
          redacted[key] = '[REDACTED]';
        }
      } else if (typeof value === 'object') {
        redacted[key] = this.redact(value);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  private formatEntry(entry: LogEntry): string {
    if (process.env.NODE_ENV === 'production') {
      // JSON format for production (easier to parse in log aggregation)
      return JSON.stringify(this.redact(entry));
    }

    // Human-readable format for development
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);
    const context = entry.context ? `[${entry.context}]` : '';
    const userId = entry.userId ? `{user:${entry.userId}}` : '';
    const requestId = entry.requestId ? `{req:${entry.requestId}}` : '';
    const duration = entry.duration ? `(${entry.duration}ms)` : '';
    const metadata = entry.metadata ? ` ${JSON.stringify(this.redact(entry.metadata))}` : '';

    let output = `${timestamp} ${level} ${context}${userId}${requestId} ${entry.message}${duration}${metadata}`;

    if (entry.error && this.config.includeStack) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  ${entry.error.stack}`;
      }
    }

    return output;
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formatted = this.formatEntry(entry);

    switch (entry.level) {
      case 'fatal':
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'debug':
        console.debug(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  // Create a child logger with context
  child(context: string): Logger {
    return new Logger({
      ...this.config,
      context: this.context ? `${this.context}:${context}` : context,
    });
  }

  // Set request context
  withRequest(requestId: string, userId?: string): Logger {
    const logger = new Logger(this.config);
    logger.context = this.context;
    (logger as { requestId?: string }).requestId = requestId;
    (logger as { userId?: string }).userId = userId;
    return logger;
  }

  // Logging methods
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context: this.context,
      metadata,
    });
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context: this.context,
      metadata,
    });
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context: this.context,
      metadata,
    });
  }

  error(message: string, error?: Error | unknown, metadata?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context: this.context,
      metadata,
    };

    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      entry.metadata = { ...metadata, error: String(error) };
    }

    this.log(entry);
  }

  fatal(message: string, error?: Error | unknown, metadata?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'fatal',
      message,
      context: this.context,
      metadata,
    };

    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      entry.metadata = { ...metadata, error: String(error) };
    }

    this.log(entry);
  }

  // Timing helper
  time(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.debug(`${label} completed`, { duration });
    };
  }

  // API request logging
  apiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    metadata?: Record<string, unknown>
  ): void {
    this.info(`API ${method} ${path}`, {
      statusCode,
      duration,
      ...metadata,
    });
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const logger = new Logger();

// ============================================
// CONVENIENCE EXPORTS
// ============================================

export function createLogger(context: string): Logger {
  return logger.child(context);
}

export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  metadata?: Record<string, unknown>
): void {
  logger.apiRequest(method, path, statusCode, duration, metadata);
}

// ============================================
// MORGAN-STYLE HTTP LOGGING MIDDLEWARE
// ============================================

import { NextRequest, NextResponse } from 'next/server';

export function withLogging<T>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    const start = Date.now();
    const { method, nextUrl } = request;
    const path = nextUrl.pathname;

    try {
      const response = await handler(request);
      const duration = Date.now() - start;

      logger.apiRequest(method, path, response.status, duration);

      // Add timing header
      response.headers.set('X-Response-Time', `${duration}ms`);

      return response;
    } catch (error) {
      const duration = Date.now() - start;
      
      logger.error(`API ${method} ${path} failed`, error, {
        duration,
      });

      throw error;
    }
  };
}

// ============================================
// AUDIT LOGGING
// ============================================

interface AuditLogEntry {
  action: string;
  actor: {
    id: string;
    role: string;
    email?: string;
  };
  target: {
    type: string;
    id: string;
  };
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export function auditLog(entry: AuditLogEntry): void {
  logger.info(`AUDIT: ${entry.action}`, {
    actor: entry.actor,
    target: entry.target,
    details: entry.details,
    ip: entry.ip,
    userAgent: entry.userAgent,
  });
}
