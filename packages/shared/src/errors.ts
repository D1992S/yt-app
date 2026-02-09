export type ErrorCode = 
  | 'UNKNOWN_ERROR'
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'QUOTA_EXCEEDED'
  | 'DB_LOCKED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'SYNC_FAILED';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly isRetryable: boolean;
  public readonly details?: any;

  constructor(code: ErrorCode, message: string, isRetryable = false, details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.isRetryable = isRetryable;
    this.details = details;
  }

  static from(error: any): AppError {
    if (error instanceof AppError) return error;
    
    const message = error.message || 'An unexpected error occurred';
    
    // Heuristic mapping
    if (message.includes('fetch') || message.includes('network') || message.includes('ECONNREFUSED')) {
      return new AppError('NETWORK_ERROR', 'Problem z połączeniem sieciowym.', true, message);
    }
    if (message.includes('401') || message.includes('auth') || message.includes('token')) {
      return new AppError('AUTH_ERROR', 'Błąd autoryzacji. Sprawdź token.', false, message);
    }
    if (message.includes('429') || message.includes('quota')) {
      return new AppError('QUOTA_EXCEEDED', 'Przekroczono limit zapytań API.', true, message);
    }
    if (message.includes('locked') || message.includes('busy')) {
      return new AppError('DB_LOCKED', 'Baza danych jest zablokowana.', true, message);
    }
    if (message.includes('validation') || message.includes('parse')) {
      return new AppError('VALIDATION_ERROR', 'Błąd walidacji danych.', false, message);
    }

    return new AppError('UNKNOWN_ERROR', message, false, error);
  }
  
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      isRetryable: this.isRetryable,
      details: this.details
    };
  }
}
