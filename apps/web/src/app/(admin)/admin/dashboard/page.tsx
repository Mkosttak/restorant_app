'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import {
  Armchair,
  Users as UsersIcon,
  UtensilsCrossed,
  ShoppingCart,
  Plus,
  ArrowRight,
  CircleDot,
  CircleCheck,
  CirclePause,
} from 'lucide-react';

interface DashboardData {
  tables: { id: string; number: number; status: string; label: string }[];
  menuItemCount: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [tables, setTables] = useState<DashboardData['tables']>([]);
  const [menuItemCount, setMenuItemCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardData['tables']>('/tables').then(setTables).catch(() => {}),
      api.get<any[]>('/menu').then((items) => setMenuItemCount(items.length)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const occupiedTables = tables.filter((t) => t.status === 'OCCUPIED').length;
  const availableTables = tables.filter((t) => t.status === 'AVAILABLE').length;
  const reservedTables = tables.filter((t) => t.status === 'RESERVED').length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Gunaydin' : hour < 18 ? 'Iyi gunler' : 'Iyi aksamlar';

  const stats = [
    {
      title: 'Toplam Masa',
      value: tables.length,
      icon: Armchair,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Dolu Masa',
      value: occupiedTables,
      icon: CircleDot,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      title: 'Bos Masa',
      value: availableTables,
      icon: CircleCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Menu Urunu',
      value: menuItemCount,
      icon: UtensilsCrossed,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
  ];

  const quickActions = [
    { label: 'Yeni Siparis', href: '/admin/orders', icon: ShoppingCart },
    { label: 'Masa Ekle', href: '/admin/tables', icon: Plus },
    { label: 'Menu Duzenle', href: '/admin/menu', icon: UtensilsCrossed },
    { label: 'Kullanicilar', href: '/admin/users', icon: UsersIcon },
  ];

  const statusConfig: Record<string, { label: string; bg: string; border: string; text: string; icon: typeof CircleDot }> = {
    AVAILABLE: { label: 'Bos', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CircleCheck },
    OCCUPIED: { label: 'Dolu', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: CircleDot },
    RESERVED: { label: 'Rezerve', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: CirclePause },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 rounded-lg bg-muted animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in-up">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bugunun ozetini asagida gorebilirsiniz
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Hizli Erisim</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all"
                  >
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-xs font-medium">{action.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Table Status */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Masa Durumu</CardTitle>
          <Link href="/admin/tables">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
              Tumu <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {tables.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Henuz masa eklenmemis.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {tables.map((table) => {
                const config = statusConfig[table.status] || statusConfig.AVAILABLE;
                const StatusIcon = config.icon;
                return (
                  <div
                    key={table.id}
                    className={`${config.bg} border ${config.border} rounded-xl p-3 text-center transition-all hover:shadow-sm`}
                  >
                    <p className={`font-bold text-lg ${config.text}`}>{table.number}</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <StatusIcon className={`h-3 w-3 ${config.text}`} />
                      <p className={`text-xs ${config.text}`}>{config.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
