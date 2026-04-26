'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingCart,
  Armchair,
  UtensilsCrossed,
  CalendarDays,
  BarChart3,
  Users,
  Clock,
  Leaf,
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Aktif Siparisler', icon: ShoppingCart },
  { href: '/admin/tables', label: 'Masa Yonetimi', icon: Armchair },
  { href: '/admin/menu', label: 'Menu Yonetimi', icon: UtensilsCrossed },
  { href: '/admin/reservations', label: 'Rezervasyonlar', icon: CalendarDays },
  { href: '/admin/reports', label: 'Raporlar', icon: BarChart3 },
  { href: '/admin/users', label: 'Kullanicilar', icon: Users },
  { href: '/admin/hours', label: 'Calisma Saatleri', icon: Clock },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground min-h-screen flex flex-col shadow-xl">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sidebar-primary flex items-center justify-center shadow-lg shadow-sidebar-primary/25">
            <Leaf className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Bolena</h1>
            <p className="text-xs text-sidebar-foreground/50">Glutensiz Cafe</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-accent text-white'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white',
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary rounded-r-full" />
              )}
              <Icon className={cn(
                'h-[18px] w-[18px] shrink-0 transition-colors duration-200',
                isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-primary',
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <p className="text-[11px] text-sidebar-foreground/30 text-center">Bolena v1.0</p>
      </div>
    </aside>
  );
}
