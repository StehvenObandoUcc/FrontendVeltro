// src/constants/alertSeverityStyles.ts

import type { AlertSeverity } from '../api/inventory';

/** Visual style configuration for each alert severity level. */
export interface SeverityStyle {
  /** Background color for badge */
  bg: string;
  /** Border color for badge */
  border: string;
  /** Text color for badge */
  text: string;
  /** Subtle row background color for list items */
  rowBg: string;
  /** Row background color on hover */
  hoverBg: string;
  /** Left border indicator for list items */
  borderLeft: string;
}

/**
 * Centralized severity-to-style mapping.
 * Consumed by SeverityBadge and AlertList components.
 */
export const SEVERITY_STYLE_MAP: Record<AlertSeverity, SeverityStyle> = {
  CRITICAL: {
    bg: 'rgba(255, 46, 33, 0.1)',
    border: '#FF2E21',
    text: '#FF2E21',
    rowBg: 'rgba(255, 46, 33, 0.03)',
    hoverBg: 'rgba(255, 46, 33, 0.07)',
    borderLeft: '4px solid #FF2E21',
  },
  WARNING: {
    bg: '#FFF4E6',
    border: '#FFAC00',
    text: '#FF9500',
    rowBg: 'rgba(255, 149, 0, 0.03)',
    hoverBg: 'rgba(255, 149, 0, 0.07)',
    borderLeft: '4px solid #FF9500',
  },
  INFO: {
    bg: '#EBF5FF',
    border: '#3B82F6',
    text: '#1D4ED8',
    rowBg: 'rgba(37, 99, 235, 0.02)',
    hoverBg: 'rgba(37, 99, 235, 0.06)',
    borderLeft: '4px solid #3B82F6',
  },
};
