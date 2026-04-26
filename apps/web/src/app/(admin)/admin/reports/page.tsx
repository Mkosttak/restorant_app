'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Receipt,
  CalendarDays,
  Trophy,
  CreditCard,
  Banknote,
  ArrowRight,
} from 'lucide-react';

interface DailySummary {
  date: string; totalRevenue: number; totalPayments: number; unpaid: number;
  orderCount: number; itemCount: number; avgOrderValue: number;
  paymentMethods: Record<string, number>;
}

interface TopProduct { name: string; quantity: number; revenue: number }

interface RangeSummary {
  totalRevenue: number; orderCount: number;
  dailyBreakdown: { date: string; revenue: number; orders: number }[];
}

const formatPrice = (cents: number) => `${(cents / 100).toFixed(2)} TL`;
const methodLabels: Record<string, string> = { CASH: 'Nakit', CREDIT_CARD: 'Kredi Karti', DEBIT_CARD: 'Banka Karti' };
const methodIcons: Record<string, typeof CreditCard> = { CASH: Banknote, CREDIT_CARD: CreditCard, DEBIT_CARD: CreditCard };

export default function ReportsPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [daily, setDaily] = useState<DailySummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [range, setRange] = useState<RangeSummary | null>(null);
  const [loadingDaily, setLoadingDaily] = useState(true);

  const loadDaily = useCallback(async () => {
    try {
      setLoadingDaily(true);
      const [d, tp] = await Promise.all([
        api.get<DailySummary>(`/reports/daily?date=${date}`),
        api.get<TopProduct[]>(`/reports/top-products?startDate=${date}&endDate=${date}`),
      ]);
      setDaily(d); setTopProducts(tp);
    } catch {
      // silent
    } finally {
      setLoadingDaily(false);
    }
  }, [date]);

  const loadRange = useCallback(async () => {
    try {
      const r = await api.get<RangeSummary>(`/reports/range?startDate=${startDate}&endDate=${endDate}`);
      setRange(r);
    } catch {
      // silent
    }
  }, [startDate, endDate]);

  useEffect(() => { loadDaily(); }, [loadDaily]);

  const dailyStats = daily ? [
    { title: 'Toplam Ciro', value: formatPrice(daily.totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Tahsilat', value: formatPrice(daily.totalPayments), icon: Receipt, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Siparis Sayisi', value: daily.orderCount.toString(), icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Ort. Siparis', value: formatPrice(daily.avgOrderValue), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
  ] : [];

  const maxRevenue = range?.dailyBreakdown.reduce((max, d) => Math.max(max, d.revenue), 0) || 1;

  return (
    <div className="space-y-6 animate-slide-in-up">
      <h1 className="text-2xl font-bold text-foreground">Raporlar</h1>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Gunluk</TabsTrigger>
          <TabsTrigger value="range">Tarih Araligi</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6 mt-4">
          <div className="relative max-w-[200px]">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="pl-10" />
          </div>

          {loadingDaily ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : daily && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {dailyStats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={stat.title} className="border-0 shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">{stat.title}</p>
                            <p className="text-2xl font-bold mt-1">{stat.value}</p>
                          </div>
                          <div className={`h-11 w-11 rounded-xl ${stat.bg} flex items-center justify-center`}>
                            <Icon className={`h-5 w-5 ${stat.color}`} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {Object.keys(daily.paymentMethods).length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Odeme Yontemleri</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(daily.paymentMethods).map(([method, amount]) => {
                        const Icon = methodIcons[method] || CreditCard;
                        const percent = daily.totalPayments > 0 ? (amount / daily.totalPayments) * 100 : 0;
                        return (
                          <div key={method} className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium">{methodLabels[method] || method}</span>
                                <span className="font-semibold">{formatPrice(amount)}</span>
                              </div>
                              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {topProducts.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      En Cok Satan Urunler
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topProducts.map((p, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            i === 0 ? 'bg-amber-100 text-amber-700' :
                            i === 1 ? 'bg-gray-100 text-gray-600' :
                            i === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold">{formatPrice(p.revenue)}</p>
                            <p className="text-xs text-muted-foreground">{p.quantity} adet</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="range" className="space-y-6 mt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Baslangic</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-44" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Bitis</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-44" />
            </div>
            <Button onClick={loadRange} className="gap-2">
              Goster <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {range && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Toplam Ciro</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">{formatPrice(range.totalRevenue)}</p>
                      </div>
                      <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Toplam Siparis</p>
                        <p className="text-2xl font-bold mt-1">{range.orderCount}</p>
                      </div>
                      <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Gunluk Kirilim</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {range.dailyBreakdown.map(d => {
                      const percent = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0;
                      return (
                        <div key={d.date} className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground w-24 shrink-0">
                            {new Date(d.date).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          <div className="flex-1">
                            <div className="h-6 w-full bg-muted rounded-md overflow-hidden">
                              <div
                                className="h-full bg-primary/80 rounded-md transition-all flex items-center pl-2"
                                style={{ width: `${Math.max(percent, 8)}%` }}
                              >
                                {percent > 20 && (
                                  <span className="text-[10px] text-white font-medium">{formatPrice(d.revenue)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 w-28">
                            <p className="text-sm font-semibold">{formatPrice(d.revenue)}</p>
                            <p className="text-xs text-muted-foreground">{d.orders} siparis</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
