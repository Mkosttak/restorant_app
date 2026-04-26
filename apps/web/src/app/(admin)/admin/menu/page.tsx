'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
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
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Tag,
  Package,
  Filter,
  UtensilsCrossed,
  ImageIcon,
} from 'lucide-react';

interface Category {
  id: string;
  nameTr: string;
  nameEn: string;
  sortOrder: number;
  isActive: boolean;
  _count?: { menuItems: number };
}

interface MenuItemOption {
  id: string;
  nameTr: string;
  nameEn: string;
  extraPriceCents: number;
  isActive: boolean;
}

interface MenuItem {
  id: string;
  categoryId: string;
  nameTr: string;
  nameEn: string;
  descriptionTr?: string;
  descriptionEn?: string;
  priceCents: number;
  imageUrl?: string;
  isAvailable: boolean;
  stockTracking: boolean;
  stockCount?: number;
  campaignPriceCents?: number;
  category: Category;
  options?: MenuItemOption[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingMenuItems, setIsLoadingMenuItems] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isDeletingCategoryId, setIsDeletingCategoryId] = useState<string | null>(null);
  const [isDeletingItemId, setIsDeletingItemId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyDiscounted, setShowOnlyDiscounted] = useState(false);
  const [showOnlyOutOfStock, setShowOnlyOutOfStock] = useState(false);

  const [catForm, setCatForm] = useState({ nameTr: '', nameEn: '', sortOrder: 0 });
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const [itemForm, setItemForm] = useState({
    categoryId: '',
    nameTr: '',
    nameEn: '',
    descriptionTr: '',
    descriptionEn: '',
    priceCents: 0,
    imageUrl: '',
    stockTracking: false,
    stockCount: 0,
    campaignPriceCents: 0,
  });

  const [itemOptions, setItemOptions] = useState<MenuItemOption[]>([]);
  const [newOption, setNewOption] = useState<{ nameTr: string; nameEn: string; extraPrice: number }>({
    nameTr: '',
    nameEn: '',
    extraPrice: 0,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadImageFromFile = async (file: File) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const formData = new FormData();
      formData.append('file', file);

      const base = API_URL;
      const res = await fetch(`${base}/menu/upload-image`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ message: 'Gorsel yuklenemedi' }));
        throw new Error(errorBody.message || 'Gorsel yuklenemedi');
      }

      const data = (await res.json()) as { url?: string };
      if (!data.url) {
        throw new Error('Gorsel URL donmedi');
      }

      setItemForm((prev) => ({
        ...prev,
        imageUrl: data.url || prev.imageUrl,
      }));
      toast.success('Gorsel basariyla yuklendi');
    } catch (error: any) {
      toast.error(error?.message || 'Gorsel yuklenirken bir hata olustu');
    }
  };

  const loadCategories = useCallback(async () => {
    try {
      setIsLoadingCategories(true);
      const data = await api.get<Category[]>('/categories');
      setCategories(data);
    } catch (error: any) {
      toast.error(error?.message || 'Kategoriler yuklenirken bir hata olustu');
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  const loadMenuItems = useCallback(async () => {
    try {
      setIsLoadingMenuItems(true);
      const path = selectedCategory === 'all' ? '/menu' : `/menu?categoryId=${selectedCategory}`;
      const data = await api.get<MenuItem[]>(path);
      setMenuItems(data);
    } catch (error: any) {
      toast.error(error?.message || 'Menu ogeleri yuklenirken bir hata olustu');
    } finally {
      setIsLoadingMenuItems(false);
    }
  }, [selectedCategory]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { loadMenuItems(); }, [loadMenuItems]);

  const handleCatSubmit = async () => {
    try {
      setIsSavingCategory(true);
      if (editingCat) {
        await api.put(`/categories/${editingCat.id}`, catForm);
        toast.success('Kategori guncellendi');
      } else {
        await api.post('/categories', catForm);
        toast.success('Kategori olusturuldu');
      }
      setCatDialogOpen(false);
      setCatForm({ nameTr: '', nameEn: '', sortOrder: 0 });
      setEditingCat(null);
      loadCategories();
    } catch (error: any) {
      toast.error(error?.message || 'Kategori kaydedilirken bir hata olustu');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm('Bu kategoriyi silmek istediginizden emin misiniz?')) return;
    try {
      setIsDeletingCategoryId(id);
      await api.delete(`/categories/${id}`);
      toast.success('Kategori silindi');
      loadCategories();
    } catch (error: any) {
      toast.error(error?.message || 'Kategori silinirken bir hata olustu');
    } finally {
      setIsDeletingCategoryId(null);
    }
  };

  const handleItemSubmit = async () => {
    const data = {
      ...itemForm,
      priceCents: Math.round(itemForm.priceCents * 100),
      campaignPriceCents: itemForm.campaignPriceCents
        ? Math.round(itemForm.campaignPriceCents * 100)
        : undefined,
      stockCount: itemForm.stockTracking ? itemForm.stockCount : undefined,
      imageUrl: itemForm.imageUrl || undefined,
    };

    try {
      setIsSavingItem(true);
      if (editingItem) {
        await api.put(`/menu/${editingItem.id}`, data);
        toast.success('Urun guncellendi');
      } else {
        await api.post('/menu', data);
        toast.success('Urun olusturuldu');
      }
      setItemDialogOpen(false);
      resetItemForm();
      loadMenuItems();
    } catch (error: any) {
      toast.error(error?.message || 'Urun kaydedilirken bir hata olustu');
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Bu urunu silmek istediginizden emin misiniz?')) return;
    try {
      setIsDeletingItemId(id);
      await api.delete(`/menu/${id}`);
      toast.success('Urun silindi');
      loadMenuItems();
    } catch (error: any) {
      toast.error(error?.message || 'Urun silinirken bir hata olustu');
    } finally {
      setIsDeletingItemId(null);
    }
  };

  const resetItemForm = () => {
    setItemForm({
      categoryId: '',
      nameTr: '',
      nameEn: '',
      descriptionTr: '',
      descriptionEn: '',
      priceCents: 0,
      imageUrl: '',
      stockTracking: false,
      stockCount: 0,
      campaignPriceCents: 0,
    });
    setEditingItem(null);
    setItemOptions([]);
    setNewOption({ nameTr: '', nameEn: '', extraPrice: 0 });
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      categoryId: item.categoryId,
      nameTr: item.nameTr,
      nameEn: item.nameEn,
      descriptionTr: item.descriptionTr || '',
      descriptionEn: item.descriptionEn || '',
      priceCents: item.priceCents / 100,
      imageUrl: item.imageUrl || '',
      stockTracking: item.stockTracking,
      stockCount: item.stockCount || 0,
      campaignPriceCents: item.campaignPriceCents ? item.campaignPriceCents / 100 : 0,
    });
    api
      .get<MenuItemOption[]>(`/menu/${item.id}/options`)
      .then((opts) => setItemOptions(opts))
      .catch(() => {
        setItemOptions([]);
        toast.error('Urun opsiyonlari yuklenirken bir hata olustu');
      });
    setItemDialogOpen(true);
  };

  const formatPrice = (cents: number) => `${(cents / 100).toFixed(2)} TL`;

  const handleAddOption = async () => {
    if (!editingItem) return;
    if (!newOption.nameTr || !newOption.nameEn) {
      toast.error('Opsiyon isimleri zorunludur');
      return;
    }
    try {
      const created = await api.post<MenuItemOption>(`/menu/${editingItem.id}/options`, {
        nameTr: newOption.nameTr,
        nameEn: newOption.nameEn,
        extraPriceCents: Math.round(newOption.extraPrice * 100),
      });
      setItemOptions((prev) => [...prev, created]);
      setNewOption({ nameTr: '', nameEn: '', extraPrice: 0 });
      toast.success('Opsiyon eklendi');
    } catch (error: any) {
      toast.error(error?.message || 'Opsiyon eklenirken bir hata olustu');
    }
  };

  const handleToggleOptionActive = async (option: MenuItemOption) => {
    try {
      const updated = await api.put<MenuItemOption>(`/menu/options/${option.id}`, {
        isActive: !option.isActive,
      });
      setItemOptions((prev) => prev.map((o) => (o.id === option.id ? updated : o)));
      toast.success(`Opsiyon ${updated.isActive ? 'aktif' : 'pasif'} yapildi`);
    } catch (error: any) {
      toast.error(error?.message || 'Opsiyon guncellenirken bir hata olustu');
    }
  };

  const handleDeleteOption = async (option: MenuItemOption) => {
    if (!confirm('Bu opsiyonu silmek istediginizden emin misiniz?')) return;
    try {
      await api.delete(`/menu/options/${option.id}`);
      setItemOptions((prev) => prev.filter((o) => o.id !== option.id));
      toast.success('Opsiyon silindi');
    } catch (error: any) {
      toast.error(error?.message || 'Opsiyon silinirken bir hata olustu');
    }
  };

  const filteredItems = menuItems.filter((item) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!item.nameTr.toLowerCase().includes(term) && !item.nameEn.toLowerCase().includes(term)) {
        return false;
      }
    }
    if (showOnlyDiscounted && !item.campaignPriceCents) return false;
    if (showOnlyOutOfStock && !(!item.isAvailable || (item.stockTracking && (item.stockCount ?? 0) <= 0))) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-slide-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Menu Yonetimi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {menuItems.length} urun, {categories.length} kategori
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
            <DialogTrigger render={<Button variant="outline" className="gap-2" />} onClick={() => {
              setEditingCat(null);
              setCatForm({ nameTr: '', nameEn: '', sortOrder: 0 });
            }}>
              <Tag className="h-4 w-4" />
              Kategori
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCat ? 'Kategori Duzenle' : 'Yeni Kategori'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Ad (TR)</Label>
                  <Input
                    value={catForm.nameTr}
                    onChange={(e) => setCatForm({ ...catForm, nameTr: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Ad (EN)</Label>
                  <Input
                    value={catForm.nameEn}
                    onChange={(e) => setCatForm({ ...catForm, nameEn: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Sira</Label>
                  <Input
                    type="number"
                    value={catForm.sortOrder}
                    onChange={(e) => setCatForm({ ...catForm, sortOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <Button onClick={handleCatSubmit} className="w-full" disabled={isSavingCategory}>
                  {isSavingCategory ? 'Kaydediliyor...' : editingCat ? 'Guncelle' : 'Ekle'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={itemDialogOpen} onOpenChange={(open) => { setItemDialogOpen(open); if (!open) resetItemForm(); }}>
            <DialogTrigger render={<Button className="gap-2" />} onClick={resetItemForm}>
              <Plus className="h-4 w-4" />
              Urun Ekle
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Urun Duzenle' : 'Yeni Urun'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Kategori</Label>
                  <Select
                    value={itemForm.categoryId}
                    onValueChange={(v) => v && setItemForm({ ...itemForm, categoryId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori secin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nameTr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Tabs defaultValue="tr" className="space-y-3">
                  <TabsList>
                    <TabsTrigger value="tr">Turkce</TabsTrigger>
                    <TabsTrigger value="en">English</TabsTrigger>
                  </TabsList>
                  <TabsContent value="tr">
                    <div className="space-y-3">
                      <div>
                        <Label>Urun Adi (TR)</Label>
                        <Input
                          value={itemForm.nameTr}
                          onChange={(e) => setItemForm({ ...itemForm, nameTr: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Aciklama (TR)</Label>
                        <Textarea
                          value={itemForm.descriptionTr}
                          onChange={(e) => setItemForm({ ...itemForm, descriptionTr: e.target.value })}
                          rows={2}
                        />
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="en">
                    <div className="space-y-3">
                      <div>
                        <Label>Urun Adi (EN)</Label>
                        <Input
                          value={itemForm.nameEn}
                          onChange={(e) => setItemForm({ ...itemForm, nameEn: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Aciklama (EN)</Label>
                        <Textarea
                          value={itemForm.descriptionEn}
                          onChange={(e) => setItemForm({ ...itemForm, descriptionEn: e.target.value })}
                          rows={2}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Fiyat (TL)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={itemForm.priceCents}
                      onChange={(e) => setItemForm({ ...itemForm, priceCents: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Kampanya Fiyati (TL)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={itemForm.campaignPriceCents || ''}
                      onChange={(e) => setItemForm({ ...itemForm, campaignPriceCents: parseFloat(e.target.value) || 0 })}
                      placeholder="Bos birakin"
                    />
                  </div>
                </div>

                <div>
                  <Label>Gorsel</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="https://..."
                      value={itemForm.imageUrl}
                      onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })}
                      className="flex-1"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          uploadImageFromFile(file);
                          e.target.value = '';
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  {itemForm.imageUrl && (
                    <p className="text-xs text-muted-foreground mt-1 truncate flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" /> {itemForm.imageUrl}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={itemForm.stockTracking}
                      onCheckedChange={(v) => setItemForm({ ...itemForm, stockTracking: v })}
                    />
                    <span className="text-sm">Stok Takibi</span>
                  </label>
                  {itemForm.stockTracking && (
                    <div className="w-28">
                      <Input
                        type="number"
                        value={itemForm.stockCount}
                        onChange={(e) => setItemForm({ ...itemForm, stockCount: parseInt(e.target.value) || 0 })}
                        placeholder="Adet"
                      />
                    </div>
                  )}
                </div>

                <Button onClick={handleItemSubmit} className="w-full" disabled={isSavingItem}>
                  {isSavingItem ? 'Kaydediliyor...' : editingItem ? 'Guncelle' : 'Ekle'}
                </Button>

                {editingItem && (
                  <div className="space-y-3 border-t pt-4">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Package className="h-4 w-4" /> Opsiyonlar
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Ad (TR)</Label>
                        <Input
                          value={newOption.nameTr}
                          onChange={(e) => setNewOption({ ...newOption, nameTr: e.target.value })}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Ad (EN)</Label>
                        <Input
                          value={newOption.nameEn}
                          onChange={(e) => setNewOption({ ...newOption, nameEn: e.target.value })}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Ekstra (TL)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newOption.extraPrice}
                          onChange={(e) => setNewOption({
                            ...newOption,
                            extraPrice: parseFloat(e.target.value) || 0,
                          })}
                          className="h-9"
                        />
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleAddOption} className="gap-1">
                      <Plus className="h-3 w-3" /> Opsiyon Ekle
                    </Button>

                    {itemOptions.length > 0 && (
                      <div className="space-y-2">
                        {itemOptions.map((opt) => (
                          <div
                            key={opt.id}
                            className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-3 py-2"
                          >
                            <div>
                              <p className="font-medium">
                                {opt.nameTr}
                                {!opt.isActive && (
                                  <span className="text-xs text-muted-foreground ml-1">(pasif)</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">{opt.nameEn}</p>
                              {opt.extraPriceCents > 0 && (
                                <p className="text-xs text-primary font-medium">
                                  +{formatPrice(opt.extraPriceCents)}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleToggleOptionActive(opt)}
                              >
                                {opt.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={() => handleDeleteOption(opt)}
                              >
                                Sil
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Urun adinda ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={showOnlyDiscounted}
                  onCheckedChange={setShowOnlyDiscounted}
                />
                <span className="text-muted-foreground">Kampanyali</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={showOnlyOutOfStock}
                  onCheckedChange={setShowOnlyOutOfStock}
                />
                <span className="text-muted-foreground">Stokta yok</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selectedCategory === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Tumu ({menuItems.length})
        </button>
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-1">
            <button
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat.nameTr} ({cat._count?.menuItems || 0})
            </button>
            <button
              className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
              onClick={() => {
                setEditingCat(cat);
                setCatForm({ nameTr: cat.nameTr, nameEn: cat.nameEn, sortOrder: cat.sortOrder });
                setCatDialogOpen(true);
              }}
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
              onClick={() => handleDeleteCat(cat.id)}
              disabled={isDeletingCategoryId === cat.id}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all group">
            {item.imageUrl && (
              <div className="h-36 w-full overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.nameTr}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <CardContent className="p-4">
              <div className="flex justify-between items-start gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">{item.nameTr}</h3>
                    {item.campaignPriceCents && (
                      <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px]">Kampanya</Badge>
                    )}
                    {!item.isAvailable && (
                      <Badge variant="destructive" className="text-[10px]">Pasif</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.nameEn}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    onClick={() => openEditItem(item)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    onClick={() => handleDeleteItem(item.id)}
                    disabled={isDeletingItemId === item.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {item.descriptionTr && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{item.descriptionTr}</p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div>
                  {item.campaignPriceCents ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm line-through text-muted-foreground">
                        {formatPrice(item.priceCents)}
                      </span>
                      <span className="text-sm font-bold text-red-600">
                        {formatPrice(item.campaignPriceCents)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-foreground">{formatPrice(item.priceCents)}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[11px] font-normal">
                    {item.category.nameTr}
                  </Badge>
                  {item.stockTracking && (
                    <Badge variant="secondary" className="text-[10px]">
                      Stok: {item.stockCount}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && menuItems.length > 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Filter className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-base font-medium text-foreground">Sonuc bulunamadi</p>
          <p className="text-sm text-muted-foreground mt-1">Farkli bir arama terimi veya filtre deneyin</p>
        </div>
      )}

      {menuItems.length === 0 && !isLoadingMenuItems && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground">Henuz urun eklenmemis</p>
          <p className="text-sm text-muted-foreground mt-1">&quot;Urun Ekle&quot; butonunu kullanarak ilk urunlerinizi olusturun</p>
        </div>
      )}
    </div>
  );
}
