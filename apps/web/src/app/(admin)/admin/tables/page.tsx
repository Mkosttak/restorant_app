'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TablePosDialog } from '@/components/tables/table-pos-dialog';
import {
  Plus,
  Pencil,
  Trash2,
  CircleCheck,
  CircleDot,
  CirclePause,
  Armchair,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

interface Table {
  id: string;
  number: number;
  label: string;
  capacity: number;
  status: string;
}

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Table | null>(null);
  const [form, setForm] = useState({ number: 0, label: '', capacity: 4 });
  const [posTable, setPosTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTables = useCallback(async () => {
    try {
      const data = await api.get<Table[]>('/tables');
      setTables(data);
    } catch {
      toast.error('Masalar yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTables(); }, [loadTables]);

  const handleSubmit = async () => {
    try {
      if (editing) {
        await api.put(`/tables/${editing.id}`, form);
        toast.success('Masa guncellendi');
      } else {
        await api.post('/tables', form);
        toast.success('Masa eklendi');
      }
      setDialogOpen(false);
      setForm({ number: 0, label: '', capacity: 4 });
      setEditing(null);
      loadTables();
    } catch (err: any) {
      toast.error(err?.message || 'Islem basarisiz');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu masayi silmek istediginizden emin misiniz?')) return;
    try {
      await api.delete(`/tables/${id}`);
      toast.success('Masa silindi');
      loadTables();
    } catch (err: any) {
      toast.error(err?.message || 'Masa silinemedi');
    }
  };

  const statusConfig: Record<string, { label: string; bg: string; border: string; text: string; icon: typeof CircleDot; iconBg: string }> = {
    AVAILABLE: { label: 'Bos', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CircleCheck, iconBg: 'bg-emerald-100' },
    OCCUPIED: { label: 'Dolu', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: CircleDot, iconBg: 'bg-red-100' },
    RESERVED: { label: 'Rezerve', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: CirclePause, iconBg: 'bg-amber-100' },
  };

  const occupiedCount = tables.filter(t => t.status === 'OCCUPIED').length;
  const availableCount = tables.filter(t => t.status === 'AVAILABLE').length;
  const reservedCount = tables.filter(t => t.status === 'RESERVED').length;

  const summaryCards = [
    { label: 'Toplam', value: tables.length, icon: Armchair, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Bos', value: availableCount, icon: CircleCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Dolu', value: occupiedCount, icon: CircleDot, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Rezerve', value: reservedCount, icon: CirclePause, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Masa Yonetimi</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="gap-2" />} onClick={() => { setEditing(null); setForm({ number: 0, label: '', capacity: 4 }); }}>
            <Plus className="h-4 w-4" />
            Masa Ekle
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Masa Duzenle' : 'Yeni Masa'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Masa No</Label>
                <Input
                  type="number"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Etiket</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="orn: Bahce 1"
                />
              </div>
              <div>
                <Label>Kapasite</Label>
                <Input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 2 })}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editing ? 'Guncelle' : 'Ekle'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {tables.map((table) => {
          const config = statusConfig[table.status] || statusConfig.AVAILABLE;
          const StatusIcon = config.icon;
          return (
            <Card
              key={table.id}
              className={`${config.bg} border ${config.border} cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden`}
              onClick={() => setPosTable(table as any)}
            >
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={e => e.stopPropagation()}>
                <button
                  className="h-7 w-7 rounded-md bg-white/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                  onClick={() => {
                    setEditing(table);
                    setForm({ number: table.number, label: table.label, capacity: table.capacity });
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="h-7 w-7 rounded-md bg-white/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors shadow-sm"
                  onClick={() => handleDelete(table.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <CardContent className="p-4 text-center">
                <div className={`h-12 w-12 rounded-xl ${config.iconBg} flex items-center justify-center mx-auto mb-2`}>
                  <StatusIcon className={`h-6 w-6 ${config.text}`} />
                </div>
                <p className={`font-bold text-xl ${config.text}`}>Masa {table.number}</p>
                {table.label && <p className="text-xs text-muted-foreground mt-1">{table.label}</p>}
                <div className="flex items-center justify-center gap-1 mt-2 text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span className="text-xs">{table.capacity} kisi</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <TablePosDialog
        table={posTable as any}
        onClose={() => { setPosTable(null); loadTables(); }}
        onTableUpdated={loadTables}
      />

      {tables.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Armchair className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground">Henuz masa eklenmemis</p>
          <p className="text-sm text-muted-foreground mt-1">&quot;Masa Ekle&quot; butonunu kullanarak ilk masanizi olusturun</p>
        </div>
      )}
    </div>
  );
}
