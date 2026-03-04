# EVO Intelligence Layer (EIL)

The EVO Intelligence Layer grafts self-evolving capabilities from the [EvoAgentX](https://github.com/EvoAgentX/EvoAgentX) research framework onto the existing 96,000-agent Mastra deployment. It adds autonomous prompt evolution, finding propagation, topology mutation, and multi-optimizer cascading — all without modifying a single existing agent file.

## Architecture

The EIL is organized in 5 layers:

```
┌───────────────────────────────────────────────────────┐
│  Layer 5: Evaluators                                  │
│  EvoScorer · SignificanceFilter · BenchmarkRunner     │
├───────────────────────────────────────────────────────┤
│  Layer 4: Optimizers                                  │
│  TextGrad · MIPRO · AFlow · OptimizerManager          │
├───────────────────────────────────────────────────────┤
│  Layer 3: Workflows                                   │
│  EvolutionCycle · TopologyMutation                    │
├───────────────────────────────────────────────────────┤
│  Layer 2: Agents                                      │
│  EvoAgentHarness · EvoSupervisor · EvoMetaAgent       │
├───────────────────────────────────────────────────────┤
│  Layer 1: Core                                        │
│  Types · Registry · EventBus · Storage                │
└───────────────────────────────────────────────────────┘
```

### Layer 1: Core

- **Types** (`core/types.ts`) — All shared interfaces, enums, and config defaults
- **Registry** (`core/registry.ts`) — Central metadata store for 96k agents, clustered into ~96 clusters of 1,000 and grouped into 3 colonies of ~32 clusters each
- **EventBus** (`core/event-bus.ts`) — Typed pub/sub with backpressure and audit logging
- **Storage** (`core/storage.ts`) — Persistence layer wrapping Mastra's storage adapters

### Layer 2: Agents

- **EvoAgentHarness** (`agents/evo-agent-harness.ts`) — Wraps existing agents without modification. Adds evaluation, finding publication, directive injection, and prompt versioning
- **EvoSupervisorAgent** (`agents/supervisor-agent.ts`) — One per cluster (96 total). Classifies findings, compresses summaries, routes directives
- **EvoMetaAgent** (`agents/meta-agent.ts`) — Three total, one per domain (Sciences, Engineering & Systems, Abstract & Theoretical). Synthesizes cross-colony patterns

### Layer 3: Workflows

- **EvolutionCycleWorkflow** (`workflows/evolution-cycle.workflow.ts`) — 7-step heartbeat running every 30 min: collect → score → compress → synthesize → directive → optimize → persist
- **TopologyMutationWorkflow** (`workflows/topology-mutation.workflow.ts`) — Macro-evolution: explores cluster splits, merges, agent reassignment via tournament selection

### Layer 4: Optimizers

- **TextGradOptimizer** (`optimizers/text-grad.optimizer.ts`) — LLM feedback as gradient proxy for prompt refinement
- **MiproOptimizer** (`optimizers/mipro.optimizer.ts`) — Bayesian few-shot example selection with Thompson sampling
- **AFlowOptimizer** (`optimizers/aflow.optimizer.ts`) — Workflow topology search with evolutionary mutations
- **OptimizerManager** (`optimizers/optimizer.manager.ts`) — Cascading escalation: TextGrad → MIPRO → AFlow → IDLE

### Layer 5: Evaluators

- **EvoScorer** (`evaluators/evo-scorer.ts`) — 3-dimension scoring (relevance 0.35, novelty 0.45, coherence 0.20) with novelty dedup cache
- **SignificanceFilter** (`evaluators/significance-filter.ts`) — Adaptive thresholds that tighten with agent maturity
- **BenchmarkRunner** (`evaluators/benchmark.runner.ts`) — Agent, cluster, and topology benchmarking

## Quick Start

```typescript
import { EvoIntelligenceLayer } from './eil/index.js';

const eil = new EvoIntelligenceLayer({
  enabled: true,
  agentsDir: './agents',
  fastLLM: { generate: async (prompt) => myLLM.call(prompt) },
  synthesisLLM: { generate: async (prompt) => myHeavyLLM.call(prompt) },
  evo: {
    clusterSize: 1000,
    clustersPerColony: 32,
    cycleDurationMs: 30 * 60 * 1000,
  },
});

await eil.initialize();
await eil.start();

// Monitor status
const status = eil.getStatus();
console.log(`Agents: ${status.agentCount}, Clusters: ${status.clusterCount}`);

// Force an evolution cycle manually
await eil.forceEvolutionCycle();

// Pause everything
eil.pause();
```

## Configuration

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `true` | Master switch. Set `false` to disable all EIL behavior |
| `cycleDurationMs` | `1,800,000` (30 min) | Interval between evolution cycles |
| `findingThreshold` | `0.55` | Minimum composite score for finding propagation |
| `clusterSize` | `1,000` | Agents per cluster |
| `clustersPerColony` | `32` | Clusters per colony |
| `maxPropagationDepth` | `4` | Max hops for finding propagation |
| `optimizerType` | `HYBRID` | Default optimizer strategy |

## Key Design Decisions

1. **Zero agent modification** — The EIL wraps agents via `EvoAgentHarness` without touching `agents/*.ts` files
2. **Full dependency injection** — Every component receives its dependencies via constructor, enabling easy testing and swapping
3. **Disable-safe** — Set `enabled: false` and all 96k agents operate as standard Mastra agents
4. **LLM abstraction** — All LLM calls go through the `EvoLLM` interface, never directly to a provider
5. **Typed event bus** — All inter-layer communication flows through typed events, never direct method calls

## Testing

```bash
cd eil
npx vitest run
```

Tests use mocked LLM calls and temporary agent directories — no real APIs are invoked.

## File Structure

```
eil/
├── core/
│   ├── types.ts          # Shared types and interfaces
│   ├── registry.ts       # Agent metadata, clustering, topology
│   ├── event-bus.ts       # Typed event pub/sub with backpressure
│   └── storage.ts        # Persistence layer
├── agents/
│   ├── evo-agent-harness.ts   # Non-invasive agent wrapper
│   ├── supervisor-agent.ts    # Per-cluster supervisor
│   └── meta-agent.ts          # Cross-colony synthesis
├── workflows/
│   ├── evolution-cycle.workflow.ts   # 7-step evolution heartbeat
│   └── topology-mutation.workflow.ts # Macro-evolution topology search
├── optimizers/
│   ├── text-grad.optimizer.ts   # Prompt gradient descent
│   ├── mipro.optimizer.ts       # Bayesian example selection
│   ├── aflow.optimizer.ts       # Workflow structure evolution
│   └── optimizer.manager.ts     # Cascading strategy coordinator
├── evaluators/
│   ├── evo-scorer.ts            # 3-dimension finding scorer
│   ├── significance-filter.ts   # Adaptive threshold filter
│   └── benchmark.runner.ts      # Agent/cluster benchmarking
├── __tests__/
│   ├── helpers.ts               # Mock factories and utilities
│   ├── core.test.ts             # Core + agents + evaluators tests
│   └── eil-integration.test.ts  # Full integration tests
├── index.ts              # Main EvoIntelligenceLayer class + barrel exports
├── package.json
├── tsconfig.json
└── vitest.config.ts
```
