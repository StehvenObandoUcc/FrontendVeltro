import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'critical';
}

/**
 * KPICard - Displays a key performance indicator with value and optional trend
 * Uses Veltro design system CSS variables for consistent theming
 */
export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  variant = 'default',
}) => {
  const getVariantStyles = (v: string) => {
    switch (v) {
      case 'success':
        return {
          barColor: 'var(--success-green)',
          iconBg: 'rgba(16, 185, 129, 0.1)',
          iconColor: 'var(--success-green)',
        };
      case 'warning':
        return {
          barColor: 'var(--accent-base)',
          iconBg: 'rgba(255, 172, 0, 0.1)',
          iconColor: '#FF9500',
        };
      case 'critical':
        return {
          barColor: 'var(--critical-red)',
          iconBg: 'rgba(239, 68, 68, 0.1)',
          iconColor: 'var(--critical-red)',
        };
      default:
        return {
          barColor: 'var(--primary-base)',
          iconBg: 'rgba(3, 142, 87, 0.08)',
          iconColor: 'var(--primary-base)',
        };
    }
  };

  const styles = getVariantStyles(variant);

  return (
    <div className="kpi-card">
      <div 
        className="absolute top-0 left-0 bottom-0 w-1"
        style={{ backgroundColor: styles.barColor }}
      />
      
      <div className="flex items-start justify-between pl-2">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>
            {title}
          </p>
          <p
            className="text-3xl font-bold tracking-tight tabular-data"
            style={{
              color: 'var(--text-primary)',
            }}
          >
            {value}
          </p>
          {trend && trendValue && (
            <div className="flex items-center mt-3 text-xs font-medium">
              <span 
                className="inline-flex items-center px-1.5 py-0.5 rounded"
                style={{ 
                  backgroundColor: trend === 'up' ? 'rgba(16, 185, 129, 0.1)' : 
                                   trend === 'down' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                  color: trend === 'up' ? 'var(--success-green)' : 
                        trend === 'down' ? 'var(--critical-red)' : 'var(--text-tertiary)'
                }}
              >
                {trend === 'up' && '↑ '}
                {trend === 'down' && '↓ '}
                {trend === 'neutral' && '→ '}
                {trendValue}
              </span>
              <span className="ml-2" style={{ color: 'var(--text-tertiary)' }}>vs mes anterior</span>
            </div>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-md flex items-center justify-center text-xl"
          style={{ 
            backgroundColor: styles.iconBg,
            color: styles.iconColor 
          }}
          role="img"
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
    </div>
  );
};
