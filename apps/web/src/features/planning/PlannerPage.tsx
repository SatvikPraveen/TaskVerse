// apps/web/src/features/planning/PlannerPage.tsx
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import {
  useCriticalPath,
  useEisenhower,
  useForecast,
  usePolicies,
  useRecommendations,
  useSimulation,
} from '@/api/planning.api';
import ChartCard, { DataTable } from '@/components/charts/ChartCard';
import StatTile from '@/components/charts/StatTile';
import { axisTick, chart, formatHours, formatPercent, tooltipStyle } from '@/components/charts/theme';
import type { EisenhowerQuadrant, PolicyName } from '@taskverse/types';

const selectClass =
  'rounded-md border-gray-300 py-1 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500';

const QUADRANTS: Array<{ key: EisenhowerQuadrant; label: string; hint: string }> = [
  { key: 'do_first', label: 'Do first', hint: 'Important and urgent' },
  { key: 'schedule', label: 'Schedule', hint: 'Important, not urgent' },
  { key: 'delegate', label: 'Delegate', hint: 'Urgent, not important' },
  { key: 'eliminate', label: 'Reconsider', hint: 'Neither important nor urgent' },
];

const priorityLabel = (weight: number) => ['', 'Low', 'Medium', 'High', 'Urgent'][weight] ?? String(weight);

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function PlannerPage() {
  const [policy, setPolicy] = useState<PolicyName>('wsjf');
  const [includeBlocked, setIncludeBlocked] = useState(false);
  const [lookbackDays, setLookbackDays] = useState(60);
  const [workers, setWorkers] = useState(1);

  const policies = usePolicies();
  const recommendations = useRecommendations(policy, includeBlocked);
  const criticalPath = useCriticalPath();
  const eisenhower = useEisenhower();
  const forecast = useForecast(lookbackDays);
  const simulation = useSimulation(workers);

  const rec = recommendations.data?.data;
  const cpm = criticalPath.data?.data;
  const fc = forecast.data?.data;
  const sim = simulation.data?.data;
  const quadrants = eisenhower.data?.data.quadrants;
  const activePolicy = policies.data?.data.policies.find(p => p.name === policy);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Planner</h1>
        <p className="mt-1 text-gray-600">
          What to work on next, what is on the critical path, and when the backlog is likely to be done.
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Ready to start"
          value={rec?.totals.ready ?? '–'}
          detail={rec ? `${rec.totals.blocked} blocked by prerequisites` : undefined}
        />
        <StatTile
          label="Critical path"
          value={cpm ? formatHours(cpm.makespanHours) : '–'}
          detail={cpm ? `${cpm.criticalPath.length} tasks with zero slack` : undefined}
          hint="Shortest possible duration with unlimited parallelism."
        />
        <StatTile
          label="Likely done by (85 %)"
          value={fc?.forecast ? dateLabel(fc.forecast.dates.p85) : '–'}
          detail={
            fc?.forecast ? `${fc.remainingItems} open · median ${dateLabel(fc.forecast.dates.p50)}` : fc?.note
          }
          hint="Monte Carlo forecast from your completed-per-day history."
        />
      </dl>

      <ChartCard
        title="Recommendations"
        description={
          activePolicy
            ? `${activePolicy.label}: ${activePolicy.summary} (${activePolicy.reference})`
            : undefined
        }
        actions={
          <>
            <label className="text-sm text-gray-600">
              Policy{' '}
              <select
                className={selectClass}
                value={policy}
                onChange={e => setPolicy(e.target.value as PolicyName)}
              >
                {(policies.data?.data.policies ?? []).map(p => (
                  <option key={p.name} value={p.name}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1 text-sm text-gray-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                checked={includeBlocked}
                onChange={e => setIncludeBlocked(e.target.checked)}
              />
              Show blocked
            </label>
          </>
        }
      >
        {!rec || rec.recommendations.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            Nothing to recommend. Create some tasks first.
          </p>
        ) : (
          <ol className="divide-y divide-gray-100">
            {rec.recommendations.map(r => (
              <li key={r.taskId} className="flex items-start gap-4 py-3">
                <span className="mt-0.5 w-6 shrink-0 text-right text-sm tabular-nums text-gray-400">
                  {r.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-gray-900">{r.title ?? r.taskId}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                      {priorityLabel(r.priorityWeight)}
                    </span>
                    {r.dueDate && <span className="text-xs text-gray-500">due {dateLabel(r.dueDate)}</span>}
                    {r.estimatedHours !== null && (
                      <span className="text-xs text-gray-500">{formatHours(r.estimatedHours)}</span>
                    )}
                    {r.isBlocked && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                        blocked
                      </span>
                    )}
                    {r.unblocks > 0 && <span className="text-xs text-gray-500">unblocks {r.unblocks}</span>}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600">{r.rationale}</p>
                </div>
                {r.score !== null && (
                  <span className="shrink-0 text-sm tabular-nums text-gray-700">{r.score.toFixed(2)}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Critical path"
          description="The chain of dependent tasks that sets the project duration. Slack is how long a task may slip without delaying the whole."
        >
          {!cpm || cpm.nodes.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No open tasks with estimates.</p>
          ) : cpm.cycle ? (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              Dependency cycle detected: {cpm.cycle.map(n => n.title ?? n.taskId).join(' → ')}
            </p>
          ) : (
            <DataTable
              headers={['Task', 'Duration', 'Earliest start', 'Slack', '']}
              rows={cpm.nodes
                .slice(0, 20)
                .map(n => [
                  n.title ?? n.taskId,
                  formatHours(n.durationHours),
                  formatHours(n.earliestStart),
                  formatHours(n.slackHours),
                  n.isCritical ? (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                      critical
                    </span>
                  ) : (
                    ''
                  ),
                ])}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Completion forecast"
          description="Bootstrap of your completed-per-day history. Bars show how many of the simulated futures finish in each number of days."
          actions={
            <label className="text-sm text-gray-600">
              History{' '}
              <select
                className={selectClass}
                value={lookbackDays}
                onChange={e => setLookbackDays(Number(e.target.value))}
              >
                {[30, 60, 120].map(d => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </select>
            </label>
          }
          table={
            fc?.forecast ? (
              <DataTable
                headers={['Days', 'Simulated futures']}
                rows={fc.forecast.histogram.map(h => [h.periods, h.count])}
              />
            ) : undefined
          }
        >
          {!fc?.forecast ? (
            <p className="py-8 text-center text-sm text-gray-500">{fc?.note ?? 'Loading…'}</p>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fc.forecast.histogram} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke={chart.grid} vertical={false} />
                    <XAxis
                      dataKey="periods"
                      tick={axisTick}
                      axisLine={{ stroke: chart.axis }}
                      tickLine={false}
                      label={{
                        value: 'days',
                        position: 'insideRight',
                        offset: -4,
                        fontSize: 11,
                        fill: chart.textSecondary,
                      }}
                    />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number) => [v, 'Futures']}
                      labelFormatter={l => `${l} days`}
                      cursor={{ fill: 'rgba(42,120,214,0.06)' }}
                    />
                    <Bar dataKey="count" fill={chart.series[0]} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <dl className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
                {(['p50', 'p70', 'p85', 'p95'] as const).map(p => (
                  <div key={p} className="rounded-md bg-gray-50 p-2">
                    <dt className="text-xs uppercase text-gray-500">{p}</dt>
                    <dd className="font-medium text-gray-900">{dateLabel(fc.forecast!.dates[p])}</dd>
                    <dd className="text-xs text-gray-500">{fc.forecast!.periods[p]} d</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Policy comparison on your backlog"
        description="Simulates every policy on your open tasks and ranks them by priority-weighted lateness."
        actions={
          <label className="text-sm text-gray-600">
            Workers{' '}
            <select
              className={selectClass}
              value={workers}
              onChange={e => setWorkers(Number(e.target.value))}
            >
              {[1, 2, 3, 5].map(w => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
        }
      >
        {!sim || sim.pendingTasks === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No open tasks to simulate.</p>
        ) : (
          <DataTable
            headers={[
              'Policy',
              'Weighted lateness',
              'Late tasks',
              'On time',
              'Mean flow time',
              'Makespan',
              '',
            ]}
            rows={sim.runs.map(run => [
              <span key="l" className="font-medium text-gray-900">
                {run.label}
              </span>,
              formatHours(run.metrics.weightedTardiness),
              run.metrics.lateTasks,
              formatPercent(run.metrics.onTimeRate),
              formatHours(run.metrics.meanFlowTime),
              formatHours(run.metrics.makespan),
              run.policy === sim.recommendedPolicy ? (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">best</span>
              ) : (
                ''
              ),
            ])}
          />
        )}
      </ChartCard>

      <ChartCard
        title="Eisenhower matrix"
        description="Importance from priority, urgency from the deadline (within 48 h)."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {QUADRANTS.map(q => {
            const items = quadrants?.[q.key] ?? [];
            return (
              <div key={q.key} className="rounded-md border border-gray-200 p-3">
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{q.label}</h3>
                  <span className="text-xs text-gray-500">{q.hint}</span>
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400">Empty</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {items.slice(0, 6).map(item => (
                      <li key={item.taskId} className="flex justify-between gap-2">
                        <span className="truncate text-gray-800">{item.title ?? item.taskId}</span>
                        {item.dueDate && (
                          <span className="shrink-0 text-xs text-gray-500">{dateLabel(item.dueDate)}</span>
                        )}
                      </li>
                    ))}
                    {items.length > 6 && <li className="text-xs text-gray-400">+{items.length - 6} more</li>}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </ChartCard>
    </div>
  );
}
