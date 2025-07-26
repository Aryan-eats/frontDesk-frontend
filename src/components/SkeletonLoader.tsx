import React, { memo } from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

export const Skeleton = memo<SkeletonProps>(({ 
  className = '', 
  width, 
  height, 
  rounded = false 
}) => {
  const style: React.CSSProperties = {
    width,
    height,
  };

  return (
    <div
      className={`animate-pulse bg-gray-200 ${
        rounded ? 'rounded-full' : 'rounded'
      } ${className}`}
      style={style}
    />
  );
});

Skeleton.displayName = 'Skeleton';

// Card skeleton for queue items
export const QueueItemSkeleton = memo(() => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton width="60%" height="20px" />
      <Skeleton width="80px" height="24px" rounded />
    </div>
    <div className="space-y-2">
      <Skeleton width="40%" height="16px" />
      <Skeleton width="80%" height="16px" />
    </div>
    <div className="flex justify-between items-center">
      <Skeleton width="100px" height="16px" />
      <Skeleton width="80px" height="32px" />
    </div>
  </div>
));

QueueItemSkeleton.displayName = 'QueueItemSkeleton';

// Doctor card skeleton
export const DoctorCardSkeleton = memo(() => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
    <div className="flex items-center space-x-4">
      <Skeleton width="64px" height="64px" rounded />
      <div className="space-y-2 flex-1">
        <Skeleton width="60%" height="20px" />
        <Skeleton width="40%" height="16px" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton width="100%" height="16px" />
      <Skeleton width="80%" height="16px" />
    </div>
    <div className="flex justify-between items-center">
      <Skeleton width="100px" height="24px" rounded />
      <Skeleton width="80px" height="32px" />
    </div>
  </div>
));

DoctorCardSkeleton.displayName = 'DoctorCardSkeleton';

// Appointment card skeleton
export const AppointmentCardSkeleton = memo(() => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton width="50%" height="18px" />
      <Skeleton width="60px" height="20px" rounded />
    </div>
    <div className="space-y-2">
      <Skeleton width="70%" height="16px" />
      <Skeleton width="40%" height="14px" />
    </div>
    <div className="flex justify-between items-center">
      <Skeleton width="120px" height="14px" />
      <Skeleton width="60px" height="28px" />
    </div>
  </div>
));

AppointmentCardSkeleton.displayName = 'AppointmentCardSkeleton';

// Dashboard stats skeleton
export const StatCardSkeleton = memo(() => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton width="40px" height="40px" rounded />
      <Skeleton width="60px" height="24px" />
    </div>
    <div className="space-y-2">
      <Skeleton width="60%" height="16px" />
      <Skeleton width="100%" height="32px" />
    </div>
  </div>
));

StatCardSkeleton.displayName = 'StatCardSkeleton';

// Table skeleton
export const TableSkeleton = memo(({ rows = 5 }: { rows?: number }) => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    {/* Table header */}
    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
      <div className="flex space-x-4">
        <Skeleton width="15%" height="16px" />
        <Skeleton width="25%" height="16px" />
        <Skeleton width="20%" height="16px" />
        <Skeleton width="15%" height="16px" />
        <Skeleton width="10%" height="16px" />
      </div>
    </div>
    
    {/* Table rows */}
    <div className="divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="px-6 py-4">
          <div className="flex space-x-4 items-center">
            <Skeleton width="15%" height="16px" />
            <Skeleton width="25%" height="16px" />
            <Skeleton width="20%" height="16px" />
            <Skeleton width="15%" height="16px" />
            <Skeleton width="80px" height="28px" />
          </div>
        </div>
      ))}
    </div>
  </div>
));

TableSkeleton.displayName = 'TableSkeleton';

// Form skeleton
export const FormSkeleton = memo(() => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
    <Skeleton width="40%" height="24px" />
    
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton width="20%" height="16px" />
        <Skeleton width="100%" height="40px" />
      </div>
      
      <div className="space-y-2">
        <Skeleton width="25%" height="16px" />
        <Skeleton width="100%" height="40px" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton width="30%" height="16px" />
          <Skeleton width="100%" height="40px" />
        </div>
        <div className="space-y-2">
          <Skeleton width="25%" height="16px" />
          <Skeleton width="100%" height="40px" />
        </div>
      </div>
      
      <div className="space-y-2">
        <Skeleton width="20%" height="16px" />
        <Skeleton width="100%" height="80px" />
      </div>
    </div>
    
    <div className="flex justify-end space-x-3">
      <Skeleton width="80px" height="36px" />
      <Skeleton width="100px" height="36px" />
    </div>
  </div>
));

FormSkeleton.displayName = 'FormSkeleton';

// List skeleton for queue/appointments lists
export const ListSkeleton = memo(({ 
  items = 6,
  type = 'queue'
}: { 
  items?: number;
  type?: 'queue' | 'doctor' | 'appointment';
}) => {
  const SkeletonComponent = {
    queue: QueueItemSkeleton,
    doctor: DoctorCardSkeleton,
    appointment: AppointmentCardSkeleton,
  }[type];

  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, index) => (
        <SkeletonComponent key={index} />
      ))}
    </div>
  );
});

ListSkeleton.displayName = 'ListSkeleton';

export default Skeleton;
