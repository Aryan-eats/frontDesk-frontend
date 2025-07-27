import { apiService } from '../services/api';
import React from 'react';

export interface ConnectionStatus {
  isOnline: boolean;
  isBackendAvailable: boolean;
  lastChecked: Date;
  error?: string;
}

class ConnectionMonitor {
  private status: ConnectionStatus = {
    isOnline: true, 
    isBackendAvailable: false,
    lastChecked: new Date(),
  };
  
  private listeners: ((status: ConnectionStatus) => void)[] = [];
  private checkInterval: NodeJS.Timeout | null = null;
  private isChecking = false;
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.status.isOnline = navigator.onLine;
      window.addEventListener('online', this.handleOnlineStatusChange);
      window.addEventListener('offline', this.handleOnlineStatusChange);
    }
  }

  private handleOnlineStatusChange = () => {
    if (typeof window === 'undefined') return;
    
    this.status.isOnline = navigator.onLine;
    this.status.lastChecked = new Date();
    this.notifyListeners();
    
    if (this.status.isOnline) {
      this.checkBackendConnection();
    } else {
      this.status.isBackendAvailable = false;
      this.notifyListeners();
    }
  };

  async checkBackendConnection(): Promise<boolean> {
    if (typeof window === 'undefined' || this.isChecking) {
      return this.status.isBackendAvailable;
    }
    
    this.isChecking = true;
    
    try {
      const isAvailable = await apiService.testConnection();
      
      this.status = {
        isOnline: navigator.onLine,
        isBackendAvailable: isAvailable,
        lastChecked: new Date(),
        error: isAvailable ? undefined : 'Backend server is not responding'
      };
      
      this.notifyListeners();
      return isAvailable;
    } catch (error) {
      this.status = {
        isOnline: navigator.onLine,
        isBackendAvailable: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Connection check failed'
      };
      
      this.notifyListeners();
      return false;
    } finally {
      this.isChecking = false;
    }
  }

  startMonitoring(intervalMs: number = 30000): void {
    if (typeof window === 'undefined') return;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    setTimeout(() => {
      this.checkBackendConnection();
      this.isInitialized = true;
    }, 1000);
    
    this.checkInterval = setInterval(() => {
      this.checkBackendConnection();
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  addListener(callback: (status: ConnectionStatus) => void): () => void {
    this.listeners.push(callback);
    
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    if (!this.isInitialized) return; 
    
    this.listeners.forEach(callback => {
      try {
        callback(this.status);
      } catch (error) {
        console.error('Error in connection status listener:', error);
      }
    });
  }

  destroy(): void {
    this.stopMonitoring();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnlineStatusChange);
      window.removeEventListener('offline', this.handleOnlineStatusChange);
    }
    
    this.listeners = [];
  }
}

export const connectionMonitor = new ConnectionMonitor();

export function useConnectionStatus() {
  const [status, setStatus] = React.useState<ConnectionStatus>(() => {
    return {
      isOnline: true,
      isBackendAvailable: false,
      lastChecked: new Date(),
    };
  });

  React.useEffect(() => {
    setStatus(connectionMonitor.getStatus());
    
    const unsubscribe = connectionMonitor.addListener(setStatus);
    
    connectionMonitor.startMonitoring();
    
    return () => {
      unsubscribe();
    };
  }, []);

  return status;
}
