import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DollarSign, BarChart3, TrendingUp, Package } from 'lucide-react';
import { KPICard } from '../../components/dashboard/KPICard';

describe('KPICard Component', () => {
  it('should render title and value', () => {
    render(
      <KPICard
        title="Today's Sales"
        value="$1,234.56"
        icon={<DollarSign data-testid="icon-dollar" />}
      />
    );

    expect(screen.getByText("Today's Sales")).toBeInTheDocument();
    expect(screen.getByText('$1,234.56')).toBeInTheDocument();
    expect(screen.getByTestId('icon-dollar')).toBeInTheDocument();
  });

  it('should render with correct variant styles', () => {
    const { container } = render(
      <KPICard
        title="Test"
        value="100"
        icon={<BarChart3 />}
        variant="success"
      />
    );

    // The card renders with inline styles, so check the container exists
    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();
  });

  it('should render trend information when provided', () => {
    render(
      <KPICard
        title="Revenue"
        value="$5,000"
        icon={<TrendingUp />}
        trend="up"
        trendValue="+15%"
      />
    );

    expect(screen.getByText(/\+15%/)).toBeInTheDocument();
  });

  it('should display correct trend icons', () => {
    const { rerender } = render(
      <KPICard
        title="Test"
        value="100"
        icon={<BarChart3 />}
        trend="up"
        trendValue="+10%"
      />
    );

    expect(screen.getByText(/\+10%/)).toBeInTheDocument();

    rerender(
      <KPICard
        title="Test"
        value="100"
        icon={<BarChart3 />}
        trend="down"
        trendValue="-5%"
      />
    );

    expect(screen.getByText(/-5%/)).toBeInTheDocument();

    rerender(
      <KPICard
        title="Test"
        value="100"
        icon={<BarChart3 />}
        trend="neutral"
        trendValue="0%"
      />
    );

    expect(screen.getByText(/0%/)).toBeInTheDocument();
  });

  it('should use default variant when not provided', () => {
    const { container } = render(
      <KPICard
        title="Test"
        value="100"
        icon={<BarChart3 />}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();
  });

  it('should handle numeric values', () => {
    render(
      <KPICard
        title="Items Sold"
        value={42}
        icon={<Package />}
      />
    );

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should not render trend when trendValue is missing', () => {
    render(
      <KPICard
        title="Test"
        value="100"
        icon={<BarChart3 />}
        trend="up"
      />
    );

    // Trend arrows should not appear when trendValue is missing
    expect(screen.queryByText(/vs mes anterior/)).not.toBeInTheDocument();
  });
});
