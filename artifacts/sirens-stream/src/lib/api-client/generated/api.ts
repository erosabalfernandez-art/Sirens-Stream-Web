import { useMutation, useQuery } from '@tanstack/react-query';
  import type { MutationFunction, QueryFunction, QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
  import type { AgencyStats, ChatInput, ChatResponse, HealthStatus, Tutorial } from './api.schemas';
  import { customFetch } from '../custom-fetch';
  import type { ErrorType, BodyType } from '../custom-fetch';

  type AwaitedInput<T> = PromiseLike<T> | T;
  type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
  type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];

  export const getHealthCheckUrl = () => `/api/healthz`;
  export const healthCheck = async (options?: RequestInit): Promise<HealthStatus> => customFetch<HealthStatus>(getHealthCheckUrl(), { ...options, method: 'GET' });
  export const getHealthCheckQueryKey = () => [`/api/healthz`] as const;
  export const getHealthCheckQueryOptions = <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>; request?: SecondParameter<typeof customFetch> }) => {
    const { query: queryOptions, request: requestOptions } = options ?? {};
    const queryKey = queryOptions?.queryKey ?? getHealthCheckQueryKey();
    const queryFn: QueryFunction<Awaited<ReturnType<typeof healthCheck>>> = ({ signal }) => healthCheck({ signal, ...requestOptions });
    return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & { queryKey: QueryKey };
  };
  export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
  export type HealthCheckQueryError = ErrorType<unknown>;
  export function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>; request?: SecondParameter<typeof customFetch> }): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
    const opts = getHealthCheckQueryOptions(options);
    const q = useQuery(opts) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
    return { ...q, queryKey: opts.queryKey };
  }

  export const getSendChatMessageUrl = () => `/api/chat`;
  export const sendChatMessage = async (chatInput: ChatInput, options?: RequestInit): Promise<ChatResponse> => customFetch<ChatResponse>(getSendChatMessageUrl(), { ...options, method: 'POST', headers: { 'Content-Type': 'application/json', ...options?.headers }, body: JSON.stringify(chatInput) });
  export const getSendChatMessageMutationOptions = <TError = ErrorType<unknown>, TContext = unknown>(options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendChatMessage>>, TError, { data: BodyType<ChatInput> }, TContext>; request?: SecondParameter<typeof customFetch> }): UseMutationOptions<Awaited<ReturnType<typeof sendChatMessage>>, TError, { data: BodyType<ChatInput> }, TContext> => {
    const mutationKey = ['sendChatMessage'];
    const { mutation: mutationOptions, request: requestOptions } = options ? (options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ? options : { ...options, mutation: { ...options.mutation, mutationKey } }) : { mutation: { mutationKey }, request: undefined };
    const mutationFn: MutationFunction<Awaited<ReturnType<typeof sendChatMessage>>, { data: BodyType<ChatInput> }> = (props) => { const { data } = props ?? {}; return sendChatMessage(data, requestOptions); };
    return { mutationFn, ...mutationOptions };
  };
  export type SendChatMessageMutationResult = NonNullable<Awaited<ReturnType<typeof sendChatMessage>>>;
  export type SendChatMessageMutationBody = BodyType<ChatInput>;
  export type SendChatMessageMutationError = ErrorType<unknown>;
  export const useSendChatMessage = <TError = ErrorType<unknown>, TContext = unknown>(options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendChatMessage>>, TError, { data: BodyType<ChatInput> }, TContext>; request?: SecondParameter<typeof customFetch> }): UseMutationResult<Awaited<ReturnType<typeof sendChatMessage>>, TError, { data: BodyType<ChatInput> }, TContext> => useMutation(getSendChatMessageMutationOptions(options));

  export const getListTutorialsUrl = () => `/api/tutorials`;
  export const listTutorials = async (options?: RequestInit): Promise<Tutorial[]> => customFetch<Tutorial[]>(getListTutorialsUrl(), { ...options, method: 'GET' });
  export const getListTutorialsQueryKey = () => [`/api/tutorials`] as const;
  export const getListTutorialsQueryOptions = <TData = Awaited<ReturnType<typeof listTutorials>>, TError = ErrorType<unknown>>(options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof listTutorials>>, TError, TData>; request?: SecondParameter<typeof customFetch> }) => {
    const { query: queryOptions, request: requestOptions } = options ?? {};
    const queryKey = queryOptions?.queryKey ?? getListTutorialsQueryKey();
    const queryFn: QueryFunction<Awaited<ReturnType<typeof listTutorials>>> = ({ signal }) => listTutorials({ signal, ...requestOptions });
    return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<Awaited<ReturnType<typeof listTutorials>>, TError, TData> & { queryKey: QueryKey };
  };
  export type ListTutorialsQueryResult = NonNullable<Awaited<ReturnType<typeof listTutorials>>>;
  export type ListTutorialsQueryError = ErrorType<unknown>;
  export function useListTutorials<TData = Awaited<ReturnType<typeof listTutorials>>, TError = ErrorType<unknown>>(options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof listTutorials>>, TError, TData>; request?: SecondParameter<typeof customFetch> }): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
    const opts = getListTutorialsQueryOptions(options);
    const q = useQuery(opts) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
    return { ...q, queryKey: opts.queryKey };
  }

  export const getGetTutorialUrl = (id: number) => `/api/tutorials/${id}`;
  export const getTutorial = async (id: number, options?: RequestInit): Promise<Tutorial> => customFetch<Tutorial>(getGetTutorialUrl(id), { ...options, method: 'GET' });
  export const getGetTutorialQueryKey = (id: number) => [`/api/tutorials/${id}`] as const;
  export const getGetTutorialQueryOptions = <TData = Awaited<ReturnType<typeof getTutorial>>, TError = ErrorType<void>>(id: number, options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof getTutorial>>, TError, TData>; request?: SecondParameter<typeof customFetch> }) => {
    const { query: queryOptions, request: requestOptions } = options ?? {};
    const queryKey = queryOptions?.queryKey ?? getGetTutorialQueryKey(id);
    const queryFn: QueryFunction<Awaited<ReturnType<typeof getTutorial>>> = ({ signal }) => getTutorial(id, { signal, ...requestOptions });
    return { queryKey, queryFn, enabled: !!(id), ...queryOptions } as UseQueryOptions<Awaited<ReturnType<typeof getTutorial>>, TError, TData> & { queryKey: QueryKey };
  };
  export type GetTutorialQueryResult = NonNullable<Awaited<ReturnType<typeof getTutorial>>>;
  export type GetTutorialQueryError = ErrorType<void>;
  export function useGetTutorial<TData = Awaited<ReturnType<typeof getTutorial>>, TError = ErrorType<void>>(id: number, options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof getTutorial>>, TError, TData>; request?: SecondParameter<typeof customFetch> }): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
    const opts = getGetTutorialQueryOptions(id, options);
    const q = useQuery(opts) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
    return { ...q, queryKey: opts.queryKey };
  }

  export const getGetAgencyStatsUrl = () => `/api/stats`;
  export const getAgencyStats = async (options?: RequestInit): Promise<AgencyStats> => customFetch<AgencyStats>(getGetAgencyStatsUrl(), { ...options, method: 'GET' });
  export const getGetAgencyStatsQueryKey = () => [`/api/stats`] as const;
  export const getGetAgencyStatsQueryOptions = <TData = Awaited<ReturnType<typeof getAgencyStats>>, TError = ErrorType<unknown>>(options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof getAgencyStats>>, TError, TData>; request?: SecondParameter<typeof customFetch> }) => {
    const { query: queryOptions, request: requestOptions } = options ?? {};
    const queryKey = queryOptions?.queryKey ?? getGetAgencyStatsQueryKey();
    const queryFn: QueryFunction<Awaited<ReturnType<typeof getAgencyStats>>> = ({ signal }) => getAgencyStats({ signal, ...requestOptions });
    return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<Awaited<ReturnType<typeof getAgencyStats>>, TError, TData> & { queryKey: QueryKey };
  };
  export type GetAgencyStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getAgencyStats>>>;
  export type GetAgencyStatsQueryError = ErrorType<unknown>;
  export function useGetAgencyStats<TData = Awaited<ReturnType<typeof getAgencyStats>>, TError = ErrorType<unknown>>(options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof getAgencyStats>>, TError, TData>; request?: SecondParameter<typeof customFetch> }): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
    const opts = getGetAgencyStatsQueryOptions(options);
    const q = useQuery(opts) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
    return { ...q, queryKey: opts.queryKey };
  }
  