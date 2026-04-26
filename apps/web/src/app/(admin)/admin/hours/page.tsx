'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Pencil, X, Check, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';

interface BusinessHour {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

const dayNames = ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'];
const dayShort = ['Pz', 'Pt', 'Sa', 'Ca', 'Pe', 'Cu', 'Ct'];

export default function HoursPage() {
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<BusinessHour[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await api.get<BusinessHour[]>('/business-hours');
      setHours(data);
      setForm(data.map(h => ({ ...h })));
    } catch (err: any) {
      toast.error(err?.message || 'Calisma saatleri yuklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      await Promise.all(form.map(h =>
        api.put('/business-hours', {
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: h.isClosed,
        })
      ));
      toast.success('Calisma saatleri guncellendi');
      setEditing(false);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Kaydetme basarisiz');
    }
  };

  const updateDay = (index: number, field: string, value: string | boolean) => {
    setForm(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  const sorted = (editing ? form : hours).slice().sort((a, b) => {
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.indexOf(a.dayOfWeek) - order.indexOf(b.dayOfWeek);
  });

  const todayIndex = new Date().getDay();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-96 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calisma Saatleri</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Haftalik calisma programi</p>
        </div>
        {!editing ? (
          <Button onClick={() => setEditing(true)} variant="outline" className="gap-2">
            <Pencil className="h-4 w-4" />
            Duzenle
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setEditing(false); setForm(hours.map(h => ({ ...h }))); }} className="gap-2">
              <X className="h-4 w-4" />
              Iptal
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Check className="h-4 w-4" />
              Kaydet
            </Button>
          </div>
        )}
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Haftalik Program
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/60">
            {sorted.map((h) => {
              const idx = (editing ? form : hours).findIndex(x => x.dayOfWeek === h.dayOfWeek);
              const isToday = h.dayOfWeek === todayIndex;

              return (
                <div
                  key={h.dayOfWeek}
                  className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                    isToday ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 w-36 shrink-0">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      isToday
                        ? 'bg-primary text-primary-foreground'
                        : h.isClosed
                          ? 'bg-red-50 text-red-500'
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {dayShort[h.dayOfWeek]}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
                        {dayNames[h.dayOfWeek]}
                      </p>
                      {isToday && <p className="text-[10px] text-primary font-medium">Bugun</p>}
                    </div>
                  </div>

                  {editing ? (
                    <div className="flex items-center gap-3 flex-1">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form[idx]?.isClosed ?? false}
                          onChange={e => updateDay(idx, 'isClosed', e.target.checked)}
                          className="rounded border-input"
                        />
                        <span className="text-muted-foreground">Kapali</span>
                      </label>
                      {!form[idx]?.isClosed && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Sun className="h-3.5 w-3.5 text-amber-500" />
                            <Input
                              type="time"
                              value={form[idx]?.openTime ?? ''}
                              onChange={e => updateDay(idx, 'openTime', e.target.value)}
                              className="w-28 h-9"
                            />
                          </div>
                          <span className="text-muted-foreground">-</span>
                          <div className="flex items-center gap-1">
                            <Moon className="h-3.5 w-3.5 text-blue-500" />
                            <Input
                              type="time"
                              value={form[idx]?.closeTime ?? ''}
                              onChange={e => updateDay(idx, 'closeTime', e.target.value)}
                              className="w-28 h-9"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1">
                      {h.isClosed ? (
                        <Badge variant="secondary" className="bg-red-50 text-red-600 border-red-200 text-xs">
                          Kapali
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono gap-1">
                            <Sun className="h-3 w-3 text-amber-500" />
                            {h.openTime}
                          </Badge>
                          <span className="text-muted-foreground text-xs">-</span>
                          <Badge variant="outline" className="text-xs font-mono gap-1">
                            <Moon className="h-3 w-3 text-blue-500" />
                            {h.closeTime}
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
