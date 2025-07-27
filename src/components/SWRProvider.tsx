'use client';

import { SWRConfig } from 'swr';
import { memo } from 'react';
import { ErrorHandler } from '../utils/errorHandler';

interface SWRProviderProps {
  children: React.ReactNode;
}

const SWRProvider = memo(({ children }: SWRProviderProps) => {
  return (
    <SWRConfig
      value={{
        // Global SWR configuration
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        refreshInterval: 0, // Disable automatic refresh to prevent loops
        errorRetryCount: 2, // Reduce retry count for auth errors
        errorRetryInterval: 3000, // Increase interval
        dedupingInterval: 10000, // Increase deduping interval
        shouldRetryOnError: (error) => {
          // Don't retry on auth errors to prevent spam
          if (ErrorHandler.isAuthError(error)) {
            return false;
          }
          return ErrorHandler.shouldRetry(error);
        },
        onError: (error, key) => {
          // Only log non-auth errors to reduce noise
          if (!ErrorHandler.isAuthError(error)) {
            ErrorHandler.logError(error, `SWR:${key}`);
          }
        },
        onSuccess: (data, key) => {
          // Reset any error states on successful requests
          console.debug(`SWR Success: ${key}`);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
});

SWRProvider.displayName = 'SWRProvider';

export default SWRProvider;
