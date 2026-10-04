// apps/web/src/api/analytics.api.ts
import { useQuery } from 'react-query';

import type {
  AgingResponse,
  CumulativeFlowPoint,
  FlowSummaryResponse,
  SeriesResponse,
  ThroughputPoint,
} from '@taskverse/types';

import { api } from './client';

export type Bucket = 'day' | 'week';

export const analyticsApi = {
  flow: (days: number) => api.get<FlowSummaryResponse>(`/analytics/flow?days=${days}`),
  throughput: (days: number, bucket: Bucket) =>
    api.get<SeriesResponse<ThroughputPoint>>(`/analytics/throughput?days=${days}&bucket=${bucket}`),
  cfd: (days: number, bucket: Bucket) =>
    api.get<SeriesResponse<CumulativeFlowPoint>>(`/analytics/cfd?days=${days}&bucket=${bucket}`),
  aging: () => api.get<AgingResponse>('/analytics/aging'),
};

export const analyticsKeys = {
  all: ['analytics'] as const,
  flow: (days: number) => [...analyticsKeys.all, 'flow', days] as const,
  throughput: (days: number, bucket: Bucket) => [...analyticsKeys.all, 'throughput', days, bucket] as const,
  cfd: (days: number, bucket: Bucket) => [...analyticsKeys.all, 'cfd', days, bucket] as const,
  aging: () => [...analyticsKeys.all, 'aging'] as const,
};

const options = { staleTime: 60 * 1000, keepPreviousData: true };

export const useFlowSummary = (days: number) =>
  useQuery(analyticsKeys.flow(days), () => analyticsApi.flow(days), options);

export const useThroughput = (days: number, bucket: Bucket) =>
  useQuery(analyticsKeys.throughput(days, bucket), () => analyticsApi.throughput(days, bucket), options);

export const useCumulativeFlow = (days: number, bucket: Bucket) =>
  useQuery(analyticsKeys.cfd(days, bucket), () => analyticsApi.cfd(days, bucket), options);

export const useAgingWip = () => useQuery(analyticsKeys.aging(), analyticsApi.aging, options);
