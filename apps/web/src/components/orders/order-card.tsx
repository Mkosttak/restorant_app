'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight, X } from 'lucide-react';
import type { ApiOrder } from '@bolena/shared';

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING: { label: 'Bekliyor', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-l-amber-400' },
  PREPARING: { label: 'Hazirlaniyor', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-l-blue-400' },
  READY: { label: 'Hazir', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-l-emerald-500' },
  SERVED: { label: 'Servis Edildi', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-l-purple-400' },
  COMPLETED: { label: 'Tamamlandi', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-l-gray-300' },
  CANCELLED: { label: 'Iptal', color: 'text-red-700', bg: 'bg-red-50', border: 'border-l-red-400' },
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PREPARING: 'bg-blue-100 text-blue-800',
  READY: 'bg-emerald-100 text-emerald-800',
  SERVED: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Bekliyor',
  PREPARING: 'Hazirlaniyor',
  READY: 'Hazir',
  SERVED: 'Servis Edildi',
  COMPLETED: 'Tamamlandi',
  CANCELLED: 'Iptal',
};

const nextStatus: Record<string, string> = {
  PENDING: 'PREPARING',
  PREPARING: 'READY',
  READY: 'SERVED',
  SERVED: 'COMPLETED',
};

interface OrderCardProps {
  order: ApiOrder;
  onStatusChange: (id: string, status: string) => void;
  onClick: (order: ApiOrder) => void;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Az once';
  if (mins < 60) return `${mins} dk`;
  const hours = Math.floor(mins / 60);
  return `${hours} sa ${mins % 60} dk`;
}

export function OrderCard({ order, onStatusChange, onClick }: OrderCardProps) {
  const formatPrice = (cents: number) => `${(cents / 100).toFixed(2)} TL`;
  const config = statusConfig[order.status] || statusConfig.PENDING;

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all border-l-4 ${config.border} overflow-hidden group`}
      onClick={() => onClick(order)}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-semibold text-foreground">
              {order.table ? `Masa ${order.table.number}` : order.orderType === 'TAKEAWAY' ? 'Gel-Al' : 'Platform'}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-xs">{timeAgo(order.createdAt)}</span>
            </div>
          </div>
          <Badge className={`${statusColors[order.status]} text-[11px] font-medium`}>
            {statusLabels[order.status]}
          </Badge>
        </div>

        <div className="space-y-1 mb-3 py-2 border-t border-dashed border-border/60">
          {order.items.slice(0, 3).map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{item.quantity}x</span> {item.menuItem.nameTr}
              </span>
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-xs text-muted-foreground">+{order.items.length - 3} urun daha</p>
          )}
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-border/60">
          <span className="font-bold text-base text-foreground">{formatPrice(order.totalCents)}</span>
          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            {nextStatus[order.status] && (
              <Button
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => onStatusChange(order.id, nextStatus[order.status])}
              >
                {statusLabels[nextStatus[order.status]]}
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
            {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => onStatusChange(order.id, 'CANCELLED')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { statusColors, statusLabels, nextStatus };
