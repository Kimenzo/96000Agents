/**
 * EVO Intelligence Layer — Test Helpers
 *
 * Shared mock factories and utilities for all EIL test suites.
 * EVO: All LLM calls are mocked — tests never make real API requests.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { EvoLLM, Finding, ScoredFinding, BenchmarkTask, EvoConfig } from '../core/types.js';
import { DEFAULT_EVO_CONFIG } from '../core/types.js';

// ─── Mock LLM ─────────────────────────────────────────────────────────────────

/**
 * Creates a mock LLM that returns deterministic responses.
 * Override `responseFn` for custom behavior.
 */
export function createMockLLM(
  responseFn?: (prompt: string, systemMessage?: string) => string,
): EvoLLM {
  const defaultFn = (prompt: string): string => {
    // Return different mock responses based on prompt content
    if (prompt.includes('Score this research finding')) {
      return 'relevance: 0.7\nnovelty: 0.8\ncoherence: 0.6';
    }
    if (prompt.includes('Score this output')) {
      return '0.75';
    }
    if (prompt.includes('meta-research synthesizer')) {
      return JSON.stringify([{
        description: 'Cross-domain pattern detected between clusters',
        confidence: 0.72,
        sourceColonies: ['colony-00'],
        suggestedDirective: 'Investigate structural resonance in test domains',
      }]);
    }
    if (prompt.includes('gradient') || prompt.includes('Analyze')) {
      return 'Improved instructions based on feedback analysis.';
    }
    return 'Mock LLM response for testing.';
  };

  return {
    generate: async (prompt: string, systemMessage?: string): Promise<string> => {
      return (responseFn ?? defaultFn)(prompt, systemMessage);
    },
  };
}

// ─── Mock Agent Files ─────────────────────────────────────────────────────────

/**
 * Creates a temporary directory with N mock agent .ts files.
 * Returns the directory path. Caller must clean up.
 */
export function createMockAgentsDir(count: number): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eil-test-agents-'));

  for (let i = 1; i <= count; i++) {
    const id = String(i).padStart(5, '0');
    const domain = i % 3 === 0 ? 'quantum physics' : i % 3 === 1 ? 'machine learning' : 'biology';
    const content = `
import { Agent } from '@mastra/core/agent';

export const agent = new Agent({
  id: 'agent-${id}',
  name: 'Test Agent ${id}',
  instructions: '${domain} research specialist',
  model: {} as any,
});
`.trim();

    fs.writeFileSync(path.join(tmpDir, `agent-${id}.ts`), content, 'utf-8');
  }

  return tmpDir;
}

/**
 * Cleans up a temporary directory.
 */
export function cleanupDir(dirPath: string): void {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup
  }
}

// ─── Mock Data Factories ──────────────────────────────────────────────────────

export function createMockFinding(overrides?: Partial<Finding>): Finding {
  return {
    findingId: `finding-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    agentId: 'agent-00001',
    type: 'NOVEL_PATTERN',
    content: 'Discovered a novel pattern in quantum decoherence rates.',
    confidenceScore: 0.85,
    evidenceBase: ['ref-1', 'ref-2'],
    domainTag: 'quantum physics',
    timestamp: new Date().toISOString(),
    propagationLevel: 'LOCAL',
    ...overrides,
  };
}

export function createMockScoredFinding(overrides?: Partial<ScoredFinding>): ScoredFinding {
  return {
    ...createMockFinding(),
    relevanceScore: 0.75,
    noveltyScore: 0.82,
    coherenceScore: 0.68,
    compositeScore: 0.77,
    ...overrides,
  };
}

export function createMockBenchmarkTasks(count = 3): BenchmarkTask[] {
  return Array.from({ length: count }, (_, i) => ({
    taskId: `task-${i + 1}`,
    input: `Benchmark task ${i + 1}: Analyze the given data.`,
    expectedOutput: `Expected analysis result ${i + 1}.`,
    evaluationCriteria: 'accuracy and depth',
    domain: 'general',
    difficulty: 0.5,
  }));
}

/**
 * Creates a small EvoConfig suitable for testing (tiny cluster sizes).
 */
export function createTestConfig(agentsDir: string, overrides?: Partial<EvoConfig>): EvoConfig {
  return {
    ...DEFAULT_EVO_CONFIG,
    agentsDir,
    clusterSize: 5,       // small clusters for testing
    clustersPerColony: 2,  // small colonies for testing
    cycleDurationMs: 100,  // fast cycles for testing
    findingThreshold: 0.5,
    ...overrides,
  };
}
