'use client';

import { usePathname } from 'next/navigation';
import { useState, memo, useCallback, useMemo } from 'react';
import Sidebar from './Sidebar';
import Navigation from './Navigation';

const LayoutWrapper = memo<{ children: React.ReactNode }>(({ children }) => {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Memoize computed values
  const isLoginPage = useMemo(() => pathname === '/login', [pathname]);

  // Memoize event handlers
  const handleMenuClick = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen]);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Early return for login page
  if (isLoginPage) {
    return (
      <main>
        {children}
      </main>
    );
  }

  return (
    <>
      <Navigation onMenuClick={handleMenuClick} />
      <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />
      <main className="pt-16 md:pl-64 min-h-screen bg-gray-50">
        <div className="w-full max-w-full overflow-hidden">
          {children}
        </div>
      </main>
    </>
  );
});

LayoutWrapper.displayName = 'LayoutWrapper';

export default LayoutWrapper;
