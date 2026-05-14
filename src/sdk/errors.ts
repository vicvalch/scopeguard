export class AocError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public requestId?: string | null,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AocError";
  }
}

export class AocAuthError extends AocError { constructor(message: string, status = 401, code?: string, requestId?: string | null, details?: unknown) { super(message, status, code, requestId, details); this.name = "AocAuthError"; } }
export class AocForbiddenError extends AocError { constructor(message: string, status = 403, code?: string, requestId?: string | null, details?: unknown) { super(message, status, code, requestId, details); this.name = "AocForbiddenError"; } }
export class AocNotFoundError extends AocError { constructor(message: string, status = 404, code?: string, requestId?: string | null, details?: unknown) { super(message, status, code, requestId, details); this.name = "AocNotFoundError"; } }
export class AocValidationError extends AocError { constructor(message: string, status = 400, code?: string, requestId?: string | null, details?: unknown) { super(message, status, code, requestId, details); this.name = "AocValidationError"; } }
export class AocRateLimitError extends AocError { constructor(message: string, status = 429, code?: string, requestId?: string | null, details?: unknown) { super(message, status, code, requestId, details); this.name = "AocRateLimitError"; } }
export class AocServerError extends AocError { constructor(message: string, status = 500, code?: string, requestId?: string | null, details?: unknown) { super(message, status, code, requestId, details); this.name = "AocServerError"; } }
