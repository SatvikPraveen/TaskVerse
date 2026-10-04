// apps/web/src/components/charts/StatTile.tsx
import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Short qualifier shown under the value, e.g. "p85 of 12 tasks". */
  detail?: string;
}

/** A headline number. Not a chart: one value, read at a glance. */
export default function StatTile({ label, value, hint, detail }: StatTileProps) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm" title={hint}>
      <dt className="truncate text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tabular-nums text-gray-900">{value}</dd>
      {detail && <p className="mt-1 text-xs text-gray-500">{detail}</p>}
    </div>
  );
}
