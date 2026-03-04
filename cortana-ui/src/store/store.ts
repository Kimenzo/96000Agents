import { create } from 'zustand';

export type Mode = 'MATRIX' | 'SWARM';
export type Log = { id: string; msg: string; type: 'info' | 'warn' | 'error'; time: number };

interface NexusStore {
  mode: Mode;
  logs: Log[];
  metrics: {
    active: number;
    processing: number;
    violations: number;
  };
  setMode: (m: Mode) => void;
  addLog: (l: Log) => void;
  updateMetrics: (m: Partial<NexusStore['metrics']>) => void;
}

export const useStore = create<NexusStore>((set) => ({
  mode: 'SWARM',
  logs: [],
  metrics: { active: 96000, processing: 0, violations: 0 },
  setMode: (mode) => set({ mode }),
  addLog: (log) => set((s) => ({ logs: [log, ...s.logs].slice(0, 50) })),
  updateMetrics: (m) => set((s) => ({ metrics: { ...s.metrics, ...m } })),
}));