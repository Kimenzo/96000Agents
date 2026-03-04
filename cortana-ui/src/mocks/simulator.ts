import { useStore } from '../store/store';

let intervalId: ReturnType<typeof setInterval> | null = null;
let logCounter = 0;

export function startSimulator(): () => void {
  // Prevent stacking intervals on re-mount
  if (intervalId !== null) {
    clearInterval(intervalId);
  }

  const verbs = ['Synthesizing', 'Optimizing', 'Re-routing', 'Analyzing', 'Resolving', 'Transmitting'];
  const nouns = [
    'packet flux',
    'quantum coherence',
    'subnet density',
    'logic gate',
    'heuristic pathway',
    'neural drift',
  ];

  intervalId = setInterval(() => {
    const isError = Math.random() > 0.96;
    const isWarn = Math.random() > 0.85;

    const verb = verbs[Math.floor(Math.random() * verbs.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];

    let type: 'info' | 'warn' | 'error' = 'info';
    let msg = `${verb} ${noun}`;

    if (isError) {
      type = 'error';
      msg = `Anomaly detected in ${noun}`;
    } else if (isWarn) {
      type = 'warn';
      msg = `Latency spike during ${noun} analysis`;
    }

    useStore.getState().addLog({
      id: `log-${++logCounter}`,
      msg,
      type,
      time: Date.now(),
    });

    const currentMetrics = useStore.getState().metrics;

    // random metric updates
    useStore.getState().updateMetrics({
      processing: Math.floor(75000 + Math.random() * 25000),
      violations: isError ? currentMetrics.violations + 1 : currentMetrics.violations,
    });
  }, 400); // Fast log stream

  return () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}
