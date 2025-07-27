'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const routerRef = useRef(router);
  const hasRedirectedRef = useRef(false);

  // Update router ref without causing re-renders
  routerRef.current = router;

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      routerRef.current.push('/login');
    } else if (isAuthenticated) {
      hasRedirectedRef.current = false;
    }
  }, [isAuthenticated, isLoading]); // Removed router from dependencies

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <LoadingSpinner size="lg" color="white" />
          <span className="text-white text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}
