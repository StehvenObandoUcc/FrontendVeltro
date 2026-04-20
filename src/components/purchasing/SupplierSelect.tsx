import React, { useState, useEffect, useRef } from 'react';
import { purchasingApi } from '../../api/purchasing';
import type { Supplier } from '../../api/purchasing';
import { Search, ChevronDown } from 'lucide-react';

interface SupplierSelectProps {
  value: string;
  onChange: (supplierId: string) => void;
  disabled?: boolean;
}

/**
 * SupplierSelect - Dropdown for selecting a supplier
 * Fetches suppliers from API on mount and allows searching
 */
export const SupplierSelect: React.FC<SupplierSelectProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSuppliers = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const response = await purchasingApi.getSuppliers();
        setSuppliers(response);
      } catch (err) {
        setFetchError('Failed to load suppliers');
        console.error('Error loading suppliers:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

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

  const selectedSupplier = suppliers.find((s) => s.id.toString() === value);

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.taxId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <label
        className="block text-sm font-medium mb-1"
        style={{ color: '#1F2937' }}
      >
        Supplier
      </label>
      <div
        className="flex items-center justify-between w-full px-3 py-2 rounded-md bg-white"
        style={{
          border: `1px solid ${isOpen ? '#038E57' : '#E8E3DB'}`,
          color: '#1F2937',
          opacity: disabled || isLoading ? 0.5 : 1,
          cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        }}
        onClick={() => {
          if (!disabled && !isLoading) setIsOpen(!isOpen);
        }}
      >
        <span className="truncate select-none">
          {isLoading 
            ? 'Loading suppliers...' 
            : selectedSupplier 
              ? `${selectedSupplier.name} (${selectedSupplier.taxId})` 
              : 'Select a supplier'}
        </span>
        <ChevronDown size={16} className="text-gray-400" />
      </div>

      {isOpen && !disabled && !isLoading && (
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
                placeholder="Buscar proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="py-1">
            {filteredSuppliers.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500 text-center">No se encontraron proveedores</div>
            ) : (
              filteredSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="px-4 py-2 text-sm cursor-pointer hover:bg-[#E8F4F0]"
                  onClick={() => {
                    onChange(supplier.id.toString());
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  {supplier.name} <span className="text-gray-500">({supplier.taxId})</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {fetchError && <p className="mt-1 text-sm text-[#FF2E21]">{fetchError}</p>}
    </div>
  );
};
