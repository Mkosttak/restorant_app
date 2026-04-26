'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { statusColors, statusLabels, nextStatus } from './order-card';
import type { ApiOrder, ApiMenuItem } from '@bolena/shared';

interface OrderDetailDialogProps {
  order: ApiOrder | null;
  menuItems: ApiMenuItem[];
  onClose: () => void;
  onUpdate: () => void;
}

export function OrderDetailDialog({ order, menuItems, onClose, onUpdate }: OrderDetailDialogProps) {
  const [addItemOpen, setAddItemOpen] = useState(false);

  if (!order) return null;

  const formatPrice = (cents: number) => `${(cents / 100).toFixed(2)} TL`;

  const updateStatus = async (status: string) => {
    try {
      await api.patch(`/orders/${order.id}/status`, { status });
      toast.success('Durum guncellendi');
      onUpdate();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Durum guncellenemedi');
    }
  };

  const addItemToOrder = async (menuItemId: string) => {
    try {
      await api.post(`/orders/${order.id}/items`, { menuItemId, quantity: 1 });
      toast.success('Urun eklendi');
      setAddItemOpen(false);
      onUpdate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Urun eklenemedi');
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await api.delete(`/orders/${order.id}/items/${itemId}`);
      toast.success('Urun kaldirildi');
      onUpdate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Urun kaldirilamadi');
    }
  };

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Siparis Detayi - {order.table ? `Masa ${order.table.number}` : order.orderType === 'TAKEAWAY' ? 'Gel-Al' : 'Platform'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-between">
            <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
            <span className="text-sm text-gray-500">{order.user.name}</span>
          </div>

          <div className="space-y-2">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm border-b pb-1">
                <div>
                  <span className="font-medium">{item.quantity}x {item.menuItem.nameTr}</span>
                  {item.isComplimentary && <Badge className="ml-2 text-xs" variant="secondary">Ikram</Badge>}
                  {item.note && <p className="text-xs text-gray-400">{item.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span>{formatPrice(item.unitPriceCents * item.quantity)}</span>
                  {!['COMPLETED', 'CANCELLED'].includes(order.status) && (
                    <button className="text-red-400 text-xs" onClick={() => removeItem(item.id)}>x</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between font-bold border-t pt-2">
            <span>Toplam</span>
            <span>{formatPrice(order.totalCents)}</span>
          </div>

          {!['COMPLETED', 'CANCELLED'].includes(order.status) && (
            <div className="flex gap-2">
              <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
                <DialogTrigger render={<Button variant="outline" size="sm" />}>+ Urun Ekle</DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Urun Ekle</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {menuItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => addItemToOrder(item.id)}
                        className="text-left p-2 border rounded hover:bg-green-50 text-sm"
                      >
                        <p className="font-medium truncate">{item.nameTr}</p>
                        <p className="text-xs text-gray-500">{formatPrice(item.campaignPriceCents ?? item.priceCents)}</p>
                      </button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
              {nextStatus[order.status] && (
                <Button size="sm" onClick={() => updateStatus(nextStatus[order.status])}>
                  {statusLabels[nextStatus[order.status]]}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
