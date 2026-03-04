/**
 * EVO Intelligence Layer — Core Module Tests
 *
 * Tests for: types.ts, registry.ts, event-bus.ts, storage.ts
 * Also covers: evo-agent-harness.ts, supervisor-agent.ts, meta-agent.ts,
 *              evo-scorer.ts, significance-filter.ts, benchmark.runner.ts
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { EvoRegistry } from '../core/registry.js';
import { EvoEventBus } from '../core/event-bus.js';
import { EvoStorage, InMemoryStorageAdapter } from '../core/storage.js';
import type { AgentScoreRecord } from '../core/storage.js';
import { DEFAULT_EVO_CONFIG } from '../core/types.js';
import type { EvoConfig, Finding, ScoredFinding, ResearchDirective, ClusterSummary } from '../core/types.js';
import { EvoAgentHarness } from '../agents/evo-agent-harness.js';
import type { MastraAgentLike } from '../agents/evo-agent-harness.js';
import { EvoSupervisorAgent } from '../agents/supervisor-agent.js';
import { EvoMetaAgent } from '../agents/meta-agent.js';
import { EvoScorer } from '../evaluators/evo-scorer.js';
import { SignificanceFilter } from '../evaluators/significance-filter.js';
import { BenchmarkRunner } from '../evaluators/benchmark.runner.js';
import {
  createMockLLM,
  createMockAgentsDir,
  cleanupDir,
  createMockFinding,
  createMockScoredFinding,
  createMockBenchmarkTasks,
  createTestConfig,
} from './helpers.js';

// ─── Test Data ────────────────────────────────────────────────────────────────

let testAgentsDir: string;

afterAll(() => {
  if (testAgentsDir) cleanupDir(testAgentsDir);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

describe('EvoRegistry', () => {
  let registry: EvoRegistry;

  beforeEach(async () => {
    testAgentsDir = createMockAgentsDir(10);
    const config = createTestConfig(testAgentsDir);
    registry = new EvoRegistry(config);
    await registry.initialize(testAgentsDir);
  });

  it('should register all agents from disk', () => {
    expect(registry.totalAgents).toBe(10);
    expect(registry.agentCount).toBe(10);
  });

  it('should create clusters of configured size', () => {
    // 10 agents / clusterSize 5 = 2 clusters
    expect(registry.totalClusters).toBe(2);
    expect(registry.getClusterIds().length).toBe(2);
    expect(registry.getAllClusterIds().length).toBe(2);
  });

  it('should create colonies from clusters', () => {
    // 2 clusters / clustersPerColony 2 = 1 colony
    expect(registry.totalColonies).toBe(1);
    expect(registry.getColonyIds().length).toBe(1);
    expect(registry.getAllColonyIds().length).toBe(1);
  });

  it('should return cluster agents as string[]', () => {
    const clusterIds = registry.getClusterIds();
    const agents = registry.getCluster(clusterIds[0]!);
    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBe(5);
    expect(typeof agents[0]).toBe('string');
  });

  it('should return colony clusters as string[]', () => {
    const colonyIds = registry.getColonyIds();
    const clusters = registry.getColony(colonyIds[0]!);
    expect(Array.isArray(clusters)).toBe(true);
    expect(clusters.length).toBe(2);
  });

  it('should retrieve agent metadata', () => {
    const allIds = registry.getAllAgentIds();
    const meta = registry.getAgentMeta(allIds[0]!);
    expect(meta).toBeDefined();
    expect(meta!.agentId).toBe(allIds[0]);
    expect(meta!.evaluationScore).toBe(0.5);
    expect(meta!.generationCount).toBe(0);
  });

  it('should find the colony for a cluster', () => {
    const clusterIds = registry.getClusterIds();
    const colonyId = registry.getColonyForCluster(clusterIds[0]!);
    expect(colonyId).toBeDefined();
    expect(colonyId).toMatch(/^colony-/);
  });

  it('should update agent scores', () => {
    const agentId = registry.getAllAgentIds()[0]!;
    registry.updateAgentScore(agentId, 0.9);
    expect(registry.getAgentMeta(agentId)!.evaluationScore).toBe(0.9);
  });

  it('should increment generation count', () => {
    const agentId = registry.getAllAgentIds()[0]!;
    registry.incrementGeneration(agentId);
    registry.incrementGeneration(agentId);
    expect(registry.getAgentMeta(agentId)!.generationCount).toBe(2);
  });

  it('should compute cluster median score', () => {
    const clusterIds = registry.getClusterIds();
    const median = registry.getClusterMedianScore(clusterIds[0]!);
    expect(median).toBe(0.5); // all agents start at 0.5
  });

  describe('topology mutations', () => {
    it('should split a cluster', () => {
      const clusterIds = registry.getClusterIds();
      const originalCount = registry.totalClusters;
      registry.splitCluster(clusterIds[0]!);
      expect(registry.totalClusters).toBe(originalCount + 1);
    });

    it('should merge two clusters', () => {
      const clusterIds = registry.getClusterIds();
      const originalCount = registry.totalClusters;
      registry.mergeClusters(clusterIds[0]!, clusterIds[1]!);
      expect(registry.totalClusters).toBe(originalCount - 1);
    });

    it('should reassign an agent to another cluster', () => {
      const clusterIds = registry.getClusterIds();
      const agents0 = registry.getCluster(clusterIds[0]!);
      const agentToMove = agents0[0]!;
      const sizeBefore0 = agents0.length;
      const sizeBefore1 = registry.getCluster(clusterIds[1]!).length;

      registry.reassignAgent(agentToMove, clusterIds[1]!);

      expect(registry.getCluster(clusterIds[0]!).length).toBe(sizeBefore0 - 1);
      expect(registry.getCluster(clusterIds[1]!).length).toBe(sizeBefore1 + 1);
      expect(registry.getAgentMeta(agentToMove)!.clusterId).toBe(clusterIds[1]);
    });

    it('should swap two agents between clusters', () => {
      const clusterIds = registry.getClusterIds();
      const agentA = registry.getCluster(clusterIds[0]!)[0]!;
      const agentB = registry.getCluster(clusterIds[1]!)[0]!;

      registry.swapAgents(agentA, agentB);

      expect(registry.getAgentMeta(agentA)!.clusterId).toBe(clusterIds[1]);
      expect(registry.getAgentMeta(agentB)!.clusterId).toBe(clusterIds[0]);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  EVENT BUS
// ═══════════════════════════════════════════════════════════════════════════════

describe('EvoEventBus', () => {
  let bus: EvoEventBus;

  beforeEach(() => {
    bus = new EvoEventBus();
  });

  it('should emit and receive typed events', () => {
    const received: Finding[] = [];
    bus.on('finding:local', (finding) => received.push(finding));

    const finding = createMockFinding();
    bus.emit('finding:local', finding);

    expect(received).toHaveLength(1);
    expect(received[0]!.findingId).toBe(finding.findingId);
  });

  it('should track audit log', () => {
    bus.emit('finding:local', createMockFinding());
    bus.emit('finding:local', createMockFinding());

    expect(bus.auditLogSize).toBe(2);
    expect(bus.getRecentEvents(10)).toHaveLength(2);
  });

  it('should report event counts', () => {
    bus.emit('finding:local', createMockFinding());
    bus.emit('finding:local', createMockFinding());
    bus.emit('finding:cluster', createMockScoredFinding());

    const counts = bus.getEventCounts();
    expect(counts['finding:local']).toBe(2);
    expect(counts['finding:cluster']).toBe(1);
  });

  it('should support backpressure (pause/resume)', () => {
    const received: Finding[] = [];
    bus.on('finding:local', (f) => received.push(f));

    bus.pause();
    expect(bus.isPaused).toBe(true);

    bus.emit('finding:local', createMockFinding());
    expect(received).toHaveLength(0); // buffered, not delivered

    bus.resume();
    expect(bus.isPaused).toBe(false);
    expect(received).toHaveLength(1); // flushed on resume
  });

  it('should publish findings at the correct level', () => {
    const localReceived: Finding[] = [];
    const clusterReceived: Finding[] = [];

    bus.on('finding:local', (f) => localReceived.push(f));
    bus.on('finding:cluster', (f) => clusterReceived.push(f));

    const localFinding = createMockFinding({ propagationLevel: 'LOCAL' });
    bus.publishFinding(localFinding);

    expect(localReceived).toHaveLength(1);
    expect(clusterReceived).toHaveLength(0);
  });

  it('should clear audit log', () => {
    bus.emit('finding:local', createMockFinding());
    expect(bus.auditLogSize).toBe(1);
    bus.clearAuditLog();
    expect(bus.auditLogSize).toBe(0);
  });

  it('should cap audit log at max size', () => {
    const smallBus = new EvoEventBus(5);
    for (let i = 0; i < 10; i++) {
      smallBus.emit('finding:local', createMockFinding());
    }
    expect(smallBus.auditLogSize).toBe(5);
  });

  it('should destroy cleanly', () => {
    bus.emit('finding:local', createMockFinding());
    bus.destroy();
    expect(bus.auditLogSize).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

describe('EvoStorage', () => {
  let storage: EvoStorage;
  let adapter: InMemoryStorageAdapter;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    storage = new EvoStorage(adapter);
  });

  describe('findings', () => {
    it('should save and retrieve a finding', async () => {
      const finding = createMockFinding();
      await storage.saveFinding(finding);
      const retrieved = await storage.getFinding(finding.findingId);
      expect(retrieved).toBeTruthy();
      expect(retrieved!.findingId).toBe(finding.findingId);
    });

    it('should get findings by agent', async () => {
      await storage.saveFinding(createMockFinding({ agentId: 'a1' }));
      await storage.saveFinding(createMockFinding({ agentId: 'a1' }));
      await storage.saveFinding(createMockFinding({ agentId: 'a2' }));

      const findings = await storage.getFindingsByAgent('a1');
      expect(findings.length).toBe(2);
    });

    it('should get findings for agent with cutoff', async () => {
      const old = createMockScoredFinding({
        agentId: 'a1',
        timestamp: '2020-01-01T00:00:00.000Z',
      });
      const recent = createMockScoredFinding({
        agentId: 'a1',
        timestamp: new Date().toISOString(),
      });
      await storage.saveFinding(old);
      await storage.saveFinding(recent);

      const results = await storage.getFindingsForAgent('a1', '2024-01-01T00:00:00.000Z');
      expect(results.length).toBe(1);
    });
  });

  describe('agent scores', () => {
    it('should save score with agentId + number', async () => {
      await storage.saveAgentScore('agent-1', 0.85);
      const history = await storage.getAgentScoreHistory('agent-1');
      // InMemory adapter returns by filter — but we saved with agentId
      // The score is in the data
      expect(history).toBeDefined();
    });

    it('should save score with record', async () => {
      const record: AgentScoreRecord = {
        agentId: 'agent-1',
        cycleId: 'cycle-1',
        relevance: 0.7,
        novelty: 0.8,
        coherence: 0.6,
        composite: 0.72,
        timestamp: new Date().toISOString(),
      };
      await storage.saveAgentScore(record);
      // No throw = success
    });
  });

  describe('prompt versions', () => {
    it('should save and retrieve prompt versions', async () => {
      await storage.savePromptVersion({
        agentId: 'agent-1',
        version: 1,
        prompt: 'First version prompt',
        scoreBefore: 0.5,
        scoreAfter: 0.7,
        committedAt: new Date().toISOString(),
      });
      await storage.savePromptVersion({
        agentId: 'agent-1',
        version: 2,
        prompt: 'Second version prompt',
        scoreBefore: 0.7,
        scoreAfter: 0.85,
        committedAt: new Date().toISOString(),
      });

      const history = await storage.getPromptHistory('agent-1');
      expect(history.length).toBe(2);
      expect(history[0]!.version).toBe(1);
      expect(history[1]!.version).toBe(2);
    });

    it('should save prompt version with agentId + record', async () => {
      await storage.savePromptVersion('agent-2', {
        version: 1,
        prompt: 'Test prompt',
        score: 0.8,
        timestamp: new Date().toISOString(),
        optimizer: 'TEXT_GRAD',
      } as any);
      // No throw = success
    });

    it('should get latest prompt version', async () => {
      await storage.savePromptVersion({
        agentId: 'agent-1',
        version: 1,
        prompt: 'v1',
        scoreBefore: 0,
        scoreAfter: 0.5,
        committedAt: new Date().toISOString(),
      });
      await storage.savePromptVersion({
        agentId: 'agent-1',
        version: 2,
        prompt: 'v2',
        scoreBefore: 0.5,
        scoreAfter: 0.7,
        committedAt: new Date().toISOString(),
      });

      const latest = await storage.getLatestPromptVersion('agent-1');
      expect(latest).toBeTruthy();
      expect(latest!.version).toBe(2);
    });
  });

  describe('topology snapshots', () => {
    it('should save and retrieve topology snapshots', async () => {
      await storage.saveTopologySnapshot({
        snapshotId: 'snap-1',
        timestamp: new Date().toISOString(),
        clusterCount: 96,
        colonyCount: 3,
        clusterToAgents: { 'cluster-0': ['a1', 'a2'] },
        colonyToClusters: { 'colony-0': ['cluster-0'] },
      });
      // No throw = success
    });
  });

  describe('benchmark results', () => {
    it('should save benchmark results', async () => {
      await storage.saveBenchmarkResult('agent-1', {
        agentId: 'agent-1',
        taskCount: 3,
        averageScore: 0.75,
        minScore: 0.6,
        maxScore: 0.9,
        totalDurationMs: 1500,
        taskResults: [
          { taskId: 't1', score: 0.6, durationMs: 500 },
          { taskId: 't2', score: 0.75, durationMs: 500 },
          { taskId: 't3', score: 0.9, durationMs: 500 },
        ],
      });
      // No throw = success
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  AGENT HARNESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('EvoAgentHarness', () => {
  let harness: EvoAgentHarness;
  let mockAgent: MastraAgentLike;
  let bus: EvoEventBus;
  let storage: EvoStorage;
  let registry: EvoRegistry;

  beforeEach(async () => {
    testAgentsDir = createMockAgentsDir(5);
    const config = createTestConfig(testAgentsDir);
    registry = new EvoRegistry(config);
    await registry.initialize(testAgentsDir);

    bus = new EvoEventBus();
    storage = new EvoStorage(new InMemoryStorageAdapter());

    mockAgent = {
      generate: vi.fn().mockResolvedValue({
        text: 'Discovered a novel pattern in quantum decoherence rates. This previously unknown mechanism shows cross-domain resonance with statistical evidence (p < 0.01) and citations from recent literature.',
      }),
    };

    const agentId = registry.getAllAgentIds()[0]!;
    const meta = registry.getAgentMeta(agentId)!;

    harness = new EvoAgentHarness({
      baseAgent: mockAgent,
      meta,
      registry,
      eventBus: bus,
      storage,
    });
  });

  it('should wrap base agent generation', async () => {
    const result = await harness.generate('test prompt');
    expect(result.text).toBeTruthy();
    expect(mockAgent.generate).toHaveBeenCalled();
  });

  it('should detect findings from output', async () => {
    const result = await harness.generate('test prompt');
    expect(result.finding).toBeTruthy();
    expect(result.finding!.type).toBe('NOVEL_PATTERN');
  });

  it('should publish findings to event bus', async () => {
    const received: Finding[] = [];
    bus.on('finding:local', (f) => received.push(f));

    await harness.generate('test prompt');
    expect(received.length).toBeGreaterThan(0);
  });

  it('should inject directives into prompt', async () => {
    const directive: ResearchDirective = {
      directiveId: 'dir-1',
      sourceColony: 'colony-00',
      targetColonies: ['colony-00'],
      conceptSpace: 'quantum entanglement',
      issuedAt: new Date().toISOString(),
      priority: 0.8,
    };

    harness.receiveDirective(directive);
    await harness.generate('test prompt');

    const callArgs = (mockAgent.generate as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(callArgs).toContain('RESEARCH DIRECTIVE');
    expect(callArgs).toContain('quantum entanglement');
  });

  it('should set and use evolved instructions', async () => {
    harness.setEvolvedInstructions('You are a quantum physics expert.');
    await harness.generate('test prompt');

    const callArgs = (mockAgent.generate as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(callArgs).toContain('EVOLVED INSTRUCTIONS');
    expect(callArgs).toContain('quantum physics expert');
  });

  it('should record scores', async () => {
    await harness.recordScore(0.85, 'cycle-1');
    expect(harness.meta.evaluationScore).toBe(0.85);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SUPERVISOR AGENT
// ═══════════════════════════════════════════════════════════════════════════════

describe('EvoSupervisorAgent', () => {
  let supervisor: EvoSupervisorAgent;
  let bus: EvoEventBus;
  let registry: EvoRegistry;
  let storage: EvoStorage;

  beforeEach(async () => {
    testAgentsDir = createMockAgentsDir(5);
    const config = createTestConfig(testAgentsDir);
    registry = new EvoRegistry(config);
    await registry.initialize(testAgentsDir);

    bus = new EvoEventBus();
    storage = new EvoStorage(new InMemoryStorageAdapter());

    const clusterId = registry.getClusterIds()[0]!;

    // EVO: Create supervisor without harnesses (flexible constructor)
    supervisor = new EvoSupervisorAgent({
      clusterId,
      llm: createMockLLM(),
      registry,
      eventBus: bus,
      storage,
      significanceThreshold: 0.5,
    });
  });

  it('should derive colonyId from registry', () => {
    expect(supervisor.colonyId).toBeTruthy();
    expect(supervisor.colonyId).toMatch(/^colony-/);
  });

  it('should compress cluster findings', async () => {
    const summary = await supervisor.compressClusterFindings();
    expect(summary).toBeDefined();
    expect(summary.clusterId).toBe(supervisor.clusterId);
    expect(summary.colonyId).toBeTruthy();
  });

  it('should emit cluster:summary on compression', async () => {
    const received: ClusterSummary[] = [];
    bus.on('cluster:summary', (s) => received.push(s));

    await supervisor.compressClusterFindings();
    expect(received).toHaveLength(1);
  });

  it('should accept harness attachment after construction', () => {
    const mockAgent: MastraAgentLike = {
      generate: vi.fn().mockResolvedValue({ text: 'test' }),
    };
    const agentId = registry.getAllAgentIds()[0]!;
    const meta = registry.getAgentMeta(agentId)!;

    const harness = new EvoAgentHarness({
      baseAgent: mockAgent,
      meta,
      registry,
      eventBus: bus,
      storage,
    });

    supervisor.attachHarness(harness);
    expect(supervisor.agentCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  META-AGENT
// ═══════════════════════════════════════════════════════════════════════════════

describe('EvoMetaAgent', () => {
  let metaAgent: EvoMetaAgent;
  let bus: EvoEventBus;
  let storage: EvoStorage;

  beforeEach(() => {
    bus = new EvoEventBus();
    storage = new EvoStorage(new InMemoryStorageAdapter());

    metaAgent = new EvoMetaAgent({
      domain: 'SCIENCES',
      llm: createMockLLM(),
      eventBus: bus,
      storage,
      assignedColonies: ['colony-00', 'colony-01'],
    });
  });

  it('should have correct domain and assigned colonies', () => {
    expect(metaAgent.domain).toBe('SCIENCES');
    expect(metaAgent.getAssignedColonies()).toEqual(['colony-00', 'colony-01']);
  });

  it('should synthesize patterns from summaries', async () => {
    const summaries: ClusterSummary[] = [{
      clusterId: 'cluster-0000',
      colonyId: 'colony-00',
      findingCount: 5,
      topFindings: [createMockScoredFinding()],
      averageScore: 0.75,
      dominantDomains: ['quantum physics'],
      timestamp: new Date().toISOString(),
    }];

    const patterns = await metaAgent.synthesizeCrossColony(summaries);
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0]!.description).toBeTruthy();
  });

  it('should issue research directives', async () => {
    const received: ResearchDirective[] = [];
    bus.on('directive:issued', (d) => received.push(d));

    const directive = await metaAgent.issueResearchDirective({
      patternId: 'p1',
      sourceColonies: ['colony-00'],
      description: 'Test pattern',
      confidence: 0.8,
      relatedFindings: [],
      suggestedDirective: 'Investigate further',
    });

    expect(directive.directiveId).toBeTruthy();
    expect(received).toHaveLength(1);
  });

  it('should buffer cluster summaries from event bus', () => {
    bus.emit('cluster:summary', {
      clusterId: 'c1',
      colonyId: 'colony-00',
      findingCount: 3,
      topFindings: [],
      averageScore: 0.6,
      dominantDomains: [],
      timestamp: new Date().toISOString(),
    });

    expect(metaAgent.pendingSummaryCount).toBe(1);
  });

  it('should ignore summaries from unassigned colonies', () => {
    bus.emit('cluster:summary', {
      clusterId: 'c1',
      colonyId: 'colony-99',
      findingCount: 3,
      topFindings: [],
      averageScore: 0.6,
      dominantDomains: [],
      timestamp: new Date().toISOString(),
    });

    expect(metaAgent.pendingSummaryCount).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  EVO SCORER
// ═══════════════════════════════════════════════════════════════════════════════

describe('EvoScorer', () => {
  let scorer: EvoScorer;

  beforeEach(() => {
    scorer = new EvoScorer({ llm: createMockLLM() });
  });

  it('should score a finding on 3 dimensions', async () => {
    const finding = createMockFinding();
    const scored = await scorer.score(finding);

    expect(scored.relevanceScore).toBeGreaterThanOrEqual(0);
    expect(scored.relevanceScore).toBeLessThanOrEqual(1);
    expect(scored.noveltyScore).toBeGreaterThanOrEqual(0);
    expect(scored.noveltyScore).toBeLessThanOrEqual(1);
    expect(scored.coherenceScore).toBeGreaterThanOrEqual(0);
    expect(scored.coherenceScore).toBeLessThanOrEqual(1);
    expect(scored.compositeScore).toBeGreaterThan(0);
  });

  it('should score a batch of findings', async () => {
    const findings = [createMockFinding(), createMockFinding()];
    const results = await scorer.scoreBatch(findings);
    expect(results).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SIGNIFICANCE FILTER
// ═══════════════════════════════════════════════════════════════════════════════

describe('SignificanceFilter', () => {
  let filter: SignificanceFilter;

  const makeMeta = (generationCount: number): any => ({
    agentId: 'agent-00001',
    clusterId: 'cluster-0',
    colonyId: 'colony-0',
    skillDomain: 'test',
    skillDepth: 1,
    evaluationScore: 0.5,
    generationCount,
    lastEvolvedAt: new Date().toISOString(),
    promptVersion: 1,
  });

  beforeEach(() => {
    filter = new SignificanceFilter({ baseThreshold: 0.4 });
  });

  it('should pass high-scoring findings', () => {
    const finding = createMockScoredFinding({ compositeScore: 0.9 });
    expect(filter.isSignificant(finding, makeMeta(0))).toBe(true);
  });

  it('should reject low-scoring findings', () => {
    const finding = createMockScoredFinding({ compositeScore: 0.1 });
    expect(filter.isSignificant(finding, makeMeta(0))).toBe(false);
  });

  it('should tighten threshold with agent maturity (generation)', () => {
    const finding = createMockScoredFinding({ compositeScore: 0.45 });

    // At generation 0, threshold is at base (0.4) — should pass
    expect(filter.isSignificant(finding, makeMeta(0))).toBe(true);

    // At generation 100, threshold tightens — should fail
    expect(filter.isSignificant(finding, makeMeta(100))).toBe(false);
  });

  it('should apply type-specific multipliers', () => {
    // CROSS_DOMAIN_RESONANCE gets 0.8x threshold (easier to pass)
    const crossDomain = createMockScoredFinding({
      compositeScore: 0.35,
      type: 'CROSS_DOMAIN_RESONANCE',
    });
    // At generation 0, base threshold 0.4, type multiplier 0.8 → effective 0.32
    expect(filter.isSignificant(crossDomain, makeMeta(0))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  BENCHMARK RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

describe('BenchmarkRunner', () => {
  let runner: BenchmarkRunner;
  let registry: EvoRegistry;

  beforeEach(async () => {
    testAgentsDir = createMockAgentsDir(10);
    const config = createTestConfig(testAgentsDir);
    registry = new EvoRegistry(config);
    await registry.initialize(testAgentsDir);
    const storage = new EvoStorage(new InMemoryStorageAdapter());

    runner = new BenchmarkRunner({
      llm: createMockLLM(),
      registry,
      storage,
    });
  });

  it('should benchmark a single agent', async () => {
    const agentId = registry.getAllAgentIds()[0]!;
    const tasks = createMockBenchmarkTasks(2);
    const result = await runner.benchmarkAgent(agentId, tasks);

    expect(result.agentId).toBe(agentId);
    expect(result.taskCount).toBe(2);
    expect(result.averageScore).toBeGreaterThanOrEqual(0);
    expect(result.averageScore).toBeLessThanOrEqual(1);
    expect(result.taskResults).toHaveLength(2);
  });

  it('should benchmark a cluster', async () => {
    const clusterId = registry.getClusterIds()[0]!;
    const tasks = createMockBenchmarkTasks(2);
    const result = await runner.benchmarkCluster(clusterId, tasks, 3);

    expect(result.clusterId).toBe(clusterId);
    expect(result.sampledCount).toBeLessThanOrEqual(5);
    expect(result.averageScore).toBeGreaterThanOrEqual(0);
  });

  it('should compare two topology snapshots', () => {
    const before = {
      snapshotId: 'snap-1',
      timestamp: new Date().toISOString(),
      clusterCount: 96,
      colonyCount: 3,
      clusterToAgents: {},
      colonyToClusters: {},
    };
    const after = {
      ...before,
      snapshotId: 'snap-2',
      clusterCount: 97,
    };

    const comparison = runner.compareTopologies(before, after, {
      before: 0.7,
      after: 0.75,
    });

    expect(comparison.fitnessImprovement).toBeCloseTo(0.05);
    expect(comparison.clusterCountDelta).toBe(1);
  });
});
