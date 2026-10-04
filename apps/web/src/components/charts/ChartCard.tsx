// apps/web/src/components/charts/ChartCard.tsx
import { useState, type ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  description?: string;
  /** Rendered when the user toggles the accessible table view. */
  table?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

/** Card chrome shared by every chart: title, one-line reading aid, optional table view. */
export default function ChartCard({ title, description, table, actions, children }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm" aria-label={title}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {table && (
            <button
              type="button"
              onClick={() => setShowTable(v => !v)}
              className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              aria-pressed={showTable}
            >
              {showTable ? 'Chart' : 'Table'}
            </button>
          )}
        </div>
      </header>
      {showTable && table ? <div className="overflow-x-auto">{table}</div> : children}
    </section>
  );
}

export function DataTable({ headers, rows }: { headers: string[]; rows: Array<Array<ReactNode>> }) {
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
          {headers.map(h => (
            <th key={h} className="py-2 pr-4 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className="py-2 pr-4 tabular-nums text-gray-800">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
