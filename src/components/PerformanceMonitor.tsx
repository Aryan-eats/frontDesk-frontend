'use client';

import { useEffect } from 'react';

interface PerformanceMonitorProps {
  children: React.ReactNode;
}

export default function PerformanceMonitor({ children }: PerformanceMonitorProps) {
  useEffect(() => {
    // Only run in production and if performance API is available
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined' && 'performance' in window) {
      // Monitor Core Web Vitals
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const metricName = entry.name;
          const value = Math.round(entry.startTime);

          // Log performance metrics (in production, send to analytics service)
          console.log(`${metricName}: ${value}ms`);

          // You can send these to your analytics service
          // analytics.track('performance_metric', {
          //   metric: metricName,
          //   value: value,
          //   url: window.location.pathname
          // });
        });
      });

      // Observe different types of performance entries
      try {
        observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
      } catch (error) {
        // Fallback for browsers that don't support all entry types
        console.warn('Performance monitoring not fully supported', error);
      }

      // Monitor First Contentful Paint (FCP)
      const paintObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            console.log(`FCP: ${Math.round(entry.startTime)}ms`);
          }
        });
      });

      try {
        paintObserver.observe({ entryTypes: ['paint'] });
      } catch (error) {
        console.warn('Paint timing not supported', error);
      }

      // Monitor layout shifts (CLS)
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach((entry) => {
          if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
            clsValue += (entry as PerformanceEntry & { value: number }).value;
          }
        });
        if (clsValue > 0) {
          console.log(`CLS: ${clsValue.toFixed(4)}`);
        }
      });

      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch {
        console.warn('Layout shift monitoring not supported');
      }

      // Monitor memory usage (if available)
      if ('memory' in performance) {
        const logMemoryUsage = () => {
          const memory = (performance as Performance & { memory: { usedJSHeapSize: number } }).memory;
          console.log(`Memory Usage: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`);
        };

        // Log memory usage every 30 seconds
        const memoryInterval = setInterval(logMemoryUsage, 30000);

        return () => {
          clearInterval(memoryInterval);
          observer.disconnect();
          paintObserver.disconnect();
          clsObserver.disconnect();
        };
      }

      return () => {
        observer.disconnect();
        paintObserver.disconnect();
        clsObserver.disconnect();
      };
    }
  }, []);

  // Development performance warnings
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Warn about potential performance issues
      const checkPerformance = () => {
        // Check for too many DOM nodes
        const nodeCount = document.querySelectorAll('*').length;
        if (nodeCount > 3000) {
          console.warn(`Performance Warning: ${nodeCount} DOM nodes detected. Consider virtual scrolling or pagination.`);
        }

        // Check for memory leaks (basic check)
        if ('memory' in performance) {
          const memory = (performance as Performance & { memory: { usedJSHeapSize: number } }).memory;
          const heapUsed = memory.usedJSHeapSize / 1024 / 1024;
          if (heapUsed > 100) {
            console.warn(`Performance Warning: High memory usage detected (${Math.round(heapUsed)}MB)`);
          }
        }

        // Check for excessive re-renders (basic detection)
        const renderStart = performance.now();
        setTimeout(() => {
          const renderTime = performance.now() - renderStart;
          if (renderTime > 16) { // 60fps threshold
            console.warn(`Performance Warning: Slow render detected (${Math.round(renderTime)}ms)`);
          }
        }, 0);
      };

      const perfCheckInterval = setInterval(checkPerformance, 10000); // Check every 10 seconds

      return () => clearInterval(perfCheckInterval);
    }
  }, []);

  return <>{children}</>;
}
