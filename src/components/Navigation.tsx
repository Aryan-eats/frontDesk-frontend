'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuthState, useAuthActions } from '../contexts/AuthContext';
import { LogOut, Menu } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';

interface NavigationProps {
  onMenuClick: () => void;
}

const Navigation = memo<NavigationProps>(({ onMenuClick }) => {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthState();
  const { logout } = useAuthActions();

  // Memoize logout handler
  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  // Memoize user display data
  const userDisplayData = useMemo(() => {
    if (!user) return { initial: 'U', name: 'User' };
    
    const name = user.fullName || user.username || 'User';
    const initial = name.charAt(0).toUpperCase();
    
    return { initial, name };
  }, [user]);

  if (!isAuthenticated || pathname === '/login') {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and hamburger */}
          <div className="flex items-center space-x-3">
            {/* Hamburger menu for mobile */}
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>

            {/* Logo and Title */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Image
                src="/allo-logo.png"
                alt="Front Desk Logo"
                width={48}
                height={48}
                className="h-8 w-8 sm:h-12 sm:w-12"
                priority
              />
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                <span className="hidden sm:inline">Front Desk</span>
                <span className="sm:hidden">FD</span>
              </h1>
            </div>
          </div>

          {/* Right side - User Menu */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm font-medium">
                  {userDisplayData.initial}
                </span>
              </div>
              <span className="text-gray-700 text-xs sm:text-sm font-medium hidden sm:block lg:block">
                {userDisplayData.name}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
              aria-label="Logout"
            >
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
});

Navigation.displayName = 'Navigation';

export default Navigation;
