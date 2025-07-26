'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Users, 
  User, 
  Calendar
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Queue', href: '/queue', icon: Users },
    { name: 'Doctors', href: '/doctors', icon: User },
    { name: 'Appointments', href: '/appointments', icon: Calendar },
  ];

  if (pathname === '/login') {
    return null;
  }

  return (
    <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 shadow-sm">
      <div className="p-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const IconComponent = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-violet-400 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <IconComponent className={`h-5 w-5 mr-3 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
