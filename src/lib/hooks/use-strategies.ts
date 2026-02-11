import type {
  CreateStrategyInput,
  Strategy,
  StrategyLog,
  UpdateStrategyInput,
} from '@/lib/types/strategy';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const STRATEGIES_KEY = ['strategies'];

/**
 * Fetch all strategies for the current user
 */
export function useStrategies() {
  return useQuery<{ strategies: Strategy[] }>({
    queryKey: STRATEGIES_KEY,
    queryFn: async () => {
      const res = await fetch('/api/strategies');
      if (!res.ok) throw new Error('Failed to fetch strategies');
      return res.json();
    },
  });
}

/**
 * Fetch a single strategy by ID with recent logs
 */
export function useStrategy(id: string | undefined) {
  return useQuery<{ strategy: Strategy; logs: StrategyLog[] }>({
    queryKey: [...STRATEGIES_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('Strategy ID required');
      const res = await fetch(`/api/strategies?id=${id}`);
      if (!res.ok) throw new Error('Failed to fetch strategy');
      return res.json();
    },
    enabled: !!id,
  });
}

/**
 * Fetch logs for a strategy (paginated)
 */
export function useStrategyLogs(
  strategyId: string | undefined,
  options?: { limit?: number; level?: string; refetchInterval?: number },
) {
  return useQuery<{ logs: StrategyLog[]; total: number }>({
    queryKey: [...STRATEGIES_KEY, strategyId, 'logs', options?.level],
    queryFn: async () => {
      if (!strategyId) throw new Error('Strategy ID required');
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.level) params.append('level', options.level);
      const res = await fetch(`/api/strategies/${strategyId}/logs?${params}`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    },
    enabled: !!strategyId,
    refetchInterval: options?.refetchInterval,
  });
}

/**
 * Create a new strategy
 */
export function useCreateStrategy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStrategyInput) => {
      const res = await fetch('/api/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create strategy');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STRATEGIES_KEY });
    },
  });
}

/**
 * Update an existing strategy
 */
export function useUpdateStrategy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & UpdateStrategyInput) => {
      const res = await fetch('/api/strategies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update strategy');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: STRATEGIES_KEY });
      queryClient.invalidateQueries({ queryKey: [...STRATEGIES_KEY, variables.id] });
    },
  });
}

/**
 * Delete a strategy
 */
export function useDeleteStrategy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/strategies?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete strategy');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STRATEGIES_KEY });
    },
  });
}

/**
 * Start a strategy (set status to 'running')
 */
export function useStartStrategy() {
  const updateStrategy = useUpdateStrategy();

  return useMutation({
    mutationFn: async (id: string) => {
      return updateStrategy.mutateAsync({ id, status: 'running' });
    },
  });
}

/**
 * Stop a strategy (set status to 'paused')
 */
export function useStopStrategy() {
  const updateStrategy = useUpdateStrategy();

  return useMutation({
    mutationFn: async (id: string) => {
      return updateStrategy.mutateAsync({ id, status: 'paused' });
    },
  });
}
