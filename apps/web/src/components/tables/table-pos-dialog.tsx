'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { ApiTable, ApiOrder, ApiMenuItem, ApiCategory } from '@bolena/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const fPrice = (cents: number) => `${(cents / 100).toFixed(2)} TL`;

interface TablePosDialogProps {
  table: ApiTable | null;
  onClose: () => void;
  onTableUpdated: () => void;
}

export function TablePosDialog({ table, onClose, onTableUpdated }: TablePosDialogProps) {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [menuItems, setMenuItems] = useState<ApiMenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const [activeOrder, setActiveOrder] = useState<ApiOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [isDiscounting, setIsDiscounting] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [tables, setTables] = useState<ApiTable[]>([]);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentAmountStr, setPaymentAmountStr] = useState('');

  useEffect(() => {
    if (table) {
      loadData();
    } else {
      setActiveOrder(null);
    }
  }, [table]);

  const loadData = async () => {
    if (!table) return;
    try {
      setLoadingOrder(true);
      const [cats, items, allOrders, allTables] = await Promise.all([
        api.get<ApiCategory[]>('/categories'),
        api.get<ApiMenuItem[]>('/menu'),
        api.get<ApiOrder[]>('/orders/active'),
        api.get<ApiTable[]>('/tables'),
      ]);
      setCategories(cats.filter((c) => c.isActive));
      setMenuItems(items.filter((i) => i.isAvailable));
      setTables(allTables.filter(t => t.isActive));
      
      const tableOrder = allOrders.find(o => o.table?.id === table.id);
      setActiveOrder(tableOrder || null);
    } catch {
      toast.error('Menü ve sipariş bilgileri yüklenemedi');
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleCreateOrderAndAddItem = async (menuItem: ApiMenuItem) => {
    if (!table) return;
    try {
      if (activeOrder) {
         // Existing order, append item
         await api.post(`/orders/${activeOrder.id}/items`, {
           menuItemId: menuItem.id,
           quantity: 1,
         });
      } else {
         // Create new order with this item
         const newOrder = await api.post<ApiOrder>('/orders', {
           tableId: table.id,
           orderType: 'DINE_IN',
           items: [{ menuItemId: menuItem.id, quantity: 1 }],
         });
         setActiveOrder(newOrder);
      }
      toast.success(`${menuItem.nameTr} eklendi`);
      await loadData();
      onTableUpdated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ürün eklenemedi');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!activeOrder) return;
    try {
      await api.delete(`/orders/${activeOrder.id}/items/${itemId}`);
      toast.success('Ürün çıkarıldı');
      await loadData();
      onTableUpdated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ürün silinemedi');
    }
  };

  const handleUpdateItem = async (itemId: string, data: { quantity?: number; isComplimentary?: boolean; note?: string }) => {
    if (!activeOrder) return;
    try {
      await api.patch(`/orders/${activeOrder.id}/items/${itemId}`, data);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ürün güncellenemedi');
    }
  };

  const handleApplyDiscount = async () => {
    if (!activeOrder) return;
    const cents = Math.round(parseFloat(discountInput) * 100);
    if (isNaN(cents) || cents < 0) {
      toast.error('Geçerli bir indirim tutarı giriniz');
      return;
    }
    if (cents > activeOrder.totalCents) {
      toast.error('İndirim tutarı toplam tutardan büyük olamaz');
      return;
    }
    try {
      await api.patch(`/orders/${activeOrder.id}/discount`, { discountCents: cents });
      toast.success('İndirim başarıyla uygulandı');
      setIsDiscounting(false);
      setDiscountInput('');
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'İndirim uygulanamadı');
    }
  };

  const handleFullComplimentary = async () => {
    if (!activeOrder) return;
    try {
      await api.patch(`/orders/${activeOrder.id}/discount`, { discountCents: activeOrder.totalCents });
      toast.success('Tüm sipariş ikram olarak işaretlendi');
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'İşlem başarısız');
    }
  };

  const handleTransferTable = async (newTableId: string | null) => {
    if (!activeOrder || !newTableId) return;
    try {
      await api.patch(`/orders/${activeOrder.id}/table`, { tableId: newTableId });
      toast.success('Masa başarıyla taşındı');
      onClose();
      onTableUpdated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Taşıma başarısız');
    }
  };

  const handlePayment = async (method: 'CASH' | 'CREDIT_CARD') => {
    if (!activeOrder || !table) return;
    
    const subTotal = activeOrder.totalCents || 0;
    const discount = activeOrder.discountCents || 0;
    const totalPaid = activeOrder.payments?.reduce((sum, p) => sum + p.amountCents, 0) || 0;
    const grandTotal = Math.max(0, subTotal - discount);
    const remainingAmount = Math.max(0, grandTotal - totalPaid);

    const cents = paymentAmountStr ? Math.round(parseFloat(paymentAmountStr) * 100) : remainingAmount;
    if (isNaN(cents) || cents <= 0) {
      toast.error('Geçerli bir tutar girin');
      return;
    }
    if (cents > remainingAmount) {
      toast.error('Kalan tutardan fazla ödeme alınamaz');
      return;
    }

    try {
      await api.post(`/payments`, {
        orderId: activeOrder.id,
        amountCents: cents,
        method,
      });
      
      if (cents >= remainingAmount) {
        toast.success('Ödeme tamamlandı ve masa boşaltıldı!');
        onClose();
        onTableUpdated();
      } else {
        toast.success(`${fPrice(cents)} tahsil edildi`);
        setPaymentAmountStr('');
        setIsPaying(false);
        await loadData();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ödeme alınamadı');
    }
  };

  const filteredMenuItems = activeCategory
    ? menuItems.filter(item => item.categoryId === activeCategory)
    : menuItems;

  return (
    <Dialog open={!!table} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="!max-w-[96vw] !w-full !h-[96vh] p-0 flex flex-col overflow-hidden"
        style={{ maxWidth: '96vw', width: '100%', height: '96vh' }}
      >
        <DialogHeader className="p-4 border-b bg-gray-50 flex flex-row items-center justify-between">
          <DialogTitle className="text-xl flex flex-row items-center gap-4 w-full justify-between pr-8">
            <div className="flex items-center">
              {table ? `Masa ${table.number} - ${table.label || 'POS'}` : 'POS'}
              {table?.status === 'RESERVED' && <Badge className="ml-2 bg-yellow-100 text-yellow-800">Rezerve</Badge>}
            </div>
            {activeOrder && (
              <Select onValueChange={handleTransferTable}>
                <SelectTrigger className="w-[180px] h-8 text-sm bg-white font-normal">
                  <SelectValue placeholder="Masa Taşı" />
                </SelectTrigger>
                <SelectContent>
                  {tables.filter(t => t.id !== table?.id && t.status === 'AVAILABLE').map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      Masa {t.number} {t.label ? `(${t.label})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PANEL: MENU GRID */}
          <div className="w-2/3 border-r bg-gray-50/50 flex flex-col">
            {/* Categories */}
            <div className="flex gap-2 p-4 overflow-x-auto border-b hide-scrollbar">
              <Button
                variant={activeCategory === null ? 'default' : 'outline'}
                onClick={() => setActiveCategory(null)}
                className="whitespace-nowrap"
              >
                Tümü
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat.id}
                  variant={activeCategory === cat.id ? 'default' : 'outline'}
                  onClick={() => setActiveCategory(cat.id)}
                  className="whitespace-nowrap"
                >
                  {cat.nameTr}
                </Button>
              ))}
            </div>
            
            {/* Menu Items Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredMenuItems.map((item) => {
                  const currentPrice = item.campaignPriceCents ?? item.priceCents;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleCreateOrderAndAddItem(item)}
                      className="flex flex-col items-center justify-center p-4 border rounded-xl bg-white hover:bg-green-50 hover:border-green-200 transition-all shadow-sm active:scale-95 min-h-[120px]"
                    >
                      <span className="font-semibold text-center text-sm mb-2">{item.nameTr}</span>
                      <span className="text-green-700 font-bold text-sm bg-green-50 px-2 py-1 rounded">
                        {fPrice(currentPrice)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: CART & PAYMENT */}
          <div className="w-1/3 flex flex-col bg-white">
            <div className="p-4 border-b bg-gray-50 font-medium">Sipariş Özeti</div>
            
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingOrder && <div className="text-center text-sm text-gray-400">Yükleniyor...</div>}
              {!loadingOrder && (!activeOrder || activeOrder.items.length === 0) && (
                <div className="text-center text-gray-400 mt-20">Masada aktif sipariş yok, ürün seçerek başlayın.</div>
              )}
              {activeOrder?.items.map(oItem => (
                <div key={oItem.id} className="flex justify-between items-start border-b border-gray-100 pb-2">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Button 
                          size="icon" variant="outline" className="h-6 w-6" 
                          onClick={() => handleUpdateItem(oItem.id, { quantity: Math.max(1, oItem.quantity - 1) })}
                        >-</Button>
                        <span>{oItem.quantity}</span>
                        <Button 
                          size="icon" variant="outline" className="h-6 w-6" 
                          onClick={() => handleUpdateItem(oItem.id, { quantity: oItem.quantity + 1 })}
                        >+</Button>
                        <span className="ml-1">{oItem.menuItem.nameTr}</span>
                      </div>
                      {oItem.note && <div className="text-xs text-blue-600 mt-0.5 italic max-w-[180px] truncate">Not: {oItem.note}</div>}
                    </span>
                    {oItem.isComplimentary && <Badge variant="secondary" className="w-fit text-xs bg-orange-100 text-orange-700">İkram</Badge>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-sm font-semibold ${oItem.isComplimentary ? 'line-through text-gray-400' : ''}`}>
                      {fPrice((oItem.menuItem.campaignPriceCents ?? oItem.menuItem.priceCents) * oItem.quantity)}
                    </span>
                    <div className="flex gap-1 mt-1">
                      <button 
                        onClick={() => {
                          const note = window.prompt("Sipariş notu girin:", oItem.note || "");
                          if (note !== null) handleUpdateItem(oItem.id, { note });
                        }}
                        className="text-xs text-blue-500 hover:bg-blue-50 px-2 py-0.5 rounded border border-transparent font-medium"
                      >
                        Not
                      </button>
                      <button 
                        onClick={() => handleUpdateItem(oItem.id, { isComplimentary: !oItem.isComplimentary })}
                        className="text-xs text-orange-600 hover:bg-orange-50 px-2 py-0.5 rounded border border-transparent font-medium"
                      >
                        İkram {oItem.isComplimentary ? 'İptal' : 'Yap'}
                      </button>
                      <button 
                        onClick={() => handleRemoveItem(oItem.id)}
                        className="text-xs text-red-500 hover:bg-red-50 px-2 py-0.5 rounded border border-transparent font-medium"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals & Actions */}
            <div className="p-4 border-t bg-gray-50 flex flex-col gap-3">
              <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                <span>Ara Toplam</span>
                <span>{fPrice(activeOrder?.totalCents || 0)}</span>
              </div>
              {(activeOrder?.discountCents || 0) > 0 && (
                <div className="flex justify-between items-center text-sm text-orange-600 font-medium pb-2 border-b border-gray-200">
                  <span>İndirim</span>
                  <span>- {fPrice(activeOrder!.discountCents)}</span>
                </div>
              )}
              {(() => {
                const subTotal = activeOrder?.totalCents || 0;
                const discount = activeOrder?.discountCents || 0;
                const grandTotal = Math.max(0, subTotal - discount);
                const totalPaid = activeOrder?.payments?.reduce((sum, p) => sum + p.amountCents, 0) || 0;
                const remaining = Math.max(0, grandTotal - totalPaid);

                return (
                  <>
                    {(totalPaid > 0) && (
                      <div className="flex justify-between items-center text-sm text-blue-600 font-medium pb-1 border-b border-gray-200">
                        <span>Ödenen Tutar</span>
                        <span>- {fPrice(totalPaid)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-2xl font-bold mt-1">
                      <span>Kalan Tutar</span>
                      <span className={remaining > 0 ? "text-green-700" : "text-gray-500"}>
                        {fPrice(remaining)}
                      </span>
                    </div>

                    {!isDiscounting && !isPaying && remaining > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Button 
                          variant="outline" 
                          disabled={!activeOrder || grandTotal <= 0}
                          onClick={() => setIsDiscounting(true)}
                        >
                          İndirim Uygula
                        </Button>
                        <Button 
                          variant="secondary"
                          className="bg-orange-100 text-orange-700 hover:bg-orange-200"
                          disabled={!activeOrder || grandTotal <= 0}
                          onClick={handleFullComplimentary}
                        >
                          Tümünü İkram Yap
                        </Button>
                        <Button 
                          className="col-span-2 h-14 text-lg bg-green-600 hover:bg-green-700"
                          disabled={!activeOrder || remaining <= 0}
                          onClick={() => setIsPaying(true)}
                        >
                          Ödeme Al ({fPrice(remaining)})
                        </Button>
                      </div>
                    )}

                    {isDiscounting && (
                      <div className="flex flex-col gap-2 mt-2">
                        <span className="text-sm font-medium">İndirim Tutarı Girin (TL)</span>
                        <div className="flex gap-2 h-12">
                          <input 
                            type="number" 
                            className="flex-1 border rounded px-3 py-2 text-lg text-right" 
                            placeholder="0.00"
                            value={discountInput}
                            onChange={(e) => setDiscountInput(e.target.value)}
                            autoFocus
                          />
                          <Button onClick={handleApplyDiscount} className="bg-green-600 hover:bg-green-700 h-full">Uygula</Button>
                          <Button variant="ghost" onClick={() => setIsDiscounting(false)} className="h-full">İptal</Button>
                        </div>
                      </div>
                    )}

                    {isPaying && (
                      <div className="flex flex-col gap-2 mt-2 bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-blue-900">Tahsil Edilecek (TL)</span>
                          <span className="text-xs text-blue-600 cursor-pointer hover:underline" onClick={() => setPaymentAmountStr((remaining / 100).toString())}>Tümünü Seç</span>
                        </div>
                        <div className="flex gap-2 h-12 mb-3">
                          <input 
                            type="number" 
                            className="flex-1 border-blue-200 rounded px-3 py-2 text-xl text-right font-medium focus:ring-blue-500" 
                            placeholder={(remaining / 100).toFixed(2)}
                            value={paymentAmountStr}
                            onChange={(e) => setPaymentAmountStr(e.target.value)}
                            autoFocus
                          />
                          <Button variant="ghost" onClick={() => {setIsPaying(false); setPaymentAmountStr('');}} className="h-full text-blue-700 hover:bg-blue-100">İptal</Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            className="bg-green-600 hover:bg-green-700 h-10 shadow-sm"
                            onClick={() => handlePayment('CASH')}
                          >
                            Nakit Tahsil Et
                          </Button>
                          <Button 
                            className="bg-blue-600 hover:bg-blue-700 h-10 shadow-sm"
                            onClick={() => handlePayment('CREDIT_CARD')}
                          >
                            Kredi Kartı Tahsil Et
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
