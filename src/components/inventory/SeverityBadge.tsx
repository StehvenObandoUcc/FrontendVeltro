import React from 'react';
import { OctagonAlert, AlertTriangle, Info } from 'lucide-react';
import type { AlertSeverity } from '../../api/inventory';

interface SeverityBadgeProps {
  severity: AlertSeverity;
}

/**
 * SeverityBadge - Visual indicator for alert severity levels
 * Uses Lucide icons with semantic severity colors from the Veltro palette.
 */
export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const severityConfig: Record<
    AlertSeverity,
    { bg: string; border: string; text: string; icon: React.ReactNode; label: string }
  > = {
    CRITICAL: {
      bg: 'rgba(255, 46, 33, 0.1)',
      border: '#FF2E21',
      text: '#FF2E21',
      icon: <OctagonAlert size={14} />,
      label: 'Critical',
    },
    WARNING: {
      bg: '#FFF4E6',
      border: '#FFAC00',
      text: '#FF9500',
      icon: <AlertTriangle size={14} />,
      label: 'Warning',
    },
    INFO: {
      bg: '#E8F4F0',
      border: '#10B981',
      text: '#038E57',
      icon: <Info size={14} />,
      label: 'Info',
    },
  };

  const config = severityConfig[severity];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border-2"
      style={{
        backgroundColor: config.bg,
        borderColor: config.border,
        color: config.text,
      }}
    >
      <span className="flex items-center">{config.icon}</span>
      {config.label}
    </span>
  );
};
