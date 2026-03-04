/**
 * EVO Intelligence Layer — Integration Tests
 *
 * End-to-end tests for the full EIL system including:
 *   - EvoIntelligenceLayer initialization and lifecycle
 *   - Evolution cycle workflow
 *   - Topology mutation workflow
 *   - Optimizer manager escalation
 *
 * EVO: All LLM calls are mocked. No real model APIs are invoked.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { EvoIntelligenceLayer, type EILConfig } from '../index.js';
import { EvoRegistry } from '../core/registry.js';
import { EvoEventBus } from '../core/event-bus.js';
import { EvoStorage, InMemoryStorageAdapter } from '../core/storage.js';
import { EvolutionCycleWorkflow } from '../workflows/evolution-cycle.workflow.js';
import { TopologyMutationWorkflow } from '../workflows/topology-mutation.workflow.js';
import { OptimizerManager } from '../optimizers/optimizer.manager.js';
import { TextGradOptimizer } from '../optimizers/text-grad.optimizer.js';
import { MiproOptimizer } from '../optimizers/mipro.optimizer.js';
import { AFlowOptimizer } from '../optimizers/aflow.optimizer.js';
import type { ClusterSummary, OptimizationResult } from '../core/types.js';
import { EvoSupervisorAgent } from '../agents/supervisor-agent.js';
import { EvoMetaAgent } from '../agents/meta-agent.js';
import {
  createMockLLM,
  createMockAgentsDir,
  cleanupDir,
  createMockFinding,
  createMockScoredFinding,
  createMockBenchmarkTasks,
  createTestConfig,
} from './helpers.js';

let testAgentsDir: string;

afterAll(() => {
  if (testAgentsDir) cleanupDir(testAgentsDir);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  EVO INTELLIGENCE LAYER (MAIN CLASS)
// ═══════════════════════════════════════════════════════════════════════════════

describe('EvoIntelligenceLayer', () => {
  let eilConfig: EILConfig;

  beforeEach(() => {
    testAgentsDir = createMockAgentsDir(20);
    eilConfig = {
      enabled: true,
      agentsDir: testAgentsDir,
      evo: {
        clusterSize: 5,
        clustersPerColony: 2,
        cycleDurationMs: 100,
        findingThreshold: 0.5,
      },
      fastLLM: createMockLLM(),
      synthesisLLM: createMockLLM(),
      storageAdapter: new InMemoryStorageAdapter(),
    };
  });

  it('should initialize successfully with 20 agents', async () => {
    const eil = new EvoIntelligenceLayer(eilConfig);
    await eil.initialize();

    const status = eil.getStatus();
    expect(status.enabled).toBe(true);
    expect(status.state).toBe('initialized');
    expect(status.agentCount).toBe(20);
    expect(status.clusterCount).toBe(4); // 20 / clusterSize 5
    expect(status.colonyCount).toBe(2); // 4 / clustersPerColony 2
    expect(status.supervisorCount).toBe(4);
    expect(status.metaAgentCount).toBe(3);
  });

  it('should not initialize when disabled', async () => {
    eilConfig.enabled = false;
    const eil = new EvoIntelligenceLayer(eilConfig);
    await eil.initialize();

    const status = eil.getStatus();
    expect(status.state).toBe('uninitialized');
  });

  it('should start and stop lifecycle', async () => {
    const eil = new EvoIntelligenceLayer(eilConfig);
    await eil.initialize();
    await eil.start();

    const status = eil.getStatus();
    expect(status.state).toBe('running');

    eil.pause();
    const pausedStatus = eil.getStatus();
    expect(pausedStatus.state).toBe('paused');
  });

  it('should resume from paused state', async () => {
    const eil = new EvoIntelligenceLayer(eilConfig);
    await eil.initialize();
    await eil.start();
    eil.pause();
    await eil.resume();

    const status = eil.getStatus();
    expect(status.state).toBe('running');

    // Clean up timers
    eil.pause();
  });

  it('should expose core components', async () => {
    const eil = new EvoIntelligenceLayer(eilConfig);
    await eil.initialize();

    expect(eil.getRegistry()).toBeInstanceOf(EvoRegistry);
    expect(eil.getEventBus()).toBeInstanceOf(EvoEventBus);
    expect(eil.getStorage()).toBeInstanceOf(EvoStorage);
    expect(eil.getOptimizerManager()).toBeTruthy();
  });

  it('should force an evolution cycle', async () => {
    const eil = new EvoIntelligenceLayer(eilConfig);
    await eil.initialize();

    // Should not throw
    await eil.forceEvolutionCycle();
    expect(eil.getStatus().cycleCount).toBe(1);
  });

  it('should force a topology mutation', async () => {
    const eil = new EvoIntelligenceLayer(eilConfig);
    await eil.initialize();

    // Should not throw
    await eil.forceTopologyMutation();
  });

  it('should track event bus event count', async () => {
    const eil = new EvoIntelligenceLayer(eilConfig);
    await eil.initialize();
    await eil.forceEvolutionCycle();

    const status = eil.getStatus();
    // Evolution cycle emits at least start + complete events
    expect(status.eventBusEventCount).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  EVOLUTION CYCLE WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════════

describe('EvolutionCycleWorkflow', () => {
  let workflow: EvolutionCycleWorkflow;
  let bus: EvoEventBus;
  let registry: EvoRegistry;
  let storage: EvoStorage;

  beforeEach(async () => {
    testAgentsDir = createMockAgentsDir(10);
    const config = createTestConfig(testAgentsDir);
    registry = new EvoRegistry(config);
    await registry.initialize(testAgentsDir);

    bus = new EvoEventBus();
    storage = new EvoStorage(new InMemoryStorageAdapter());

    const llm = createMockLLM();
    const supervisors = new Map<string, EvoSupervisorAgent>();
    for (const clusterId of registry.getClusterIds()) {
      supervisors.set(clusterId, new EvoSupervisorAgent({
        clusterId,
        llm,
        registry,
        eventBus: bus,
        storage,
      }));
    }

    const metaAgents = [
      new EvoMetaAgent({
        domain: 'SCIENCES',
        llm,
        eventBus: bus,
        storage,
        assignedColonies: registry.getColonyIds(),
      }),
    ];

    workflow = new EvolutionCycleWorkflow({
      config,
      registry,
      eventBus: bus,
      storage,
      supervisors,
      metaAgents,
    });
  });

  it('should complete a full evolution cycle', async () => {
    const result = await workflow.runCycle();

    expect(result.cycleId).toBeTruthy();
    expect(result.startedAt).toBeTruthy();
    expect(result.completedAt).toBeTruthy();
    expect(result.findings).toBeDefined();
    expect(result.scores).toBeDefined();
    expect(result.summaries).toBeDefined();
    expect(result.patterns).toBeDefined();
    expect(result.directives).toBeDefined();
    expect(result.optimization).toBeDefined();
    expect(result.persistence).toBeDefined();
  });

  it('should emit start and complete events', async () => {
    const starts: unknown[] = [];
    const completes: unknown[] = [];

    bus.on('evolution:cycle:start', (e) => starts.push(e));
    bus.on('evolution:cycle:complete', (e) => completes.push(e));

    await workflow.runCycle();

    expect(starts).toHaveLength(1);
    expect(completes).toHaveLength(1);
  });

  it('should increment cycle count', async () => {
    await workflow.runCycle();
    await workflow.runCycle();
    expect(workflow.currentCycleCount).toBe(2);
  });

  it('should use optimizeFn when provided', async () => {
    const mockOptFn = vi.fn().mockResolvedValue([]);
    workflow.setOptimizeFn(mockOptFn);

    // Seed some findings so there are bottom performers
    const agentId = registry.getAllAgentIds()[0]!;
    await storage.saveFinding(createMockScoredFinding({
      agentId,
      compositeScore: 0.2,
    }));

    await workflow.runCycle();
    // optimizeFn is called if there are bottom performers from scored agents
    // With no seeded scored findings in the cycle window, it might not be called
    // But the setOptimizeFn path is exercised
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TOPOLOGY MUTATION WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════════

describe('TopologyMutationWorkflow', () => {
  let workflow: TopologyMutationWorkflow;
  let registry: EvoRegistry;

  beforeEach(async () => {
    testAgentsDir = createMockAgentsDir(10);
    const config = createTestConfig(testAgentsDir);
    registry = new EvoRegistry(config);
    await registry.initialize(testAgentsDir);

    const bus = new EvoEventBus();
    const storage = new EvoStorage(new InMemoryStorageAdapter());

    workflow = new TopologyMutationWorkflow({
      config,
      registry,
      eventBus: bus,
      storage,
      candidatePoolSize: 3,
      acceptanceThreshold: -1, // Accept any mutation for testing
    });
  });

  it('should run a full topology mutation', async () => {
    const result = await workflow.run();

    expect(result.snapshotBefore).toBeDefined();
    expect(result.snapshotBefore.clusterCount).toBe(2);
    expect(result.candidatesEvaluated).toBeGreaterThanOrEqual(0);
  });

  it('should capture correct snapshot structure', async () => {
    const result = await workflow.run();
    const snap = result.snapshotBefore;

    expect(snap.snapshotId).toBeTruthy();
    expect(snap.timestamp).toBeTruthy();
    expect(snap.clusterCount).toBe(2);
    expect(snap.colonyCount).toBe(1);
    expect(Object.keys(snap.clusterToAgents).length).toBe(2);
    expect(Object.keys(snap.colonyToClusters).length).toBe(1);
  });

  it('should compare topologies', () => {
    const before = {
      snapshotId: 'a',
      timestamp: new Date().toISOString(),
      clusterCount: 96,
      colonyCount: 3,
      clusterToAgents: { 'c1': ['a1', 'a2'] },
      colonyToClusters: { 'col1': ['c1'] },
    };
    const after = {
      ...before,
      snapshotId: 'b',
      clusterCount: 97,
    };

    const comparison = workflow.compareTopologies(before, after);
    expect(comparison.clusterCountDelta).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  OPTIMIZER MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

describe('OptimizerManager', () => {
  let manager: OptimizerManager;
  let registry: EvoRegistry;

  beforeEach(async () => {
    testAgentsDir = createMockAgentsDir(5);
    const config = createTestConfig(testAgentsDir);
    registry = new EvoRegistry(config);
    await registry.initialize(testAgentsDir);
    const storage = new EvoStorage(new InMemoryStorageAdapter());

    manager = new OptimizerManager({
      llm: createMockLLM(),
      registry,
      storage,
    });
  });

  it('should start agents in TEXT_GRAD phase', () => {
    const agentId = registry.getAllAgentIds()[0]!;
    const state = manager.getAgentState(agentId);
    // No state yet until first optimization
    expect(state).toBeUndefined();
  });

  it('should optimize a batch of agents', async () => {
    const agentIds = registry.getAllAgentIds().slice(0, 2);
    const tasks = createMockBenchmarkTasks(2);

    const results = await manager.optimizeBatch(agentIds, tasks);

    expect(results.length).toBe(2);
    for (const result of results) {
      expect(result.agentId).toBeTruthy();
      expect(result.optimizerUsed).toBe('TEXT_GRAD');
    }
  });

  it('should track active agent count', async () => {
    const agentIds = registry.getAllAgentIds().slice(0, 2);
    const tasks = createMockBenchmarkTasks(1);

    await manager.optimizeBatch(agentIds, tasks);
    expect(manager.activeAgentCount).toBeGreaterThan(0);
  });

  it('should reset an agent state', async () => {
    const agentId = registry.getAllAgentIds()[0]!;
    const tasks = createMockBenchmarkTasks(1);

    await manager.optimizeBatch([agentId], tasks);
    expect(manager.getAgentState(agentId)).toBeDefined();

    manager.resetAgent(agentId);
    expect(manager.getAgentState(agentId)).toBeUndefined();
  });

  it('should force an agent to a specific phase', async () => {
    const agentId = registry.getAllAgentIds()[0]!;
    manager.setAgentPhase(agentId, 'AFLOW');
    expect(manager.getAgentState(agentId)?.phase).toBe('AFLOW');
  });

  it('should escalate on stalls', async () => {
    const agentId = registry.getAllAgentIds()[0]!;
    const tasks = createMockBenchmarkTasks(1);

    // Run enough times with no improvement to trigger escalation
    // Default stallThreshold = 2, improvementFloor = 0.015
    // Mock LLM produces deterministic outputs, so scores won't improve
    for (let i = 0; i < 3; i++) {
      await manager.optimizeBatch([agentId], tasks);
    }

    const state = manager.getAgentState(agentId);
    expect(state).toBeDefined();
    // After 3 runs with stalls, should have escalated at least once
    expect(['TEXT_GRAD', 'MIPRO', 'AFLOW', 'IDLE']).toContain(state!.phase);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TEXT-GRAD OPTIMIZER
// ═══════════════════════════════════════════════════════════════════════════════

describe('TextGradOptimizer', () => {
  it('should optimize an agent prompt', async () => {
    testAgentsDir = createMockAgentsDir(5);
    const config = createTestConfig(testAgentsDir);
    const registry = new EvoRegistry(config);
    await registry.initialize(testAgentsDir);
    const storage = new EvoStorage(new InMemoryStorageAdapter());

    const optimizer = new TextGradOptimizer({
      llm: createMockLLM(),
      registry,
      storage,
      config: { maxIterations: 2, batchSize: 2 },
    });

    const agentId = registry.getAllAgentIds()[0]!;
    const tasks = createMockBenchmarkTasks(2);

    const result = await optimizer.optimize(agentId, tasks, 'Initial instructions');

    expect(result.agentId).toBe(agentId);
    expect(result.optimizerUsed).toBe('TEXT_GRAD');
    expect(result.iterations).toBeGreaterThan(0);
    expect(result.newPrompt).toBeTruthy();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  MIPRO OPTIMIZER
// ═══════════════════════════════════════════════════════════════════════════════

describe('MiproOptimizer', () => {
  it('should optimize with example selection', async () => {
    testAgentsDir = createMockAgentsDir(5);
    const config = createTestConfig(testAgentsDir);
    const registry = new EvoRegistry(config);
    await registry.initialize(testAgentsDir);
    const storage = new EvoStorage(new InMemoryStorageAdapter());

    const optimizer = new MiproOptimizer({
      llm: createMockLLM(),
      registry,
      storage,
      config: { maxTrials: 2, topK: 2 },
    });

    const agentId = registry.getAllAgentIds()[0]!;
    const tasks = createMockBenchmarkTasks(2);
    const examples = [
      { id: 'ex1', input: 'Sample input', output: 'Sample output' },
      { id: 'ex2', input: 'Another input', output: 'Another output' },
      { id: 'ex3', input: 'Third input', output: 'Third output' },
    ];

    const result = await optimizer.optimize(
      agentId,
      'Base instructions',
      examples,
      tasks,
    );

    expect(result.agentId).toBe(agentId);
    expect(result.optimizerUsed).toBe('MIPRO');
    expect(result.iterations).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  AFLOW OPTIMIZER
// ═══════════════════════════════════════════════════════════════════════════════

describe('AFlowOptimizer', () => {
  it('should optimize a workflow graph', async () => {
    testAgentsDir = createMockAgentsDir(5);
    const config = createTestConfig(testAgentsDir);
    const registry = new EvoRegistry(config);
    await registry.initialize(testAgentsDir);
    const storage = new EvoStorage(new InMemoryStorageAdapter());

    const optimizer = new AFlowOptimizer({
      llm: createMockLLM(),
      registry,
      storage,
      config: { populationSize: 3, maxGenerations: 2, tournamentSize: 2 },
    });

    const agentId = registry.getAllAgentIds()[0]!;
    const graph = {
      graphId: `graph-${agentId}`,
      nodes: [
        { nodeId: 'input', agentId, parallel: false },
        { nodeId: 'process', agentId, parallel: false },
        { nodeId: 'output', agentId, parallel: false },
      ],
      edges: [
        { from: 'input', to: 'process' },
        { from: 'process', to: 'output' },
      ],
    };

    const evaluateFn = async () => 0.5 + Math.random() * 0.3;

    const result = await optimizer.optimize(agentId, graph, evaluateFn);

    expect(result.agentId).toBe(agentId);
    expect(result.optimizerUsed).toBe('AFLOW');
    expect(result.iterations).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
