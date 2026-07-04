import { create } from "zustand";

const TTL = 30_000;

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

function isFresh<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
  return entry !== null && Date.now() - entry.fetchedAt < TTL;
}

export interface AdminData {
  employees: any[];
  leaves: any[];
  anomalies: any[];
}

interface DataState {
  _employees: CacheEntry<any[]> | null;
  _leaves: CacheEntry<any[]> | null;
  _anomalies: CacheEntry<any[]> | null;
  _loading: Record<string, boolean>;

  fetchEmployees: (force?: boolean) => Promise<any[]>;
  fetchLeaves: (force?: boolean) => Promise<any[]>;
  fetchAnomalies: (force?: boolean) => Promise<any[]>;
  fetchAdminAll: (force?: boolean) => Promise<AdminData>;
  invalidateEmployees: () => void;
  invalidateLeaves: () => void;
  invalidateAll: () => void;
  isLoading: (key: string) => boolean;
}

export const useDataStore = create<DataState>((set, get) => ({
  _employees: null,
  _leaves: null,
  _anomalies: null,
  _loading: {},

  fetchEmployees: async (force) => {
    const cached = get()._employees;
    if (!force && isFresh(cached)) return cached.data;
    set((s) => ({ _loading: { ...s._loading, employees: true } }));
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      const employees = data.users ?? [];
      set({ _employees: { data: employees, fetchedAt: Date.now() } });
      return employees;
    } finally {
      set((s) => ({ _loading: { ...s._loading, employees: false } }));
    }
  },

  fetchLeaves: async (force) => {
    const cached = get()._leaves;
    if (!force && isFresh(cached)) return cached.data;
    set((s) => ({ _loading: { ...s._loading, leaves: true } }));
    try {
      const res = await fetch("/api/leave?all=true");
      const data = await res.json();
      const leaves = data.leaves ?? [];
      set({ _leaves: { data: leaves, fetchedAt: Date.now() } });
      return leaves;
    } finally {
      set((s) => ({ _loading: { ...s._loading, leaves: false } }));
    }
  },

  fetchAnomalies: async (force) => {
    const cached = get()._anomalies;
    if (!force && isFresh(cached)) return cached.data;
    set((s) => ({ _loading: { ...s._loading, anomalies: true } }));
    try {
      const res = await fetch("/api/copilot/anomalies");
      const data = await res.json();
      const anomalies = data.flags ?? [];
      set({ _anomalies: { data: anomalies, fetchedAt: Date.now() } });
      return anomalies;
    } finally {
      set((s) => ({ _loading: { ...s._loading, anomalies: false } }));
    }
  },

  fetchAdminAll: async (force) => {
    const [employees, leaves, anomalies] = await Promise.all([
      get().fetchEmployees(force),
      get().fetchLeaves(force),
      get().fetchAnomalies(force),
    ]);
    return { employees, leaves, anomalies };
  },

  invalidateEmployees: () => set({ _employees: null }),
  invalidateLeaves: () => set({ _leaves: null }),
  invalidateAll: () => set({ _employees: null, _leaves: null, _anomalies: null }),

  isLoading: (key) => get()._loading[key] ?? false,
}));
