import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { Alert, CaseAction, CaseDetailResponse, CaseFilters, CaseSummary, CreateCaseRequest, Dashboard } from './types';
import { DemoError, demoFetch } from './demoBackend';

export const isDemo = import.meta.env.VITE_DEMO === 'true';

const httpBaseQuery = fetchBaseQuery({ baseUrl: `${import.meta.env.VITE_API_URL ?? ''}/api` });

/** In demo mode requests are answered in the browser; otherwise they go to the ASP.NET Core API. */
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extra) => {
  if (!isDemo) return httpBaseQuery(args, api, extra);

  const a = typeof args === 'string' ? { url: args } : args;
  const query = a.params ? `?${new URLSearchParams(Object.entries(a.params).filter(([, v]) => v != null && v !== '') as [string, string][])}` : '';
  try {
    return { data: await demoFetch(a.method ?? 'GET', `/api${a.url}${query}`, a.body) };
  } catch (e) {
    const err = e instanceof DemoError ? e : new DemoError(500, String(e));
    return { error: { status: err.status, data: { detail: err.message } } };
  }
};

export const hardshipApi = createApi({
  reducerPath: 'hardshipApi',
  baseQuery,
  tagTypes: ['Case', 'Dashboard', 'Alert'],
  endpoints: (build) => ({
    getDashboard: build.query<Dashboard, void>({
      query: () => '/dashboard',
      providesTags: ['Dashboard'],
    }),
    getCases: build.query<CaseSummary[], CaseFilters>({
      query: (filters) => ({ url: '/cases', params: filters }),
      providesTags: (result) => [
        ...(result ?? []).map((c) => ({ type: 'Case' as const, id: c.caseId })),
        { type: 'Case' as const, id: 'LIST' },
      ],
    }),
    getCase: build.query<CaseDetailResponse, number>({
      query: (id) => `/cases/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Case', id }],
    }),
    createCase: build.mutation<{ caseId: number }, CreateCaseRequest>({
      query: (body) => ({ url: '/cases', method: 'POST', body }),
      invalidatesTags: [{ type: 'Case', id: 'LIST' }, 'Dashboard'],
    }),
    caseAction: build.mutation<void, { id: number; action: CaseAction }>({
      query: ({ id, action }) => ({ url: `/cases/${id}/${action.kind}`, method: 'POST', body: action.body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Case', id }, { type: 'Case', id: 'LIST' }, 'Dashboard', 'Alert'],
    }),
    getAlerts: build.query<Alert[], void>({
      query: () => '/alerts',
      providesTags: ['Alert'],
    }),
    acknowledgeAlert: build.mutation<void, number>({
      query: (id) => ({ url: `/alerts/${id}/acknowledge`, method: 'POST' }),
      invalidatesTags: ['Alert'],
    }),
    runDeadlineMonitor: build.mutation<unknown, void>({
      query: () => ({ url: '/jobs/deadline-monitor', method: 'POST' }),
      invalidatesTags: ['Alert'],
    }),
  }),
});

export const {
  useGetDashboardQuery,
  useGetCasesQuery,
  useGetCaseQuery,
  useCreateCaseMutation,
  useCaseActionMutation,
  useGetAlertsQuery,
  useAcknowledgeAlertMutation,
  useRunDeadlineMonitorMutation,
} = hardshipApi;

/** Pulls the human-readable message out of a ProblemDetails / ValidationProblemDetails error. */
export function errorMessage(error: unknown): string {
  const data = (error as { data?: { detail?: string; title?: string; errors?: Record<string, string[]> } })?.data;
  if (data?.errors) return Object.values(data.errors).flat().join(' ');
  return data?.detail ?? data?.title ?? 'Something went wrong. Please try again.';
}
