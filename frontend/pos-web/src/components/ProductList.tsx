import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { mockCategories, mockProducts } from '../data/mockData';
import type { Product } from '../types';
import { cn, formatCurrency } from '../lib/utils';

interface ProductListProps {
  onSelectProduct: (product: Product) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ onSelectProduct }) => {
  const [activeCategory, setActiveCategory] = useState(mockCategories[0].id);
  const [search, setSearch] = useState('');

  const filteredProducts = mockProducts.filter(p => {
    if (search) return p.name.toLowerCase().includes(search.toLowerCase());
    return p.categoryId === activeCategory;
  });

  return (
    <div className="flex flex-col h-full bg-zinc-50 border-r border-zinc-200">
      {/* Categories & Search */}
      <div className="p-4 bg-white border-b border-zinc-200 shadow-sm flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm món ăn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 border-none rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none text-sm"
          />
        </div>

        {!search && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {mockCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-colors",
                  activeCategory === cat.id 
                    ? "bg-orange-100 text-orange-600 border border-orange-200" 
                    : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-max">
          {filteredProducts.map(product => (
            <div 
              key={product.id}
              onClick={() => onSelectProduct(product)}
              className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:border-orange-500 hover:shadow-md transition-all cursor-pointer group flex flex-col"
            >
              <div className="aspect-square bg-zinc-100 relative overflow-hidden">
                <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-3 flex flex-col flex-1">
                <h3 className="font-semibold text-zinc-900 text-sm line-clamp-2 mb-1">{product.name}</h3>
                <span className="mt-auto text-orange-600 font-bold text-sm">
                  {formatCurrency(product.basePrice)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
