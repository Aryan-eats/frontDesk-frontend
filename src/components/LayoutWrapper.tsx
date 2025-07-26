'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return (
      <main>
        {children}
      </main>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="pt-16 pl-64">
        {children}
      </main>
    </>
  );
}
