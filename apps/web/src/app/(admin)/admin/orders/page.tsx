'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { OrderCard } from '@/components/orders/order-card';
import { OrderDetailDialog } from '@/components/orders/order-detail-dialog';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Inbox } from 'lucide-react';
import type { ApiOrder, ApiMenuItem, ApiTable } from '@bolena/shared';

export default function OrdersPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [menuItems, setMenuItems] = useState<ApiMenuItem[]>([]);
  const [tables, setTables] = useState<ApiTable[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await api.get<ApiOrder[]>('/orders/active');
      setOrders(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Siparisler yuklenemedi');
    }
  }, []);

  const fetchMenuAndTables = useCallback(async () => {
    try {
      const [items, t] = await Promise.all([
        api.get<ApiMenuItem[]>('/menu'),
        api.get<ApiTable[]>('/tables'),
      ]);
      setMenuItems(items);
      setTables(t);
    } catch {
      // silent fallback
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchOrders(), fetchMenuAndTables()]).finally(() => setLoading(false));
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders, fetchMenuAndTables]);

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success('Durum guncellendi');
      fetchOrders();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Durum guncellenemedi');
    }
  };

  const handleCreateOrder = async (data: {
    tableId?: string; orderType: string; items: { menuItemId: string; quantity: number }[];
  }) => {
    try {
      await api.post('/orders', data);
      toast.success('Siparis olusturuldu');
      fetchOrders();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Siparis olusturulamadi');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'PENDING');
  const preparingOrders = orders.filter(o => o.status === 'PREPARING');
  const readyOrders = orders.filter(o => o.status === 'READY');
  const otherOrders = orders.filter(o => !['PENDING', 'PREPARING', 'READY'].includes(o.status));

  const groups = [
    { label: 'Bekleyen', orders: pendingOrders, color: 'bg-amber-500' },
    { label: 'Hazirlanan', orders: preparingOrders, color: 'bg-blue-500' },
    { label: 'Hazir', orders: readyOrders, color: 'bg-emerald-500' },
    ...(otherOrders.length > 0 ? [{ label: 'Diger', orders: otherOrders, color: 'bg-gray-400' }] : []),
  ];

  return (
    <div className="animate-slide-in-up">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-foreground">Aktif Siparisler</h2>
          <Badge variant="secondary" className="text-xs font-semibold">{orders.length}</Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: '3s' }} />
          Otomatik guncelleniyor
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Inbox className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground">Aktif siparis yok</p>
          <p className="text-sm text-muted-foreground mt-1">Yeni siparisler burada gorunecek</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.filter(g => g.orders.length > 0).map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-2 w-2 rounded-full ${group.color}`} />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.label}
                </h3>
                <span className="text-xs text-muted-foreground">({group.orders.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {group.orders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={handleStatusChange}
                    onClick={setSelectedOrder}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <OrderDetailDialog
        order={selectedOrder}
        menuItems={menuItems}
        onClose={() => setSelectedOrder(null)}
        onUpdate={fetchOrders}
      />
    </div>
  );
}
