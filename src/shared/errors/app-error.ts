export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(
    message = 'Resource not found',
  ) {
    super(
      'NOT_FOUND',
      message,
      404,
    );
  }
}

export class ConflictError extends AppError {
  constructor(
    message = 'Conflict occurred',
  ) {
    super(
      'CONFLICT',
      message,
      409,
    );
  }
}

export class GoneError extends AppError {
  constructor(
    message = 'Resource no longer available',
  ) {
    super(
      'GONE',
      message,
      410,
    );
  }
}

export class BadRequestError extends AppError {
  constructor(
    message = 'Bad request',
  ) {
    super(
      'BAD_REQUEST',
      message,
      400,
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    message = 'Unauthorized',
  ) {
    super(
      'UNAUTHORIZED',
      message,
      401,
    );
  }
}
 