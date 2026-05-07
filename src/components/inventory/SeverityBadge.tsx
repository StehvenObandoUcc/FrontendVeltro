import React from 'react';
import { OctagonAlert, AlertTriangle, Info } from 'lucide-react';
import type { AlertSeverity } from '../../api/inventory';
import { SEVERITY_STYLE_MAP } from '../../constants/alertSeverityStyles';

interface SeverityBadgeProps {
  severity: AlertSeverity;
}

/**
 * SeverityBadge - Visual indicator for alert severity levels
 * Uses Lucide icons with semantic severity colors from the Veltro palette.
 */
export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const iconAndLabelMap: Record<
    AlertSeverity,
    { icon: React.ReactNode; label: string }
  > = {
    CRITICAL: {
      icon: <OctagonAlert size={14} />,
      label: 'Critical',
    },
    WARNING: {
      icon: <AlertTriangle size={14} />,
      label: 'Warning',
    },
    INFO: {
      icon: <Info size={14} />,
      label: 'Info',
    },
  };

  const styleConfig = SEVERITY_STYLE_MAP[severity];
  const metaConfig = iconAndLabelMap[severity];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border-2"
      style={{
        backgroundColor: styleConfig.bg,
        borderColor: styleConfig.border,
        color: styleConfig.text,
      }}
    >
      <span className="flex items-center">{metaConfig.icon}</span>
      {metaConfig.label}
    </span>
  );
};
