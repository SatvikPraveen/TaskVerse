// apps/web/src/components/charts/theme.ts
//
// Chart colour roles. Categorical slots follow a fixed order and are never
// cycled; the three slots below validate as a set for colour-vision deficiency
// and normal-vision separation on the light surface (OKLab ΔE: CVD ≥ 9.2,
// normal ≥ 24). Text always uses text tokens, never a series colour.
export const chart = {
  surface: '#ffffff',
  grid: '#eeedea',
  axis: '#d6d4cf',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  textMuted: '#8a8984',
  /** Categorical slots in fixed order: blue, orange, aqua. */
  series: ['#2a78d6', '#eb6834', '#1baf7a'] as const,
  /** Single-hue sequential steps (blue), light → dark. */
  sequential: ['#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95'] as const,
  /** Status palette, reserved for state. Never reused as a series colour. */
  status: {
    good: '#008300',
    warning: '#c98500',
    serious: '#d95926',
    critical: '#e34948',
  },
} as const;

export const tooltipStyle = {
  backgroundColor: chart.surface,
  border: `1px solid ${chart.axis}`,
  borderRadius: 6,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  color: chart.textPrimary,
  fontSize: 12,
};

export const axisTick = { fontSize: 11, fill: chart.textSecondary };

export const formatHours = (hours: number): string => {
  if (!Number.isFinite(hours)) return '–';
  if (hours >= 48) return `${(hours / 24).toFixed(1)} d`;
  return `${hours.toFixed(hours >= 10 ? 0 : 1)} h`;
};

export const formatPercent = (value: number | null): string =>
  value === null || !Number.isFinite(value) ? '–' : `${Math.round(value * 100)}%`;

export const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
