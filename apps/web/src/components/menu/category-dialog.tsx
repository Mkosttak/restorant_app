'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ApiCategory } from '@bolena/shared';

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { nameTr: string; nameEn: string; sortOrder: number }) => Promise<void>;
  editingCat: ApiCategory | null;
}

export function CategoryDialog({ open, onOpenChange, onSubmit, editingCat }: CategoryDialogProps) {
  const [form, setForm] = useState({ nameTr: '', nameEn: '', sortOrder: 0 });

  useEffect(() => {
    if (open) {
      if (editingCat) {
        setForm({
          nameTr: editingCat.nameTr,
          nameEn: editingCat.nameEn,
          sortOrder: editingCat.sortOrder,
        });
      } else {
        setForm({ nameTr: '', nameEn: '', sortOrder: 0 });
      }
    }
  }, [open, editingCat]);

  const handleSubmit = async () => {
    await onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingCat ? 'Kategori Düzenle' : 'Yeni Kategori'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Ad (TR)</Label>
            <Input
              value={form.nameTr}
              onChange={(e) => setForm({ ...form, nameTr: e.target.value })}
            />
          </div>
          <div>
            <Label>Ad (EN)</Label>
            <Input
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
            />
          </div>
          <div>
            <Label>Sıra</Label>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
            />
          </div>
          <Button onClick={handleSubmit} className="w-full">
            {editingCat ? 'Güncelle' : 'Ekle'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
