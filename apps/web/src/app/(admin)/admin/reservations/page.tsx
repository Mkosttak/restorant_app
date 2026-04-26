'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  CalendarDays,
  Clock,
  Users,
  Phone,
  StickyNote,
  Check,
  X,
  Armchair,
  UserCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface Table { id: string; number: number; label: string }
interface Reservation {
  id: string; customerName: string; customerPhone?: string;
  guestCount: number; reservedAt: string; note?: string; status: string;
  table: Table;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  PENDING: { label: 'Bekliyor', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  CONFIRMED: { label: 'Onaylandi', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Check },
  SEATED: { label: 'Oturtuldu', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: Armchair },
  CANCELLED: { label: 'Iptal', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: X },
  NO_SHOW: { label: 'Gelmedi', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', icon: UserCircle },
};

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    tableId: '', customerName: '', customerPhone: '',
    guestCount: 2, reservedAt: '', note: '',
  });

  const load = useCallback(async () => {
    try {
      const [r, t] = await Promise.all([
        api.get<Reservation[]>(`/reservations?date=${selectedDate}`),
        api.get<Table[]>('/tables'),
      ]);
      setReservations(r); setTables(t);
    } catch (err: any) {
      toast.error(err?.message || 'Veriler yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    try {
      await api.post('/reservations', form);
      toast.success('Rezervasyon olusturuldu');
      setDialogOpen(false);
      setForm({ tableId: '', customerName: '', customerPhone: '', guestCount: 2, reservedAt: '', note: '' });
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Rezervasyon olusturulamadi');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/reservations/${id}/status`, { status });
      toast.success('Durum guncellendi');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Durum guncellenemedi');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Rezervasyonu silmek istediginizden emin misiniz?')) return;
    try {
      await api.delete(`/reservations/${id}`);
      toast.success('Rezervasyon silindi');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Rezervasyon silinemedi');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rezervasyonlar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {reservations.length} rezervasyon
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-48 pl-10"
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button className="gap-2" />}>
              <Plus className="h-4 w-4" />
              Rezervasyon
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Yeni Rezervasyon</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Musteri Adi</Label>
                  <Input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Masa</Label>
                    <Select value={form.tableId} onValueChange={v => v && setForm({ ...form, tableId: v })}>
                      <SelectTrigger><SelectValue placeholder="Masa secin" /></SelectTrigger>
                      <SelectContent>
                        {tables.map(t => <SelectItem key={t.id} value={t.id}>Masa {t.number}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Kisi Sayisi</Label>
                    <Input type="number" value={form.guestCount} onChange={e => setForm({ ...form, guestCount: parseInt(e.target.value) || 2 })} />
                  </div>
                </div>
                <div>
                  <Label>Tarih & Saat</Label>
                  <Input type="datetime-local" value={form.reservedAt} onChange={e => setForm({ ...form, reservedAt: e.target.value })} />
                </div>
                <div>
                  <Label>Not</Label>
                  <Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
                </div>
                <Button onClick={handleSubmit} className="w-full">Olustur</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {reservations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <CalendarDays className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground">Bu tarihte rezervasyon yok</p>
          <p className="text-sm text-muted-foreground mt-1">Farkli bir tarih secin veya yeni rezervasyon olusturun</p>
        </div>
      )}

      <div className="space-y-3">
        {reservations.map(res => {
          const config = statusConfig[res.status] || statusConfig.PENDING;
          const StatusIcon = config.icon;
          return (
            <Card key={res.id} className={`border ${config.bg} overflow-hidden hover:shadow-sm transition-shadow`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="text-center shrink-0 min-w-[64px]">
                      <p className="text-xl font-bold text-foreground">
                        {new Date(res.reservedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <Armchair className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Masa {res.table.number}</p>
                      </div>
                    </div>

                    <div className="border-l border-border/60 pl-4 min-w-0">
                      <p className="font-semibold text-foreground truncate">{res.customerName}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {res.guestCount} kisi
                        </span>
                        {res.customerPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {res.customerPhone}
                          </span>
                        )}
                        {res.note && (
                          <span className="flex items-center gap-1">
                            <StickyNote className="h-3 w-3" /> {res.note}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`${config.bg} ${config.color} border text-xs gap-1`}>
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                    {res.status === 'PENDING' && (
                      <Button size="sm" className="h-8 text-xs" onClick={() => updateStatus(res.id, 'CONFIRMED')}>
                        Onayla
                      </Button>
                    )}
                    {res.status === 'CONFIRMED' && (
                      <Button size="sm" className="h-8 text-xs" onClick={() => updateStatus(res.id, 'SEATED')}>
                        Oturt
                      </Button>
                    )}
                    {!['CANCELLED', 'NO_SHOW', 'SEATED'].includes(res.status) && (
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => updateStatus(res.id, 'CANCELLED')}>
                        Iptal
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(res.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
