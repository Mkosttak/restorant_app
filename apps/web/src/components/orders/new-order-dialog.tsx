'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { ApiMenuItem, ApiTable } from '@bolena/shared';

interface CartItem {
  menuItemId: string;
  quantity: number;
  name: string;
  price: number;
  optionIds: string[];
  optionsLabel: string;
}

interface NewOrderDialogProps {
  tables: ApiTable[];
  menuItems: ApiMenuItem[];
  onCreated: () => void;
}

export function NewOrderDialog({ tables, menuItems, onCreated }: NewOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [orderType, setOrderType] = useState('DINE_IN');
  const [selectedTable, setSelectedTable] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState<ApiMenuItem | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);

  const formatPrice = (cents: number) => `${(cents / 100).toFixed(2)} TL`;

  const addToCart = (item: ApiMenuItem) => {
    setSelectedMenuItem(item);
    setSelectedOptionIds([]);
  };

  const toggleOptionForCurrent = (optionId: string) => {
    setSelectedOptionIds((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
    );
  };

  const confirmAddToCart = () => {
    if (!selectedMenuItem) return;
    const basePrice = selectedMenuItem.campaignPriceCents ?? selectedMenuItem.priceCents;
    const options = (selectedMenuItem.options || []).filter((o) => selectedOptionIds.includes(o.id));
    const optionsExtra = options.reduce((sum, o) => sum + (o.extraPriceCents || 0), 0);
    const unitPrice = basePrice + optionsExtra;
    const optionsLabel = options.map((o) => o.nameTr).join(', ');

    const key = `${selectedMenuItem.id}__${selectedOptionIds.sort().join('_')}`;
    const existingIndex = cart.findIndex(
      (c) => `${c.menuItemId}__${c.optionIds.sort().join('_')}` === key,
    );

    if (existingIndex >= 0) {
      const existing = cart[existingIndex];
      const updated = [...cart];
      updated[existingIndex] = { ...existing, quantity: existing.quantity + 1 };
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          menuItemId: selectedMenuItem.id,
          quantity: 1,
          name: selectedMenuItem.nameTr,
          price: unitPrice,
          optionIds: selectedOptionIds,
          optionsLabel,
        },
      ]);
    }

    setSelectedMenuItem(null);
    setSelectedOptionIds([]);
  };

  const createOrder = async () => {
    try {
      await api.post('/orders', {
        tableId: orderType === 'DINE_IN' ? selectedTable : undefined,
        orderType,
        items: cart.map(c => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity,
          selectedOptions: c.optionIds,
        })),
      });
      setOpen(false);
      setCart([]);
      setSelectedTable('');
      toast.success('Siparis olusturuldu');
      onCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Siparis olusturulamadi');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>+ Yeni Siparis</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Yeni Siparis</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Siparis Tipi</Label>
              <Select value={orderType} onValueChange={v => v && setOrderType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DINE_IN">Masada</SelectItem>
                  <SelectItem value="TAKEAWAY">Gel-Al</SelectItem>
                  <SelectItem value="PLATFORM">Platform</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {orderType === 'DINE_IN' && (
              <div>
                <Label>Masa</Label>
                <Select value={selectedTable} onValueChange={v => v && setSelectedTable(v)}>
                  <SelectTrigger><SelectValue placeholder="Masa secin" /></SelectTrigger>
                  <SelectContent>
                    {tables.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        Masa {t.number} ({t.status === 'AVAILABLE' ? 'Bos' : t.status === 'OCCUPIED' ? 'Dolu' : 'Rezerve'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label>Menu</Label>
            <div className="grid grid-cols-3 gap-2 mt-2 max-h-48 overflow-y-auto">
              {menuItems.filter(m => m.priceCents > 0).map(item => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="text-left p-2 border rounded hover:bg-green-50 text-sm"
                >
                  <p className="font-medium truncate">{item.nameTr}</p>
                  <p className="text-xs text-gray-500">{formatPrice(item.campaignPriceCents ?? item.priceCents)}</p>
                </button>
              ))}
            </div>
          </div>

          {selectedMenuItem && (
            <div className="border rounded p-3 space-y-2">
              <p className="text-sm font-semibold">
                {selectedMenuItem.nameTr} icin opsiyon secin
              </p>
              {Array.isArray(selectedMenuItem.options) && selectedMenuItem.options.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {selectedMenuItem.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleOptionForCurrent(opt.id)}
                      className={`border rounded px-2 py-1 text-left ${
                        selectedOptionIds.includes(opt.id) ? 'bg-green-100 border-green-400' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{opt.nameTr}</span>
                        {opt.extraPriceCents > 0 && (
                          <span className="text-xs text-gray-500">
                            +{formatPrice(opt.extraPriceCents)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Bu urun icin tanimli opsiyon yok. Direkt sepete ekleyebilirsiniz.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedMenuItem(null);
                    setSelectedOptionIds([]);
                  }}
                >
                  Iptal
                </Button>
                <Button size="sm" onClick={confirmAddToCart}>
                  Sepete Ekle
                </Button>
              </div>
            </div>
          )}

          {cart.length > 0 && (
            <div>
              <Label>Sepet</Label>
              <div className="space-y-1 mt-2">
                {cart.map((c, i) => (
                  <div key={i} className="flex justify-between items-center text-sm border-b pb-1">
                    <div className="flex flex-col">
                      <span>
                        {c.name} x{c.quantity}
                      </span>
                      {c.optionsLabel && (
                        <span className="text-xs text-gray-500">
                          {c.optionsLabel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{formatPrice(c.price * c.quantity)}</span>
                      <button className="text-red-500 text-xs" onClick={() => setCart(cart.filter((_, j) => j !== i))}>Sil</button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-1">
                  <span>Toplam</span>
                  <span>{formatPrice(cart.reduce((s, c) => s + c.price * c.quantity, 0))}</span>
                </div>
              </div>
            </div>
          )}

          <Button onClick={createOrder} disabled={cart.length === 0} className="w-full">
            Siparis Olustur
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
