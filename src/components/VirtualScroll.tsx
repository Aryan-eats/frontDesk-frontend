import React, { 
  useState, 
  useEffect, 
  useRef, 
  useMemo, 
  memo, 
  useCallback 
} from 'react';
import { useIntersectionObserver } from '../hooks/usePerformance';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
  keyExtractor?: (item: T, index: number) => string | number;
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscan = 3,
  keyExtractor = (_, index) => index,
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length - 1
    );
    
    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex,
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, relativeIndex) => {
            const absoluteIndex = visibleRange.startIndex + relativeIndex;
            return (
              <div
                key={keyExtractor(item, absoluteIndex)}
                style={{ height: itemHeight }}
              >
                {renderItem(item, absoluteIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Specialized virtual list for queue items
interface QueueVirtualListProps {
  items: any[];
  onItemClick?: (item: any, index: number) => void;
  onStatusChange?: (item: any, newStatus: string) => void;
  className?: string;
}

export const QueueVirtualList = memo<QueueVirtualListProps>(({
  items,
  onItemClick,
  onStatusChange,
  className = '',
}) => {
  const renderQueueItem = useCallback((item: any, index: number) => {
    const handleClick = () => onItemClick?.(item, index);
    const handleStatusChange = (newStatus: string) => 
      onStatusChange?.(item, newStatus);

    return (
      <div
        className="p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">{item.patientName}</h4>
            <p className="text-sm text-gray-600">Queue #: {item.queueNumber}</p>
            {item.patientPhone && (
              <p className="text-sm text-gray-600">{item.patientPhone}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                item.status === 'waiting'
                  ? 'bg-yellow-100 text-yellow-800'
                  : item.status === 'with-doctor'
                  ? 'bg-blue-100 text-blue-800'
                  : item.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {item.status}
            </span>
            {item.priority === 'urgent' && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Urgent
              </span>
            )}
          </div>
        </div>
        {item.estimatedWaitTime && (
          <p className="text-sm text-gray-500 mt-1">
            Estimated wait: {item.estimatedWaitTime} minutes
          </p>
        )}
      </div>
    );
  }, [onItemClick, onStatusChange]);

  return (
    <VirtualScroll
      items={items}
      itemHeight={80} // Approximate height for queue items
      containerHeight={600} // Fixed height container
      renderItem={renderQueueItem}
      keyExtractor={(item) => item.id}
      className={className}
    />
  );
});

QueueVirtualList.displayName = 'QueueVirtualList';

// Infinite scroll component
interface InfiniteScrollProps<T> {
  items: T[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;
  className?: string;
  threshold?: number;
}

export function InfiniteScroll<T>({
  items,
  hasMore,
  loading,
  onLoadMore,
  renderItem,
  keyExtractor = (_, index) => index,
  className = '',
  threshold = 0.8,
}: InfiniteScrollProps<T>) {
  const [sentinelRef, isIntersecting] = useIntersectionObserver({
    threshold,
  });

  useEffect(() => {
    if (isIntersecting && hasMore && !loading) {
      onLoadMore();
    }
  }, [isIntersecting, hasMore, loading, onLoadMore]);

  return (
    <div className={className}>
      {items.map((item, index) => (
        <div key={keyExtractor(item, index)}>
          {renderItem(item, index)}
        </div>
      ))}
      
      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex justify-center items-center py-4"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600" />
          ) : (
            <div className="text-gray-500 text-sm">Loading more...</div>
          )}
        </div>
      )}
      
      {!hasMore && items.length > 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          No more items to load
        </div>
      )}
    </div>
  );
}

export default VirtualScroll;
