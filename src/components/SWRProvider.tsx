'use client';

import { SWRConfig } from 'swr';
import { enhancedApiService } from '../services/enhancedApi';
import { useEffect } from 'react';

interface SWRProviderProps {
  children: React.ReactNode;
}

export default function SWRProvider({ children }: SWRProviderProps) {
  // Preload critical data on mount
  useEffect(() => {
    enhancedApiService.prefetchData();
  }, []);

  return (
    <SWRConfig
      value={{
        refreshInterval: 0, // Disable automatic refresh by default
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        errorRetryCount: 3,
        errorRetryInterval: 1000,
        dedupingInterval: 2000,
        onError: (error, key) => {
          console.error('SWR Error:', error, 'Key:', key);
          // You could integrate with error reporting service here
        },
        onSuccess: (data, key) => {
          // Optional: Log successful requests in development
          if (process.env.NODE_ENV === 'development') {
            console.log('SWR Success:', key, data);
          }
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
