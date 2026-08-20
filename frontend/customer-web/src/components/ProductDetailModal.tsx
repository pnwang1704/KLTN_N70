import React, { useState, useMemo } from 'react';
import { X, Check } from 'lucide-react';
import type { Product, CartItemTopping, CartItem } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useCart } from '../context/CartContext';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const { addToCart } = useCart();
  const defaultSize = product.sizes.length > 0 ? product.sizes[0].id : '';
  const [selectedSize, setSelectedSize] = useState<string>(defaultSize);
  const [selectedToppings, setSelectedToppings] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState(1);

  const sizePriceModifier = useMemo(() => {
    return product.sizes.find(s => s.id === selectedSize)?.priceModifier || 0;
  }, [product, selectedSize]);

  const toppingsTotal = useMemo(() => {
    return Object.entries(selectedToppings).reduce((acc, [toppingId, qty]) => {
      const t = product.availableToppings.find(t => t.id === toppingId);
      if (t) return acc + (t.price * qty);
      return acc;
    }, 0);
  }, [product, selectedToppings]);

  const unitPrice = product.basePrice + sizePriceModifier;
  const totalPrice = (unitPrice + toppingsTotal) * quantity;

  const handleToppingToggle = (toppingId: string) => {
    setSelectedToppings(prev => {
      const newToppings = { ...prev };
      if (newToppings[toppingId]) {
        delete newToppings[toppingId];
      } else {
        newToppings[toppingId] = 1;
      }
      return newToppings;
    });
  };

  const handleAddToCart = () => {
    const toppings: CartItemTopping[] = Object.entries(selectedToppings).map(([id, qty]) => {
      const t = product.availableToppings.find(t => t.id === id)!;
      return {
        toppingId: t.id,
        toppingName: t.name,
        price: t.price,
        quantity: qty
      };
    });

    const item: CartItem = {
      cartItemId: Math.random().toString(36).substring(7),
      productId: product.id,
      productName: product.name,
      size: selectedSize,
      unitPrice,
      quantity,
      note,
      toppings,
      totalPrice
    };

    addToCart(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-h-[90vh] rounded-t-3xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header Image */}
        <div className="relative h-48 w-full bg-zinc-100">
          <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full" />
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full backdrop-blur-md"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          <h2 className="text-2xl font-bold text-zinc-900">{product.name}</h2>
          <p className="text-zinc-500 text-sm mt-1">{product.description}</p>
          <div className="mt-2 text-xl font-bold text-orange-600">
            {formatCurrency(product.basePrice)}
          </div>

          {/* Sizes */}
          {product.sizes.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-zinc-900 mb-3 flex items-center justify-between">
                <span>Chọn Size</span>
                <span className="text-xs font-normal text-zinc-400">Bắt buộc</span>
              </h3>
              <div className="flex flex-col gap-2">
                {product.sizes.map(size => (
                  <label key={size.id} className="flex items-center justify-between p-3 border rounded-xl border-zinc-200 cursor-pointer hover:bg-zinc-50">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        selectedSize === size.id ? "border-orange-500 bg-orange-500" : "border-zinc-300"
                      )}>
                        {selectedSize === size.id && <Check size={12} className="text-white" strokeWidth={4} />}
                      </div>
                      <span className="font-medium text-zinc-800">{size.name}</span>
                    </div>
                    <span className="text-sm font-medium text-zinc-600">
                      {size.priceModifier > 0 ? `+${formatCurrency(size.priceModifier)}` : ''}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Toppings */}
          {product.availableToppings.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-zinc-900 mb-3">Topping (Tùy chọn)</h3>
              <div className="flex flex-col gap-2">
                {product.availableToppings.map(topping => (
                  <label key={topping.id} className="flex items-center justify-between p-3 border rounded-xl border-zinc-200 cursor-pointer hover:bg-zinc-50">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                        selectedToppings[topping.id] ? "border-orange-500 bg-orange-500" : "border-zinc-300"
                      )}>
                        {selectedToppings[topping.id] && <Check size={14} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className="font-medium text-zinc-800">{topping.name}</span>
                    </div>
                    <span className="text-sm font-medium text-zinc-600">
                      +{formatCurrency(topping.price)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div className="mt-6">
            <h3 className="font-semibold text-zinc-900 mb-3">Ghi chú cho quán</h3>
            <textarea
              className="w-full border border-zinc-200 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none bg-zinc-50"
              placeholder="VD: Ít đá, nhiều đường..."
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        </div>

        {/* Footer Fixed Action */}
        <div className="absolute bottom-0 left-0 w-full bg-white border-t border-zinc-200 p-4 pb-6 flex gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          <div className="flex items-center border border-zinc-200 rounded-xl bg-zinc-50">
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-12 h-12 flex items-center justify-center text-xl font-medium text-zinc-600">-</button>
            <span className="w-8 text-center font-semibold text-zinc-900">{quantity}</span>
            <button onClick={() => setQuantity(q => q + 1)} className="w-12 h-12 flex items-center justify-center text-xl font-medium text-orange-600">+</button>
          </div>
          <button 
            onClick={handleAddToCart}
            className="flex-1 bg-orange-600 text-white rounded-xl font-semibold flex items-center justify-between px-5 active:scale-95 transition-transform"
          >
            <span>Thêm vào giỏ</span>
            <span>{formatCurrency(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
