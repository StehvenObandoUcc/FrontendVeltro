import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AlertBadge } from '../../components/inventory/AlertBadge';
import { useAlertStore } from '../../stores/alertStore';

describe('AlertBadge', () => {
  it('renders spanish accessibility labels when unread alerts exist', () => {
    useAlertStore.setState({ unreadCount: 4 });

    render(
      <MemoryRouter>
        <AlertBadge />
      </MemoryRouter>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', '4 alertas sin leer');
    expect(button).toHaveAttribute('title', 'Clic para ver alertas');
  });
});
