// apps/web/src/api/planning.api.ts
import { useQuery } from 'react-query';

import type {
  CriticalPathResponse,
  EisenhowerResponse,
  ForecastResponse,
  PolicyDescriptor,
  PolicyName,
  RecommendationsResponse,
  SimulateResponse,
} from '@taskverse/types';

import { api } from './client';

export const planningApi = {
  policies: () => api.get<{ policies: PolicyDescriptor[] }>('/planning/policies'),
  recommendations: (policy: PolicyName, includeBlocked: boolean) =>
    api.get<RecommendationsResponse>(
      `/planning/recommendations?policy=${policy}&limit=25&includeBlocked=${includeBlocked}`
    ),
  criticalPath: () => api.get<CriticalPathResponse>('/planning/critical-path'),
  eisenhower: () => api.get<EisenhowerResponse>('/planning/eisenhower'),
  forecast: (lookbackDays: number) =>
    api.get<ForecastResponse>(`/planning/forecast?lookbackDays=${lookbackDays}&bucket=day`),
  simulate: (workers: number) => api.get<SimulateResponse>(`/planning/simulate?workers=${workers}`),
};

export const planningKeys = {
  all: ['planning'] as const,
  policies: () => [...planningKeys.all, 'policies'] as const,
  recommendations: (policy: PolicyName, includeBlocked: boolean) =>
    [...planningKeys.all, 'recommendations', policy, includeBlocked] as const,
  criticalPath: () => [...planningKeys.all, 'critical-path'] as const,
  eisenhower: () => [...planningKeys.all, 'eisenhower'] as const,
  forecast: (lookbackDays: number) => [...planningKeys.all, 'forecast', lookbackDays] as const,
  simulate: (workers: number) => [...planningKeys.all, 'simulate', workers] as const,
};

const STALE = 60 * 1000;

export const usePolicies = () =>
  useQuery(planningKeys.policies(), planningApi.policies, { staleTime: 24 * 60 * 60 * 1000 });

export const useRecommendations = (policy: PolicyName, includeBlocked: boolean) =>
  useQuery(
    planningKeys.recommendations(policy, includeBlocked),
    () => planningApi.recommendations(policy, includeBlocked),
    { staleTime: STALE, keepPreviousData: true }
  );

export const useCriticalPath = () =>
  useQuery(planningKeys.criticalPath(), planningApi.criticalPath, { staleTime: STALE });

export const useEisenhower = () =>
  useQuery(planningKeys.eisenhower(), planningApi.eisenhower, { staleTime: STALE });

export const useForecast = (lookbackDays: number) =>
  useQuery(planningKeys.forecast(lookbackDays), () => planningApi.forecast(lookbackDays), {
    staleTime: STALE,
    keepPreviousData: true,
  });

export const useSimulation = (workers: number) =>
  useQuery(planningKeys.simulate(workers), () => planningApi.simulate(workers), {
    staleTime: STALE,
    keepPreviousData: true,
  });
