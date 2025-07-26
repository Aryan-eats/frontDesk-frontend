'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = () => {
    logout();
  };

  if (!isAuthenticated || pathname === '/login') {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3 ml-2">
            <Image
              src="/allo-logo.png"
              alt="Front Desk Logo"
              width={48}
              height={48}
              className="h-12 w-12"
            />
            <h1 className="text-2xl font-bold text-gray-900">Front Desk</h1>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {(user?.fullName || user?.username || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-gray-700 text-sm font-medium">
                {user?.fullName || user?.username || 'User'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
