'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ApiMenuItem } from '@bolena/shared';

const formatPrice = (cents: number) => `${(cents / 100).toFixed(2)} TL`;

interface MenuItemCardProps {
  item: ApiMenuItem;
  onEdit: (item: ApiMenuItem) => void;
  onDelete: (id: string) => void;
}

export function MenuItemCard({ item, onEdit, onDelete }: MenuItemCardProps) {
  return (
    <Card className="flex flex-col h-full bg-white shadow-sm hover:shadow transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {item.nameTr}
              {item.isGlutenFree && <Badge variant="secondary" className="text-[10px] px-1 bg-green-100 text-green-800">GF</Badge>}
            </CardTitle>
            <p className="text-xs text-gray-500 line-clamp-1">{item.nameEn}</p>
          </div>
          <div className="flex gap-2 ml-2 shrink-0 border border-gray-100 rounded-md p-0.5">
            <button
              className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-blue-600 rounded transition-colors"
              onClick={() => onEdit(item)}
              title="Düzenle"
            >
              &#9998;
            </button>
            <button
              className="px-2 py-1 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
              onClick={() => onDelete(item.id)}
              title="Sil"
            >
              &times;
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex flex-col flex-1">
        {item.imageUrl && (
          <div className="w-full h-32 mb-3 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt={item.nameTr} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        
        <p className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1 relative min-h-[32px]">
          {item.descriptionTr || <span className="text-gray-400 italic">Açıklama yok</span>}
        </p>
        
        <div className="flex items-end justify-between mt-auto pt-2 border-t border-gray-50">
          <div className="flex flex-col">
            {item.campaignPriceCents ? (
              <>
                <span className="text-xs line-through text-gray-400">
                  {formatPrice(item.priceCents)}
                </span>
                <span className="text-sm font-bold text-red-600">
                  {formatPrice(item.campaignPriceCents)}
                </span>
              </>
            ) : (
              <span className="text-sm font-bold text-gray-900">{formatPrice(item.priceCents)}</span>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="text-[10px] font-medium text-gray-500 border-gray-200">
              {item.category.nameTr}
            </Badge>
            <div className="flex gap-1 mt-0.5">
              {!item.isAvailable && (
                <Badge variant="destructive" className="text-[10px] px-1">Tükendi</Badge>
              )}
              {item.stockTracking && (
                <Badge variant="secondary" className="text-[10px] px-1 bg-blue-50 text-blue-700">
                  Stok: {item.stockCount}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
