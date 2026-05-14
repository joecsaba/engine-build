import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { AdminPendingShop, AdminEditSuggestion, Shop, GeocodeResult } from "./generated/api.schemas";

/* ─── Geocoding (public) ─────────────────────────────────────────────────── */

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  return customFetch<GeocodeResult>(
    `/api/directory/geocode?address=${encodeURIComponent(address)}`,
    { method: "GET" }
  );
}

/* ─── Pending shops ──────────────────────────────────────────────────────── */

export function useAdminPendingShops() {
  return useQuery({
    queryKey: ["/api/admin/shops/pending"],
    queryFn: () => customFetch<AdminPendingShop[]>("/api/admin/shops/pending", { method: "GET" }),
  });
}

export function useApproveShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates?: Partial<Shop> }) =>
      customFetch<{ success: boolean; message: string }>(
        `/api/admin/shops/${id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates ?? {}),
        }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/shops/pending"] });
      qc.invalidateQueries({ queryKey: ["/api/directory/shops"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/shops"] });
    },
  });
}

export function useRejectShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean; message: string }>(
        `/api/admin/shops/${id}/reject`,
        { method: "POST" }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/shops/pending"] });
    },
  });
}

/* ─── All shops (admin view) ─────────────────────────────────────────────── */

export function useAdminAllShops(search?: string) {
  return useQuery({
    queryKey: ["/api/admin/shops", search],
    queryFn: () => {
      const url = search
        ? `/api/admin/shops?search=${encodeURIComponent(search)}`
        : "/api/admin/shops";
      return customFetch<AdminPendingShop[]>(url, { method: "GET" });
    },
  });
}

export function useAdminUpdateShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Shop> }) =>
      customFetch<{ success: boolean; message: string }>(
        `/api/admin/shops/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/shops"] });
      qc.invalidateQueries({ queryKey: ["/api/directory/shops"] });
    },
  });
}

export function useAdminDeleteShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean; message: string }>(
        `/api/admin/shops/${id}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/shops"] });
      qc.invalidateQueries({ queryKey: ["/api/directory/shops"] });
    },
  });
}

/* ─── Edit suggestions ───────────────────────────────────────────────────── */

export function useAdminEditSuggestions() {
  return useQuery({
    queryKey: ["/api/admin/shop-edits"],
    queryFn: () => customFetch<AdminEditSuggestion[]>("/api/admin/shop-edits", { method: "GET" }),
  });
}

export function useApplyEditSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, value }: { id: number; value?: string }) =>
      customFetch<{ success: boolean; message: string }>(
        `/api/admin/shop-edits/${id}/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(value !== undefined ? { value } : {}),
        }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/shop-edits"] });
      qc.invalidateQueries({ queryKey: ["/api/directory/shops"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/shops"] });
    },
  });
}

export function useRejectEditSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean; message: string }>(
        `/api/admin/shop-edits/${id}/reject`,
        { method: "POST" }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/shop-edits"] });
    },
  });
}
