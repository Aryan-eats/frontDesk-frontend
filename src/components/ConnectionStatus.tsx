'use client';

import { ReactNode, memo, useState, useEffect } from 'react';
import { AlertTriangle, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  children: ReactNode;
}

const ConnectionStatus = memo(({ children }: ConnectionStatusProps) => {
  const [mounted, setMounted] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    isOnline: true,
    isBackendAvailable: false,
    error: null as string | null,
    lastChecked: new Date()
  });

  // Only run after component mounts to prevent hydration issues
  useEffect(() => {
    setMounted(true);
    
    // Simple online/offline detection
    const updateOnlineStatus = () => {
      if (typeof navigator !== 'undefined') {
        const isOnline = navigator.onLine;
        setConnectionStatus(prev => ({
          ...prev,
          isOnline,
          lastChecked: new Date()
        }));
        
        // Only show warning if offline (avoid backend checks during hydration)
        setShowWarning(!isOnline);
      }
    };

    // Initial check
    updateOnlineStatus();

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);
      
      return () => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
      };
    }
  }, []);

  // Don't render connection status until after hydration
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <>
      {showWarning && (
        <div className={`fixed top-16 left-0 right-0 z-40 ${
          !connectionStatus.isOnline 
            ? 'bg-red-600 text-white' 
            : 'bg-yellow-600 text-white'
        } px-4 py-2 text-center text-sm`}>
          <div className="flex items-center justify-center gap-2">
            {!connectionStatus.isOnline ? (
              <>
                <WifiOff className="h-4 w-4" />
                <span>No internet connection</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                <span>Backend server unavailable - some features may not work</span>
                {connectionStatus.error && (
                  <span className="ml-2 text-xs opacity-75">({connectionStatus.error})</span>
                )}
              </>
            )}
            <span className="ml-2 text-xs opacity-75">
              Last checked: {connectionStatus.lastChecked.toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
      
      <div className={showWarning ? 'pt-12' : ''}>
        {children}
      </div>
    </>
  );
});

ConnectionStatus.displayName = 'ConnectionStatus';

export default ConnectionStatus;
