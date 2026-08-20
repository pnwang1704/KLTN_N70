import React from 'react';
import type { Product } from '../types';
import { formatCurrency } from '../lib/utils';
import { Plus } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  return (
    <div 
      onClick={() => onClick(product)}
      className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-100 active:scale-95 transition-transform cursor-pointer"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-zinc-100">
        <img 
          src={product.imageUrl} 
          alt={product.name} 
          className="object-cover w-full h-full"
          loading="lazy"
        />
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-zinc-900 line-clamp-2 text-sm leading-tight mb-1">
          {product.name}
        </h3>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-orange-600 font-bold text-sm">
            {formatCurrency(product.basePrice)}
          </span>
          <button className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
            <Plus size={14} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};
