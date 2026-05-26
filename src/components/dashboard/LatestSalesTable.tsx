import React from 'react';
import type { SaleRow } from '../../api/dashboard';
import { formatCurrency } from '../../utils/formatCurrency';

interface LatestSalesTableProps {
  sales: SaleRow[];
  isLoading: boolean;
}

/**
 * LatestSalesTable - Display recent sales transactions with premium date and time formatting
 */
export const LatestSalesTable: React.FC<LatestSalesTableProps> = ({
  sales,
  isLoading,
}) => {
  // Premium date and time formatter with relative terms (Hoy, Ayer) and Colombian time format
  const formatSaleDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (d1: Date, d2: Date) =>
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();

    const timeStr = date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    if (isSameDay(date, today)) {
      return `Hoy, ${timeStr}`;
    } else if (isSameDay(date, yesterday)) {
      return `Ayer, ${timeStr}`;
    } else {
      const dateFormatted = date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      return `${dateFormatted} - ${timeStr}`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64" aria-live="polite" aria-label="Cargando datos de ventas">
        <div
          className="animate-spin rounded-full h-8 w-8 border-2"
          style={{
            borderColor: 'rgba(3, 142, 87, 0.2)',
            borderTopColor: '#038E57',
          }}
        ></div>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div
        className="text-center py-8 text-sm"
        style={{ color: '#6B7280' }}
        aria-label="No hay ventas registradas"
      >
        No se han registrado ventas hoy
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full" aria-label="Transacciones de ventas recientes">
        <thead>
          <tr style={{ backgroundColor: '#F9F7F2' }}>
            <th
              className="px-4 py-3 text-left text-sm font-semibold"
              style={{ color: '#4B5563', borderBottom: '1px solid #E8E3DB' }}
              scope="col"
            >
              Venta #
            </th>
            <th
              className="px-4 py-3 text-left text-sm font-semibold"
              style={{ color: '#4B5563', borderBottom: '1px solid #E8E3DB' }}
              scope="col"
            >
              Cajero
            </th>
            <th
              className="px-4 py-3 text-right text-sm font-semibold"
              style={{ color: '#4B5563', borderBottom: '1px solid #E8E3DB' }}
              scope="col"
            >
              Artículos
            </th>
            <th
              className="px-4 py-3 text-right text-sm font-semibold"
              style={{ color: '#4B5563', borderBottom: '1px solid #E8E3DB' }}
              scope="col"
            >
              Total
            </th>
            <th
              className="px-4 py-3 text-left text-sm font-semibold"
              style={{ color: '#4B5563', borderBottom: '1px solid #E8E3DB' }}
              scope="col"
            >
              Fecha y Hora
            </th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale, idx) => (
            <tr
              key={sale.saleId}
              style={{
                backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9F7F2',
                borderBottom: '1px solid #E8E3DB',
              }}
              className="hover:bg-opacity-75 transition"
            >
              <td
                className="px-4 py-3 text-sm font-medium"
                style={{ color: '#1F2937' }}
              >
                {sale.saleNumber}
              </td>
              <td
                className="px-4 py-3 text-sm"
                style={{ color: '#6B7280' }}
              >
                Cajero #{sale.cashierId}
              </td>
              <td
                className="px-4 py-3 text-sm text-right"
                style={{ color: '#6B7280' }}
                aria-label={`${sale.itemCount} artículos`}
              >
                {sale.itemCount}
              </td>
              <td
                className="px-4 py-3 text-sm text-right font-semibold"
                style={{
                  color: '#038E57',
                  fontVariantNumeric: 'tabular-nums',
                }}
                aria-label={`Total: ${formatCurrency(sale.total)}`}
              >
                {formatCurrency(sale.total)}
              </td>
              <td
                className="px-4 py-3 text-sm font-medium"
                style={{ color: '#4B5563' }}
              >
                {sale.completedAt ? formatSaleDateTime(sale.completedAt) : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
