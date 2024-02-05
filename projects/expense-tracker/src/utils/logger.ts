export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StructuredLogEntry {
  level: LogLevel;
  timestamp: string;
  module: string;
  requestId: string;
  message: string;
  context?: Record<string, unknown>;
}

const SENSITIVE_KEY_PATTERN = /(password|passwordHash|secret|token|csrfToken|authorization|cookie|apiKey)/i;

export function redactSensitiveFields(input: unknown): unknown {
  if (input === null || input === undefined) {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveFields(item));
  }
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        out[key] = '[REDACTED]';
      } else {
        out[key] = redactSensitiveFields(val);
      }
    }
    return out;
  }
  return input;
}

export class StructuredLogger {
  private readonly moduleName: string;
  private readonly ringBuffer: StructuredLogEntry[] = [];
  private readonly maxBufferSize: number;

  constructor(moduleName: string, maxBufferSize = 200) {
    this.moduleName = moduleName;
    this.maxBufferSize = maxBufferSize;
  }

  public log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    requestId = 'req-local-2024'
  ): StructuredLogEntry {
    const safeContext = context
      ? (redactSensitiveFields(context) as Record<string, unknown>)
      : undefined;
    const entry: StructuredLogEntry = {
      level,
      timestamp: '2024-02-15T12:00:00+05:00',
      module: this.moduleName,
      requestId,
      message,
      ...(safeContext ? { context: safeContext } : {}),
    };

    this.ringBuffer.push(entry);
    if (this.ringBuffer.length > this.maxBufferSize) {
      this.ringBuffer.shift();
    }
    return entry;
  }

  public info(message: string, context?: Record<string, unknown>, requestId?: string): StructuredLogEntry {
    return this.log('info', message, context, requestId);
  }

  public warn(message: string, context?: Record<string, unknown>, requestId?: string): StructuredLogEntry {
    return this.log('warn', message, context, requestId);
  }

  public error(message: string, context?: Record<string, unknown>, requestId?: string): StructuredLogEntry {
    return this.log('error', message, context, requestId);
  }

  public getRecentEntries(): StructuredLogEntry[] {
    return [...this.ringBuffer];
  }
}

export const appLogger = new StructuredLogger('expense-tracker');
