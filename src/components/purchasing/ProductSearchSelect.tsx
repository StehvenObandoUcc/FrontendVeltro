import React, { useState, useRef, useEffect } from 'react';
import type { Product } from '../../types';
import { Search, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';

interface ProductSearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  products: Product[];
  error?: string;
}

export const ProductSearchSelect: React.FC<ProductSearchSelectProps> = ({
  value,
  onChange,
  products,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedProduct = products.find((p) => p.id.toString() === value);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        className="flex items-center justify-between w-full px-3 py-2 rounded-md bg-white cursor-pointer"
        style={{
          border: `1px solid ${error ? '#FF2E21' : (isOpen ? '#038E57' : '#E8E3DB')}`,
          color: '#1F2937',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate select-none">
          {selectedProduct ? `${selectedProduct.name} (${formatCurrency(selectedProduct.salePrice)})` : 'Select a product'}
        </span>
        <ChevronDown size={16} className="text-gray-400" />
      </div>

      {isOpen && (
        <div 
          className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto"
          style={{ border: '1px solid #E8E3DB' }}
        >
          <div className="sticky top-0 bg-white p-2 border-b border-gray-100 z-20">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-8 pr-3 py-2 text-sm border rounded-md outline-none focus:border-[#038E57]"
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="py-1">
            {filteredProducts.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500 text-center">No se encontraron productos</div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="px-4 py-2 text-sm cursor-pointer hover:bg-[#E8F4F0]"
                  onClick={() => {
                    onChange(product.id.toString());
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  {product.name} <span className="text-gray-500">({formatCurrency(product.salePrice)})</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
