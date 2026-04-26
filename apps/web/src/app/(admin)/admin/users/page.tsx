'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Shield, UserCircle, Users, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EMPLOYEE';
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'EMPLOYEE' });

  const load = async () => {
    try {
      const data = await api.get<User[]>('/users');
      setUsers(data);
    } catch (err: any) {
      toast.error(err?.message || 'Kullanicilar yuklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      await api.post('/users', form);
      toast.success('Kullanici olusturuldu');
      setForm({ email: '', name: '', password: '', role: 'EMPLOYEE' });
      setOpen(false);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Kullanici olusturulamadi');
    }
  };

  const toggleActive = async (id: string) => {
    try {
      await api.patch(`/users/${id}/toggle-active`);
      toast.success('Durum guncellendi');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Islem basarisiz');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kullanici Yonetimi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} kullanici</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="h-4 w-4" />
            Yeni Kullanici
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Kullanici Ekle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Ad Soyad</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ad Soyad"
                />
              </div>
              <div>
                <Label>E-posta</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="ornek@bolena.com"
                />
              </div>
              <div>
                <Label>Sifre</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="En az 6 karakter"
                />
              </div>
              <div>
                <Label>Rol</Label>
                <Select value={form.role} onValueChange={v => v && setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Calisan</SelectItem>
                    <SelectItem value="ADMIN">Yonetici</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full">Kaydet</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {users.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground">Henuz kullanici yok</p>
          <p className="text-sm text-muted-foreground mt-1">Yeni kullanici ekleyerek baslayin</p>
        </div>
      )}

      <div className="grid gap-3">
        {users.map(user => {
          const initials = user.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <Card key={user.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      user.isActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">{user.name}</p>
                        {!user.isActive && (
                          <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-600">Devre Disi</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Badge className={`shrink-0 text-xs gap-1 ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {user.role === 'ADMIN' ? <Shield className="h-3 w-3" /> : <UserCircle className="h-3 w-3" />}
                      {user.role === 'ADMIN' ? 'Yonetici' : 'Calisan'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                    <Button
                      variant={user.isActive ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => toggleActive(user.id)}
                      className={user.isActive ? 'text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive' : ''}
                    >
                      {user.isActive ? 'Devre Disi Birak' : 'Aktif Et'}
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
