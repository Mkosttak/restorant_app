'use client';

import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut, Shield, UserCircle } from 'lucide-react';

const pageTitles: Record<string, { title: string; description: string }> = {
  '/admin/dashboard': { title: 'Dashboard', description: 'Genel bakis ve istatistikler' },
  '/admin/orders': { title: 'Aktif Siparisler', description: 'Siparisleri takip edin ve yonetin' },
  '/admin/tables': { title: 'Masa Yonetimi', description: 'Masalari duzenleyin ve durumlarini takip edin' },
  '/admin/menu': { title: 'Menu Yonetimi', description: 'Urunleri ve kategorileri yonetin' },
  '/admin/reservations': { title: 'Rezervasyonlar', description: 'Rezervasyonlari goruntuleyin ve yonetin' },
  '/admin/reports': { title: 'Raporlar', description: 'Satis ve performans raporlari' },
  '/admin/users': { title: 'Kullanicilar', description: 'Personel hesaplarini yonetin' },
  '/admin/hours': { title: 'Calisma Saatleri', description: 'Haftalik calisma programi' },
};

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const page = pageTitles[pathname] || { title: 'Admin Panel', description: '' };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-border/60 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="animate-fade-in">
        <h2 className="text-lg font-semibold text-foreground">{page.title}</h2>
        {page.description && (
          <p className="text-xs text-muted-foreground">{page.description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-muted/60">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {user?.role === 'ADMIN' ? (
                <Shield className="h-3 w-3 text-primary" />
              ) : (
                <UserCircle className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="text-[11px] text-muted-foreground">
                {user?.role === 'ADMIN' ? 'Yonetici' : 'Calisan'}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
