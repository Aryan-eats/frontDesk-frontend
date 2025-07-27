import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  userMessage: string;
  status?: number;
  code?: string;
  timestamp: string;
  context?: Record<string, any>;
}

export class ErrorHandler {
  static getErrorMessage(error: unknown): string {
    if (error instanceof AxiosError) {
      return this.handleAxiosError(error).userMessage;
    }
    
    if (error instanceof Error) {
      if (error.message.includes('Network Error') || error.message.includes('ERR_NETWORK')) {
        return 'Unable to connect to server. Please check your internet connection and try again.';
      }
      
      if (error.message.includes('timeout')) {
        return 'Request timed out. The server is taking too long to respond.';
      }
      
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  private static handleAxiosError(error: AxiosError): { message: string; userMessage: string } {
    const status = error.response?.status;
    const responseData = error.response?.data as any;
    const message = error.message;

    let userMessage: string;

    switch (status) {
      case 400:
        userMessage = responseData?.message || 'Invalid request. Please check your input.';
        break;
      case 401:
        userMessage = 'You are not authorized. Please log in again.';
        break;
      case 403:
        userMessage = 'Access denied. You do not have permission for this action.';
        break;
      case 404:
        userMessage = 'The requested resource was not found.';
        break;
      case 409:
        userMessage = responseData?.message || 'Conflict occurred. The resource already exists or is in use.';
        break;
      case 422:
        userMessage = responseData?.message || 'Validation failed. Please check your input.';
        break;
      case 429:
        userMessage = 'Too many requests. Please wait a moment and try again.';
        break;
      case 500:
        userMessage = 'Server error occurred. Please try again later.';
        break;
      case 502:
      case 503:
      case 504:
        userMessage = 'Service temporarily unavailable. Please try again later.';
        break;
      default:
        if (error.code === 'ECONNABORTED') {
          userMessage = 'Request timed out. Please check your connection and try again.';
        } else if (error.code === 'ERR_NETWORK') {
          userMessage = 'Network error. Please check your internet connection.';
        } else if (!error.response) {
          userMessage = 'Cannot connect to server. Please check your internet connection.';
        } else {
          userMessage = 'An error occurred while communicating with the server.';
        }
    }

    return { message, userMessage };
  }
  
  static createApiError(error: unknown, context?: Record<string, any>): ApiError {
    if (error instanceof AxiosError) {
      const { message, userMessage } = this.handleAxiosError(error);
      return {
        message,
        userMessage,
        status: error.response?.status,
        code: error.code,
        timestamp: new Date().toISOString(),
        context: {
          ...context,
          url: error.config?.url,
          method: error.config?.method,
        }
      };
    }

    const userMessage = this.getErrorMessage(error);
    return {
      message: error instanceof Error ? error.message : String(error),
      userMessage,
      timestamp: new Date().toISOString(),
      context
    };
  }
  
  static logError(error: unknown, context?: string): void {
    const apiError = this.createApiError(error, { context });
    console.error(`[${context || 'API'}] Error:`, {
      ...apiError,
      originalError: error
    });
    
    if (process.env.NODE_ENV === 'production') {
    }
  }

  static isNetworkError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      return !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED';
    }
    return false;
  }

  static isAuthError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      return error.response?.status === 401;
    }
    return false;
  }

  static shouldRetry(error: unknown): boolean {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      
      if (status && status >= 400 && status < 500 && status !== 429 && status !== 408) {
        return false;
      }
      
      return status ? status >= 500 || status === 429 || status === 408 : true;
    }
    
    return true;
  }
}
