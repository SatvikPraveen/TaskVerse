// apps/web/src/features/analytics/AnalyticsPage.tsx
import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  type Bucket,
  useAgingWip,
  useCumulativeFlow,
  useFlowSummary,
  useThroughput,
} from '@/api/analytics.api';
import ChartCard, { DataTable } from '@/components/charts/ChartCard';
import StatTile from '@/components/charts/StatTile';
import {
  axisTick,
  chart,
  formatHours,
  formatPercent,
  shortDate,
  tooltipStyle,
} from '@/components/charts/theme';

const WINDOWS = [14, 30, 90] as const;

const selectClass =
  'rounded-md border-gray-300 py-1 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500';

export default function AnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  const [bucket, setBucket] = useState<Bucket>('day');

  const flow = useFlowSummary(days);
  const throughput = useThroughput(days, bucket);
  const cfd = useCumulativeFlow(days, bucket);
  const aging = useAgingWip();

  const summary = flow.data?.data;
  const throughputSeries = throughput.data?.data.series ?? [];
  const cfdSeries = cfd.data?.data.series ?? [];
  const agingItems = aging.data?.data.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flow analytics</h1>
          <p className="mt-1 text-gray-600">How work moves: cycle time, throughput and work in progress.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">
            Window{' '}
            <select className={selectClass} value={days} onChange={e => setDays(Number(e.target.value))}>
              {WINDOWS.map(w => (
                <option key={w} value={w}>
                  Last {w} days
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-600">
            Bucket{' '}
            <select
              className={selectClass}
              value={bucket}
              onChange={e => setBucket(e.target.value as Bucket)}
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
            </select>
          </label>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Cycle time (p85)"
          value={summary ? formatHours(summary.cycleTimeHours.p85) : '–'}
          detail={
            summary
              ? `median ${formatHours(summary.cycleTimeHours.p50)} · n = ${summary.cycleTimeHours.n}`
              : undefined
          }
          hint="Hours from first start to completion; 85 % of completed tasks took this long or less."
        />
        <StatTile
          label="Lead time (p85)"
          value={summary ? formatHours(summary.leadTimeHours.p85) : '–'}
          detail={summary ? `median ${formatHours(summary.leadTimeHours.p50)}` : undefined}
          hint="Hours from creation to completion."
        />
        <StatTile
          label="Throughput"
          value={summary ? summary.throughputPerDay.toFixed(2) : '–'}
          detail={summary ? `${summary.completed} completed in ${summary.window.days} days` : undefined}
          hint="Completed tasks per day over the window."
        />
        <StatTile
          label="Work in progress"
          value={summary?.wip ?? '–'}
          detail={
            summary?.littlesLawLeadTimeDays !== null && summary
              ? `≈ ${summary.littlesLawLeadTimeDays} days to drain (Little's Law) · on time ${formatPercent(summary.onTimeRate)}`
              : 'No completions yet'
          }
          hint="Open tasks. Little's Law: lead time ≈ WIP ÷ throughput."
        />
      </dl>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Throughput"
          description="Tasks created and completed per period."
          table={
            <DataTable
              headers={['Period', 'Created', 'Completed']}
              rows={throughputSeries.map(p => [p.period, p.created, p.completed])}
            />
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={throughputSeries}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                barGap={2}
              >
                <CartesianGrid stroke={chart.grid} vertical={false} />
                <XAxis
                  dataKey="period"
                  tickFormatter={shortDate}
                  tick={axisTick}
                  axisLine={{ stroke: chart.axis }}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'rgba(42,120,214,0.06)' }}
                  labelFormatter={l => shortDate(String(l))}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: chart.textSecondary }}
                />
                <Bar
                  dataKey="created"
                  name="Created"
                  fill={chart.series[1]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="completed"
                  name="Completed"
                  fill={chart.series[0]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Cumulative flow"
          description="How many tasks sat in each state at the end of each period."
          table={
            <DataTable
              headers={['Period', 'To do', 'In progress', 'Completed']}
              rows={cfdSeries.map(p => [p.period, p.todo, p.in_progress, p.completed])}
            />
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cfdSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={chart.grid} vertical={false} />
                <XAxis
                  dataKey="period"
                  tickFormatter={shortDate}
                  tick={axisTick}
                  axisLine={{ stroke: chart.axis }}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={l => shortDate(String(l))} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: chart.textSecondary }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stackId="flow"
                  stroke={chart.series[2]}
                  fill={chart.series[2]}
                  fillOpacity={0.55}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="in_progress"
                  name="In progress"
                  stackId="flow"
                  stroke={chart.series[1]}
                  fill={chart.series[1]}
                  fillOpacity={0.55}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="todo"
                  name="To do"
                  stackId="flow"
                  stroke={chart.series[0]}
                  fill={chart.series[0]}
                  fillOpacity={0.55}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="Aging work in progress"
        description="Open tasks, oldest first. Long-lived items are where flow is stuck."
      >
        {agingItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No open work.</p>
        ) : (
          <DataTable
            headers={['Task', 'Status', 'Age', 'In progress for']}
            rows={agingItems
              .slice(0, 25)
              .map(item => [
                item.title ?? item.id,
                item.status === 'in_progress' ? 'In progress' : 'To do',
                formatHours(item.ageHours),
                item.inProgressHours === null ? '–' : formatHours(item.inProgressHours),
              ])}
          />
        )}
      </ChartCard>
    </div>
  );
}
