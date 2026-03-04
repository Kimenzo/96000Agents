/**
 * EVO Intelligence Layer — Mode Comparator
 *
 * SWITCH: Runs continuously, collecting metrics from the active strategy
 * and storing them with the mode tag. When you switch, metrics continue
 * accumulating under the new mode tag. Pull a side-by-side comparison
 * at any time.
 *
 * Scoring weights:
 *   findingsPerMinute (40%) + gpuUtilization (30%) + (1 - idleAgentPercent) (30%)
 */

import type { EvoLLM } from '../core/types.js';
import type { EvoStorage } from '../core/storage.js';
import type { EvoEventBus } from '../core/event-bus.js';
import type {
  RuntimeMode,
  ModeMetricsRecord,
  AggregatedMetrics,
  ComparisonReport,
} from './types.js';
import type { EvoModeController } from './mode-controller.js';

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

export class EvoModeComparator {
  private metricsHistory: ModeMetricsRecord[] = [];
  private sampleIntervalMs: number;
  private sampleTimer: ReturnType<typeof setInterval> | null = null;

  private modeController: EvoModeController;
  private storage: EvoStorage;
  private eventBus: EvoEventBus;
  private llm: EvoLLM | null;

  constructor(
    modeController: EvoModeController,
    storage: EvoStorage,
    eventBus: EvoEventBus,
    llm?: EvoLLM,
    sampleIntervalMs = 60_000,
  ) {
    this.modeController = modeController;
    this.storage = storage;
    this.eventBus = eventBus;
    this.llm = llm ?? null;
    this.sampleIntervalMs = sampleIntervalMs;
  }

  start(): void {
    this.sampleTimer = setInterval(async () => {
      const metrics = this.modeController.getCurrentMetrics();
      const record: ModeMetricsRecord = {
        ...metrics,
        timestamp: Date.now(),
      };
      this.metricsHistory.push(record);

      // Persist to storage
      await this.storage.saveRow(
        'eil_mode_metrics',
        `metrics-${record.timestamp}`,
        record as unknown as Record<string, unknown>,
      );
    }, this.sampleIntervalMs);
  }

  stop(): void {
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
  }

  // ── Comparison Report ─────────────────────────────────────────────────────

  async getComparisonReport(windowMs = 3_600_000): Promise<ComparisonReport> {
    const now = Date.now();
    const cutoff = now - windowMs;

    // Use in-memory records (covers recent data)
    const records = this.metricsHistory.filter(r => r.timestamp >= cutoff);

    const cyclicRecords = records.filter(r => r.mode === 'CYCLIC');
    const neuralRecords = records.filter(r => r.mode === 'NEURAL');

    const cyclicAgg = this.aggregate(cyclicRecords);
    const neuralAgg = this.aggregate(neuralRecords);

    const winner = this.determineWinner(cyclicAgg, neuralAgg);
    const recommendation = await this.generateRecommendation(cyclicAgg, neuralAgg);

    return {
      windowMs,
      cyclic: cyclicAgg,
      neural: neuralAgg,
      winner,
      recommendation,
    };
  }

  private aggregate(records: ModeMetricsRecord[]): AggregatedMetrics | null {
    if (records.length === 0) return null;
    return {
      avgGenerationsPerMinute: avg(records.map(r => r.generationsPerMinute)),
      avgAgentLatencyMs: avg(records.map(r => r.averageAgentLatencyMs)),
      avgFindingsPerMinute: avg(records.map(r => r.findingsPropagatedPerMinute)),
      avgGpuUtilization: avg(records.map(r => r.gpuUtilizationPercent)),
      avgIdleAgentPercent: avg(records.map(r => r.idleAgentPercent)),
      sampleCount: records.length,
    };
  }

  private determineWinner(
    cyclic: AggregatedMetrics | null,
    neural: AggregatedMetrics | null,
  ): RuntimeMode | 'INSUFFICIENT_DATA' {
    if (!cyclic || !neural) return 'INSUFFICIENT_DATA';
    const cyclicScore = this.scoreMode(cyclic);
    const neuralScore = this.scoreMode(neural);
    return cyclicScore >= neuralScore ? 'CYCLIC' : 'NEURAL';
  }

  /**
   * Weighted scoring:
   * findings/minute (40%) + GPU utilization (30%) + (1 - idleAgentPercent) (30%)
   *
   * All values are normalized to 0-1 range for scoring.
   */
  private scoreMode(agg: AggregatedMetrics): number {
    // Normalize findings/minute to 0-1 using a reasonable cap of 2000/min
    const findingsNorm = Math.min(1, agg.avgFindingsPerMinute / 2000);
    const gpuNorm = agg.avgGpuUtilization / 100;
    const activeNorm = 1 - (agg.avgIdleAgentPercent / 100);

    return findingsNorm * 0.4 + gpuNorm * 0.3 + activeNorm * 0.3;
  }

  private async generateRecommendation(
    cyclic: AggregatedMetrics | null,
    neural: AggregatedMetrics | null,
  ): Promise<string> {
    if (!cyclic && !neural) {
      return 'Insufficient data. Run the system in at least one mode to collect metrics.';
    }

    if (!cyclic) {
      return `Only NEURAL data available (${neural!.sampleCount} samples). Run CYCLIC mode to enable comparison.`;
    }

    if (!neural) {
      return `Only CYCLIC data available (${cyclic.sampleCount} samples). Switch to NEURAL mode to enable comparison.`;
    }

    // If LLM is available, generate a nuanced recommendation
    if (this.llm) {
      try {
        const prompt = JSON.stringify({
          task: 'Compare two execution modes for a 96,000-agent AI research system.',
          cyclic: cyclic,
          neural: neural,
          instruction: 'Write 2-3 concise sentences recommending which mode to use and why. Reference specific metrics.',
        });
        return await this.llm.generate(prompt);
      } catch {
        // Fall through to deterministic recommendation
      }
    }

    // Deterministic recommendation
    const cyclicScore = this.scoreMode(cyclic);
    const neuralScore = this.scoreMode(neural);
    const winner = cyclicScore >= neuralScore ? 'CYCLIC' : 'NEURAL';
    const loser = winner === 'CYCLIC' ? 'NEURAL' : 'CYCLIC';
    const winnerMetrics = winner === 'CYCLIC' ? cyclic : neural;
    const loserMetrics = winner === 'CYCLIC' ? neural : cyclic;

    const findingsDelta = ((winnerMetrics.avgFindingsPerMinute - loserMetrics.avgFindingsPerMinute) /
      Math.max(1, loserMetrics.avgFindingsPerMinute) * 100).toFixed(0);
    const latencyDelta = ((loserMetrics.avgAgentLatencyMs - winnerMetrics.avgAgentLatencyMs) /
      Math.max(1, loserMetrics.avgAgentLatencyMs) * 100).toFixed(0);

    return `${winner} mode produced ${findingsDelta}% more findings per minute with ${latencyDelta}% lower latency than ${loser}. ` +
      `GPU utilization: ${winnerMetrics.avgGpuUtilization.toFixed(1)}% vs ${loserMetrics.avgGpuUtilization.toFixed(1)}%. ` +
      `Recommend ${winner === 'NEURAL' ? 'staying in' : 'switching to'} ${winner} mode.`;
  }

  // ── Access ──────────────────────────────────────────────────────────────

  getMetricsHistory(): ModeMetricsRecord[] {
    return [...this.metricsHistory];
  }

  get sampleCount(): number {
    return this.metricsHistory.length;
  }
}
