import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/context/AuthContext";

export interface CalcPreset {
  id: number;
  userId: string;
  calcSlug: string;
  name: string;
  state: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Per-calculator preset management. Lists, creates, updates, and deletes
 * named saves for a single calculator slug.
 *
 * For guest users, server is not called — list is empty and saves return an
 * error. Guests must sign in to use presets (favorites/recents are the
 * guest-friendly equivalent).
 */
export function useCalcPresets(calcSlug: string) {
  const { isSignedIn, isLoaded } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ["presets", calcSlug];

  const query = useQuery<CalcPreset[]>({
    queryKey,
    queryFn: async () => {
      if (!isSignedIn) return [];
      const res = await authFetch(`/api/me/presets?calcSlug=${encodeURIComponent(calcSlug)}`);
      if (!res.ok) throw new Error(`Failed to load presets: ${res.status}`);
      return res.json();
    },
    enabled: isLoaded,
    staleTime: 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (input: { name: string; state: Record<string, unknown> }): Promise<CalcPreset> => {
      const res = await authFetch("/api/me/presets", {
        method: "POST",
        body: JSON.stringify({ calcSlug, name: input.name, state: input.state }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error ?? `Save failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: { id: number; name?: string; state?: Record<string, unknown> }): Promise<CalcPreset> => {
      const { id, ...patch } = input;
      const res = await authFetch(`/api/me/presets/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error ?? `Update failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const res = await authFetch(`/api/me/presets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error ?? `Delete failed (${res.status})`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const save = useCallback(
    (name: string, state: Record<string, unknown>) => saveMutation.mutateAsync({ name, state }),
    [saveMutation],
  );

  const update = useCallback(
    (id: number, patch: { name?: string; state?: Record<string, unknown> }) =>
      updateMutation.mutateAsync({ id, ...patch }),
    [updateMutation],
  );

  const remove = useCallback(
    (id: number) => deleteMutation.mutateAsync(id),
    [deleteMutation],
  );

  return {
    presets: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    save,
    update,
    remove,
    saveError: saveMutation.error as Error | null,
    isSaving: saveMutation.isPending,
  };
}
