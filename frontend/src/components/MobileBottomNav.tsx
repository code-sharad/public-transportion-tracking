'use client';

import { MapPin, Search, Bell, User, Home } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export default function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/',
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      path: '/search',
    },
    {
      id: 'nearby',
      label: 'Nearby',
      icon: MapPin,
      path: '/nearby',
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: Bell,
      path: '/alerts',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className={`
                flex flex-col items-center justify-center px-3 py-2 rounded-lg
                min-h-touch w-16 transition-all duration-200
                ${active
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-700 active:bg-gray-100'
                }
              `}
              style={active ? { backgroundColor: 'var(--color-accent-primary)' } : {}}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span className={`text-xs mt-1 ${active ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}