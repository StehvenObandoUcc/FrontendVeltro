import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AlertList } from '../../components/inventory/AlertList';
import type { Alert } from '../../api/inventory';

describe('AlertList', () => {
  it('renders empty state text with accents', () => {
    render(
      <AlertList
        alerts={[]}
        isLoading={false}
        currentPage={0}
        totalPages={0}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByText('Sin alertas')).toBeInTheDocument();
    expect(screen.getByText('Tu inventario está en buen estado.')).toBeInTheDocument();
  });

  it('renders pagination text with accents', () => {
    const alerts: Alert[] = [
      {
        id: 1,
        productId: 10,
        productName: 'Arroz',
        type: 'LOW_STOCK',
        severity: 'WARNING',
        message: 'Stock bajo',
        read: false,
        resolved: false,
        createdAt: new Date().toISOString(),
      },
    ];

    render(
      <AlertList
        alerts={alerts}
        isLoading={false}
        currentPage={1}
        totalPages={3}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
  });
});
