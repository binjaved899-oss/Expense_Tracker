export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'CSRF_INVALID'
  | 'INSUFFICIENT_FUNDS'
  | 'SPLIT_MISMATCH'
  | 'INTERNAL_ERROR';

export interface ErrorEnvelope {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown> | Array<{ path: string; message: string }>;
  requestId: string;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: ErrorEnvelope['details'];

  constructor(
    code: ErrorCode,
    message: string,
    statusCode = 400,
    details?: ErrorEnvelope['details']
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorEnvelope['details']) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier: string) {
    super('NOT_FOUND', `${resource} "${identifier}" was not found.`, 404, {
      resource,
      identifier,
    });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: ErrorEnvelope['details']) {
    super('CONFLICT', message, 409, details);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication session is missing or expired.') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Your current role does not permit this operation.') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

export function toErrorEnvelope(err: unknown, requestId = 'req-local-2024'): {
  statusCode: number;
  body: ErrorEnvelope;
} {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      body: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
        requestId,
      },
    };
  }

  if (err && typeof err === 'object' && 'issues' in err && Array.isArray((err as { issues: unknown[] }).issues)) {
    const zodIssues = (err as { issues: Array<{ path?: Array<string | number>; message?: string }> }).issues.map(
      (issue) => ({
        path: Array.isArray(issue.path) ? issue.path.join('.') : 'root',
        message: issue.message || 'Invalid field value',
      })
    );
    return {
      statusCode: 400,
      body: {
        code: 'VALIDATION_ERROR',
        message: 'Request payload failed schema validation.',
        details: zodIssues,
        requestId,
      },
    };
  }

  const fallbackMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
  return {
    statusCode: 500,
    body: {
      code: 'INTERNAL_ERROR',
      message: fallbackMessage,
      requestId,
    },
  };
}
