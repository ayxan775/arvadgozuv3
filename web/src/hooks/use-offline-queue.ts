import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  clearOfflineQueue,
  enqueueOfflineItem,
  listOfflineItems,
  removeOfflineItem,
  type OfflineQueueItem,
  updateOfflineItem,
} from '@/lib/offline-queue';

export function useOfflineQueue() {
  const queryClient = useQueryClient();

  const queueQuery = useQuery({
    queryKey: ['offline', 'queue'],
    queryFn: listOfflineItems,
  });

  const enqueueMutation = useMutation({
    mutationFn: enqueueOfflineItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['offline', 'queue'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<OfflineQueueItem> }) => updateOfflineItem(id, updates),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['offline', 'queue'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeOfflineItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['offline', 'queue'] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: clearOfflineQueue,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['offline', 'queue'] });
    },
  });

  return {
    items: queueQuery.data ?? [],
    isLoading: queueQuery.isLoading,
    enqueue: enqueueMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    clear: clearMutation.mutateAsync,
  };
}
