# MASTRA × EVOAGENTX — Deep Architecture Integration

**Chain-of-Thought Reasoning · No Hype · Build Order**

---

## Part I — Knowing Both Systems Exactly

### 1.1 EvoAgentX: The Five-Layer Architecture (What We Are Borrowing)

EvoAgentX is not a framework for running agents. It is a framework for making agents get better over time without human intervention. That distinction is everything. Here is what each of its five layers actually does, without paraphrase.

**▸ Layer 1 — Basic Components**
The foundation. LLM configurations, tool registries, logging, serialization, and storage adapters. This layer has no intelligence — it is infrastructure. It ensures that every layer above it has reliable, consistent access to services.

**▸ Layer 2 — Agent Layer**
Each agent is a composition of three things: an LLM (responsible for reasoning and response), Action Modules (each encapsulating a specific task with a prompt template and I/O format), and Memory Components (short-term working memory + long-term persistent memory). The agent layer is where cognition lives.

**▸ Layer 3 — Workflow Layer**
Two modes: Sequential Graph (a DAG of agents with explicit ordering and conditional branches) and Custom Graph (fully flexible topology with parallel execution and loops). Workflows define how agents collaborate on a task. The workflow layer is where coordination lives.

**▸ Layer 4 — Evolving Layer (THE CORE INNOVATION)**
Three optimization algorithms run here. TextGrad treats prompts as differentiable parameters and uses LLM-generated textual feedback as a substitute for mathematical gradients — it iteratively rewrites prompts toward better performance. AFlow searches the space of possible workflow topologies, mutating and selecting the best-performing structures. MIPRO uses Bayesian optimization to select the best few-shot examples to include in prompts.

**▸ Layer 5 — Evaluation Layer**
Task-specific evaluators score agent and workflow output. These scores are the ground truth signal that the Evolving Layer uses to decide what to optimize and in what direction. Without rigorous evaluation, evolution is random. With it, evolution is directional.

### 1.2 Mastra: What It Actually Has (TypeScript Native)

**▸ Agent**
A class composition of LLM (via Vercel AI SDK routing 40+ providers), Tools (createTool with Zod schema validation), Memory (working + long-term + observational via @mastra/memory), and Instructions (system prompt). Agents can have sub-agents registered, making supervisor patterns native. The Agent.network() method enables LLM-based routing across multiple agents.

**▸ Workflow**
A graph-based state machine built with createWorkflow and createStep. Steps connect via .then(), .branch(), .parallel(). Supports suspend/resume (durable execution), human-in-the-loop (HITL), and programmatic cancellation. This is Mastra's coordination layer.

**▸ AgentNetwork**
A top-level LLM-based router that accepts a set of agents, workflows, and tools and intelligently decides which to invoke and in what order. This is Mastra's equivalent of EvoAgentX's Custom Graph mode — emergent topology based on LLM reasoning.

**▸ Memory**
Three-tier memory: working memory (in-context, managed per thread), long-term semantic memory (vector store backed, retrieved by similarity), observational memory (structured observation records per thread). The @mastra/memory package manages all three.

**▸ Scorers / Evals**
Mastra's Scorer API supports model-graded, rule-based, and statistical evaluation. Versioned Datasets and Experiments allow systematic benchmarking of agents against task sets. This is the evaluation infrastructure that EvoAgentX's Evaluation Layer mirrors.

**▸ Storage**
Pluggable storage adapters: PostgreSQL, LibSQL, MongoDB. Stores agent data, memory, workflow state, and scores. This underpins both Mastra's operational data and the EIL's evolutionary data.

**▸ MCP + Telemetry + Server**
MCP server support allows exposing agents as protocol-compliant endpoints. Built-in telemetry via OpenTelemetry tracks spans, token usage, and tool calls. Hono-based HTTP server with OpenAPI support for deployment.

---

## Part II — Where They Think Alike: The Structural Overlaps

The reason this integration is possible — and why it will not require building from scratch — is that both systems share the same foundational beliefs about how intelligent agent systems should be built. These are not surface-level similarities. They are deep architectural commitments.

| Architectural Concept | EvoAgentX (Python) | Mastra (TypeScript) |
|---|---|---|
| Agent Composition | LLM + Action Modules + Memory | LLM + Tools + Memory + Instructions |
| Workflow Model | Sequential Graph + Custom Graph (DAG) | createWorkflow + .then()/.branch()/.parallel() |
| Multi-Agent Routing | Custom Graph with LLM-based task dispatch | AgentNetwork with LLM-based routing |
| Memory Architecture | Short-term (context) + Long-term (persistent) | Working + Long-term (vector) + Observational |
| Evaluation System | Task-specific evaluators + benchmarks | Scorer API + Datasets + Experiments |
| HITL Support | HITLManager + intercept agents | workflow.suspend() + resume() |
| Tool System | Modular toolkits (code, search, browser, fs) | createTool with Zod schemas + toolsets |
| Storage | Pluggable backends | PostgreSQL, LibSQL, MongoDB adapters |
| LLM Agnosticism | LiteLLM, OpenRouter, SiliconFlow | 40+ providers via Vercel AI SDK router |

The overlap is not coincidental. Both systems are converging on the same understanding of what a production multi-agent system requires. This is exactly why porting EvoAgentX's architecture into Mastra is not a translation job — it is a grafting job. The tissue is compatible. What Mastra lacks is the Evolving Layer. That is precisely what we are adding.

---

## Part III — What EvoAgentX Has That Mastra Does Not (The Gap We Close)

### 3.1 Automated Prompt Evolution (TextGrad Pattern)

Mastra has Scorers. It can measure how well an agent performed. But it cannot act on that measurement to rewrite the agent's prompt. That gap is where TextGrad lives. The algorithm treats the prompt as a parameter — something that can be adjusted when performance is poor. It uses an LLM to generate structured feedback (the "gradient") and then uses another LLM call to apply that feedback to produce an improved prompt (the "update step"). This is iterative and convergent.

In Python, TextGrad uses PyTorch's autograd machinery to backpropagate through LLM calls. We cannot port that to TypeScript directly. What we can port is the conceptual pattern: feedback-driven prompt mutation with version control and validation gating. The implementation mechanism differs; the effect is identical.

### 3.2 Workflow Topology Search (AFlow Pattern)

Mastra's workflows are deterministic once defined. A developer writes the graph structure and it stays that way. AFlow asks a different question: what if the graph itself is a variable? What if the system can search through possible workflow topologies and select the one that performs best for a given class of task?

AFlow maintains a population of candidate workflows, uses mutation operators to generate variants, evaluates each variant on a task set, and applies evolutionary selection to converge on the best-performing topology. In our integration, this means the EIL can reorganize how clusters of agents are internally wired — who runs in parallel, who runs sequentially, which agents are supervisors — based on empirical performance data.

### 3.3 Few-Shot Example Optimization (MIPRO Pattern)

Mastra has no native mechanism for selecting which few-shot examples to include in an agent's prompt. MIPRO fills this gap. It treats the selection of few-shot examples as a combinatorial optimization problem and uses Bayesian optimization to efficiently search the example space. The result is that each agent's prompt is not just well-written — it is also empirically grounded with the examples that actually improve its performance on real tasks.

### 3.4 Auto-Workflow Generation from Goal Prompts

EvoAgentX can take a single high-level goal description and automatically construct a multi-agent workflow. Mastra requires developers to define workflows explicitly. For 96,000 agents, we do not need this capability at agent-creation time (the agents are already created), but we need it at directive-dispatch time: when a meta-agent issues a Research Directive, it must be able to automatically construct the workflow that dispatches the directive to the right agents in the right sequence. This is implemented in our EvoMetaAgent class.

---

## Part IV — Chain of Thought: How We Integrate, Step by Step

The data center analogy is exact. A data center does not add one server at a time. It builds racks, runs power, runs network, then installs compute. The sequence is not arbitrary. Each layer depends on everything beneath it.

### Step 1 — Map EvoAgentX's 5 Layers to Mastra's Primitives

Before writing a single line of code, we define the correspondence precisely. EvoAgentX's Basic Components Layer becomes the EIL Core (types, registry, event bus, storage). EvoAgentX's Agent Layer becomes EvoAgentHarness wrapping existing Mastra Agents. EvoAgentX's Workflow Layer uses Mastra's createWorkflow/createStep directly. EvoAgentX's Evolving Layer becomes three TypeScript optimizer classes. EvoAgentX's Evaluation Layer extends Mastra's Scorer API.

Every EvoAgentX concept has a Mastra landing zone. Nothing is invented from zero. Everything is extended.

### Step 2 — Build the Registry First, Always

96,000 agents cannot be managed without a central registry. The registry is not optional infrastructure — it is the prerequisite for everything else. Without it, supervisors cannot know which agents are in their cluster. Without it, meta-agents cannot issue targeted directives. Without it, the event bus has no routing table.

The registry reads all 96,000 agent files at startup, extracts their skill metadata, computes semantic similarity between skills using Mastra's vector infrastructure, and groups agents into clusters of 1,000 and colonies of 32 clusters. This grouping is not static: after each evolution cycle, the registry can reorganize cluster memberships based on performance data. The best-performing agents from different clusters may be temporarily grouped to solve specific cross-domain problems.

### Step 3 — The Event Bus is the Spinal Cord

Every layer communicates through the event bus. This is non-negotiable and architectural. If layers communicate directly with each other (supervisor calls meta-agent directly, optimizer writes to registry directly), you get tight coupling and the system becomes impossible to debug at 96,000 agent scale.

The event bus provides three things: decoupling (layers don't know each other exists, only the events), observability (every event is logged with its source, target, and payload, making the entire system's behavior auditable), and backpressure (the bus can buffer events during high-load cycles, preventing cascade failures).

### Step 4 — Wrap, Don't Replace the 96,000 Agents

The EvoAgentHarness is the most important design decision in the entire integration. It wraps each of the 96,000 existing agent files without modifying them. The original agent is still the one doing the generating. The harness adds: the evaluation function (scores the output), the publication function (routes good findings to the event bus), the directive receiver (injects research directives as additional context), and the prompt version manager (swaps in the current evolved prompt from EvoStorage).

This preserves a hard guarantee: the system can be switched off entirely (EIL disabled) and every agent continues to function as a standard Mastra agent. The integration is additive, not destructive.

### Step 5 — The Three Optimizers Must Not Compete

TextGrad, AFlow, and MIPRO address different failure modes. TextGrad fixes bad prompts. MIPRO fixes bad few-shot context. AFlow fixes bad topology. Running all three simultaneously on the same agent would produce conflicting mutations. The OptimizerManager enforces a decision tree: TextGrad runs first because it is the cheapest and most impactful. If TextGrad converges without sufficient improvement, MiPro runs. If both converge without improvement, AFlow runs at the cluster level. This is not arbitrary sequencing — it is informed by the relative frequency of each failure mode in real multi-agent systems.

### Step 6 — Evaluation Must Be the Slowest Thing

There is a temptation to run evaluation constantly and let the evolution cycle run as fast as possible. Resist it. Constant evaluation consumes enormous LLM compute, produces noisy scores, and causes agents to over-optimize toward the evaluation benchmark rather than toward actual discovery performance.

Evolution cycles should run on a deliberate cadence. Worker agents generate continuously. Supervisors aggregate on a medium cadence (every 15-30 minutes in production). Meta-agents synthesize on a slow cadence (every few hours). Optimizers run on the slowest cadence (once per day or per significant performance drop). This mirrors how biological evolution actually works: continuous variation, periodic selection.

### Step 7 — Novelty Is the Primary Signal

The EvoScorer deliberately weights novelty at 0.45 — higher than relevance (0.35) or coherence (0.20). This is deliberate and must be maintained. In a discovery system, reproducing what is already known is the worst failure mode. It wastes compute, clogs the finding pipeline, and provides no value to the meta-layer. An agent that consistently produces high-novelty output — even if not perfectly coherent — is more valuable to this system than an agent that produces perfectly coherent but redundant output.

This novelty weighting also creates evolutionary pressure toward genuine discovery. Agents whose outputs consistently score low on novelty will receive TextGrad pressure to change their approach, not just refine their phrasing.

---

## Part V — The Coding Agent Prompt

### SYSTEM ROLE

You are a world-class TypeScript architect who has deeply studied both the Mastra framework internals and the EvoAgentX research paper (arXiv:2507.03616). You are working inside a cloned Mastra repository on a local machine. Your mission is not to write a plugin or a wrapper. Your mission is to surgically graft EvoAgentX's five-layer modular architecture — its Basic Components, Agent, Workflow, Evolving, and Evaluation layers — into Mastra's TypeScript source code as a native, first-class internal system called the EVO Intelligence Layer (EIL). You are connecting a data center. Every decision must be precise, typed, testable, and non-destructive to Mastra's existing codebase.

### CONTEXT: WHAT EXISTS IN THE REPO

The cloned Mastra repository already contains:
- @mastra/core: Agent class, Workflow engine (graph-based state machine with .then()/.branch()/.parallel()), Memory system (working + long-term + observational), Tool system (createTool with Zod schemas), AgentNetwork (LLM-based routing layer), Scorer/Eval infrastructure, Storage adapters (PostgreSQL, LibSQL), Telemetry/observability, MCP server support.
- 96,000 pre-generated TypeScript agent files, each with a unique skill instruction set, located in src/agents/. These files are NOT to be modified. They are the raw material the EVO system will orchestrate, evaluate, and evolve.

### MISSION: BUILD THE EVO INTELLIGENCE LAYER (EIL)

Create a new top-level directory: src/eil/ (EVO Intelligence Layer). Everything you build lives here. It integrates into Mastra's existing primitives but adds the self-evolving intelligence that Mastra natively lacks.

---

### LAYER 1 — BASIC COMPONENTS (src/eil/core/)

Build the foundational services that the entire EIL depends on.

#### File: src/eil/core/types.ts

Define all shared TypeScript interfaces and enums for the EIL:
- `EvoAgentMeta`: { agentId, clusterId, colonyId, skillDomain, skillDepth, evaluationScore, generationCount, lastEvolvedAt, promptVersion }
- `FindingType` enum: CONTRADICTION | NOVEL_PATTERN | CONFIRMED_HYPOTHESIS | ANOMALY | CROSS_DOMAIN_RESONANCE
- `Finding`: { findingId, agentId, type: FindingType, content, confidenceScore, evidenceBase, domainTag, timestamp, propagationLevel: 'LOCAL' | 'CLUSTER' | 'COLONY' | 'GLOBAL' }
- `ResearchDirective`: { directiveId, sourceColony, targetColonies, conceptSpace, issuedAt, priority }
- `EvoConfig`: { evolutionCycle, significanceThreshold, maxPropagationDepth, clusterSize, colonyCount, optimizerType: 'PROMPT_MUTATION' | 'TOPOLOGY_SEARCH' | 'FEWSHOT_SELECTION' | 'HYBRID' }

#### File: src/eil/core/registry.ts

Build the EvoRegistry class. This is the central nerve system. It maintains:
- A `Map<string, EvoAgentMeta>` of all 96,000 registered agents indexed by agentId
- A `Map<string, string[]>` of cluster memberships (clusterId -> agentId[])
- A `Map<string, string[]>` of colony memberships (colonyId -> clusterId[])
- A skill taxonomy tree built from the agents' skill domains at startup
- Methods: `registerAgent()`, `getAgentMeta()`, `getCluster()`, `getColony()`, `findAgentsByDomain()`, `findAgentsBySkillDepth()`, `getSkillNeighbors()`
- On startup, the registry reads all 96,000 agent files, extracts their skill metadata from their exported config objects, and self-organizes them into clusters (1,000 agents each) and colonies (32 clusters each) using semantic similarity on skill domains. Use cosine similarity on skill domain embeddings via Mastra's existing vector infrastructure.

#### File: src/eil/core/event-bus.ts

Build EvoEventBus using Node.js EventEmitter extended with typed events:
- Events: `finding:local`, `finding:cluster`, `finding:colony`, `finding:global`, `directive:issued`, `directive:received`, `evolution:cycle:start`, `evolution:cycle:complete`, `topology:mutated`
- Methods: `publishFinding()`, `subscribeToFindings()`, `publishDirective()`, `subscribeToDirectives()`
- The event bus is the nervous system. Every layer talks through it, not directly to each other.

#### File: src/eil/core/storage.ts

Build EvoStorage adapter wrapping Mastra's existing storage layer:
- Tables: `evo_findings`, `evo_directives`, `evo_agent_scores`, `evo_prompt_versions`, `evo_topology_snapshots`
- Methods: `saveFinding()`, `getRecentFindings()`, `saveAgentScore()`, `getTopAgentsByColony()`, `savePromptVersion()`, `getPromptHistory()`, `saveTopologySnapshot()`

---

### LAYER 2 — AGENT LAYER (src/eil/agents/)

Build the intelligence wrappers that sit around the 96,000 base agents without modifying them.

#### File: src/eil/agents/evo-agent-harness.ts

Build EvoAgentHarness class. This wraps any existing Mastra Agent with EVO capabilities:
- Constructor takes: baseAgent (Mastra Agent), meta (EvoAgentMeta), registry, eventBus, storage
- Adds: `evaluateFinding(rawOutput) -> Finding | null` (applies the agent's significance threshold)
- Adds: `publishFinding(finding) -> void` (emits to eventBus with proper propagation level)
- Adds: `receiveDirective(directive) -> void` (injects the directive's conceptSpace into the agent's next generation call as additional context)
- Adds: `recordScore(score, taskId) -> void` (persists evaluation score, updates meta)
- Exposes: `evolvedInstructions` getter (returns current prompt version from EvoPromptManager)
- The harness wraps but does NOT replace. The base agent's `.generate()` method is still called internally.

#### File: src/eil/agents/supervisor-agent.ts

Build EvoSupervisorAgent class extending Mastra Agent with supervisor pattern:
- Each cluster of 1,000 agents has one supervisor.
- Constructor takes: clusterId, harnessedAgents (EvoAgentHarness[]), eventBus, storage
- On `finding:local` event from any agent in the cluster: classify the finding type, compute cluster-level significance, either discard or escalate to `finding:cluster`
- Method: `compressClusterFindings() -> ClusterSummary` (called on a timer cycle, aggregates all cluster findings into a structured summary for the meta layer)
- Method: `issueClusterDirective(conceptSpace) -> void` (distributes an incoming research directive to the most relevant agents in the cluster based on skill alignment)
- The supervisor uses a small, fast LLM (e.g., claude-haiku or gpt-4o-mini) for classification decisions, not a large model. Speed matters here.

#### File: src/eil/agents/meta-agent.ts

Build EvoMetaAgent class extending Mastra Agent:
- There are 3 meta agents total: one for Sciences, one for Engineering & Systems, one for Abstract & Theoretical.
- Each meta agent receives ClusterSummary objects from their associated colonies.
- Method: `synthesizeCrossColony(summaries: ClusterSummary[]) -> CrossColonyPattern[]` (pattern matches across summaries to find structural resonances using the meta agent's LLM)
- Method: `issueResearchDirective(pattern: CrossColonyPattern) -> ResearchDirective` (constructs and publishes a directive to targeted colonies)
- Method: `updateGlobalKnowledgeBase(pattern) -> void` (writes confirmed cross-domain findings to EvoStorage)
- Meta agents run on the slowest cycle (every N minutes/hours). They are not reactive — they are deliberate.

---

### LAYER 3 — WORKFLOW LAYER (src/eil/workflows/)

Build the EIL's own workflow topology system using Mastra's createWorkflow primitives.

#### File: src/eil/workflows/evolution-cycle.workflow.ts

Create the EVO Evolution Cycle workflow using Mastra's createWorkflow + createStep. Steps:
1. **Step 1 (collect-findings):** Pull all pending LOCAL findings from EvoEventBus buffer. Output: Finding[]
2. **Step 2 (score-agents):** For each finding, run the EvoEvaluator against it. Output: ScoredFinding[]
3. **Step 3 (cluster-compress):** For each cluster with new findings, call supervisor.compressClusterFindings(). Output: ClusterSummary[]
4. **Step 4 (meta-synthesize):** Pass ClusterSummaries to relevant EvoMetaAgents. Output: CrossColonyPattern[]
5. **Step 5 (directive-issue):** For each confirmed pattern, call metaAgent.issueResearchDirective(). Output: ResearchDirective[]
6. **Step 6 (optimize):** Run EvoOptimizer on the lowest-scoring agents from this cycle. Output: OptimizationResult[]
7. **Step 7 (persist):** Write all results to EvoStorage. Emit evolution:cycle:complete event.

Wire steps: Step1.then(Step2).then(Step3).then(Step4).then(Step5).parallel([Step6, Step7])

#### File: src/eil/workflows/topology-mutation.workflow.ts

Create a secondary workflow for AFlow-style topology mutation. When the evolution cycle identifies that a cluster's workflow topology is underperforming (score below threshold for 3+ cycles), this workflow:
1. **Step 1 (snapshot):** Save the current cluster topology to EvoStorage.
2. **Step 2 (mutate):** Generate N candidate topologies by permuting the cluster's agent step sequence, branching logic, and parallel execution groups.
3. **Step 3 (evaluate):** Run each candidate topology on a held-out task set and score with EvoEvaluator.
4. **Step 4 (select):** Select the highest-scoring topology. If better than current, replace.
5. **Step 5 (propagate):** If significantly better, emit topology:mutated event. The registry updates the cluster's routing config.

---

### LAYER 4 — EVOLVING LAYER (src/eil/optimizers/)

This is the most critical layer. Port EvoAgentX's three optimization algorithms as TypeScript-native LLM-feedback-based implementations. Note: TextGrad in Python uses gradient backpropagation through PyTorch. Since we're in TypeScript, we implement the conceptual equivalent using LLM-generated "textual feedback" as a proxy for gradients. The mechanism is different; the effect is the same.

#### File: src/eil/optimizers/text-grad.optimizer.ts

Build EvoTextGradOptimizer class implementing the TextGrad algorithm pattern:
- Input: current prompt (string), task performance score (number), a set of failure examples (string[])
- **Step 1 (forward pass):** Run the agent's current prompt on a set of benchmark tasks. Collect outputs and scores.
- **Step 2 (feedback generation — this is the "gradient"):** Call an LLM (separate from the agent's LLM) with this meta-prompt: "You are a prompt optimizer. The following prompt produced these outputs on these tasks with these scores. Identify specifically what is causing underperformance. Return a structured critique listing: [1] what the prompt fails to specify, [2] what the prompt over-constrains, [3] what context is missing. Be precise."
- **Step 3 (backward pass — "gradient descent"):** Take the structured critique and call the LLM again with: "Using this critique, rewrite the following prompt to fix the identified issues. Preserve the agent's core skill identity. Return only the new prompt, nothing else."
- **Step 4 (version control):** Save old prompt and new prompt to EvoStorage as a version pair with the performance delta. If the new prompt scores higher on validation tasks, commit the new version. If not, discard.
- **Step 5 (convergence check):** If prompt hasn't improved for 3 consecutive cycles, mark the agent's prompt as "stable" and stop optimizing it.
- The optimizer operates on agents whose evaluation scores fall below the colony's median score for 2+ consecutive cycles.

#### File: src/eil/optimizers/aflow.optimizer.ts

Build EvoAFlowOptimizer class implementing AFlow-style workflow topology search:
- Input: current workflow topology (WorkflowTopologySnapshot), performance history (number[])
- This optimizer manages the topology-mutation.workflow.ts above.
- It maintains a population of candidate topologies per cluster (start with 5 candidates).
- Each candidate is a different permutation of: agent step ordering, which agents run in parallel vs sequential, branching conditions, which supervisor agent does compression.
- Selection algorithm: tournament selection — pick 2 candidates at random, keep the higher-scoring one, discard the other. Generate a mutant of the winner by making one structural change.
- Mutations available: swap two agents' positions in the sequential chain, move a sequential step into a parallel block, add a branching condition based on output confidence, remove an underperforming step entirely.
- Implement this as a TypeScript class with methods: `initializePopulation()`, `selectAndMutate()`, `evaluateCandidates()`, `commitBestTopology()`.

#### File: src/eil/optimizers/mipro.optimizer.ts

Build EvoMiproOptimizer class implementing MIPRO-style few-shot prompt optimization:
- Input: current prompt (string), a pool of historical successful outputs for this agent (string[])
- MIPRO's insight: the best prompts include few-shot examples that demonstrate the desired behavior. The optimization question is: which examples from the historical pool, when included in the prompt, produce the highest performance on new tasks?
- Implementation: Use a simple Bayesian optimization loop. Maintain a score model for each candidate example set. At each iteration, pick the example set with the highest expected improvement (upper confidence bound), test it, update the score model.
- Concretely: maintain a `Map<string, number>` of example_set_hash -> average_score. Each cycle, generate a new candidate example set by: (a) sampling 3-5 examples from the pool, (b) checking if this combination has been tried (via hash), (c) if not, run it and record the score.
- After 10+ evaluations, identify the example set with the highest average score and commit it as the agent's default few-shot context.

#### File: src/eil/optimizers/optimizer.manager.ts

Build EvoOptimizerManager that coordinates all three optimizers:
- Maintains a per-agent OptimizationState tracking which optimizer is currently active and why.
- Decision logic: Use TextGrad first (prompt quality is almost always the first bottleneck). If TextGrad converges without sufficient improvement, switch to MiPro (maybe the prompt is fine but the examples are wrong). If MiPro also converges, escalate to AFlow (the topology itself may be the problem).
- Exposes: `runOptimizationCycle(agentId) -> OptimizationResult` and `runColonyOptimization(colonyId) -> OptimizationResult[]`

---

### LAYER 5 — EVALUATION LAYER (src/eil/evaluators/)

Build the EIL's evaluation infrastructure extending Mastra's Scorer API.

#### File: src/eil/evaluators/evo-scorer.ts

Build EvoScorer extending Mastra's Scorer primitives:
- Implements three scoring dimensions for each agent output:
  1. **Relevance Score (0-1):** Does the output address the assigned research directive or task? Use LLM-graded scoring.
  2. **Novelty Score (0-1):** Does the output contain information not already in the colony's knowledge base? Use vector similarity against EvoStorage's finding embeddings — lower similarity = higher novelty.
  3. **Coherence Score (0-1):** Is the output internally consistent, well-reasoned, and structured? Use rule-based checks + LLM grading.
- **Composite EvoScore = 0.35 * relevance + 0.45 * novelty + 0.20 * coherence**
- The 0.45 weight on novelty is intentional and important. You are building a discovery system. Reproducing known information should score lower than finding new information.

#### File: src/eil/evaluators/significance-filter.ts

Build SignificanceFilter class:
- Input: Finding, agent's EvoAgentMeta (specifically evaluationScore and generationCount)
- Logic: A finding is significant if its novelty score > colony_median_novelty AND relevance > 0.6 AND coherence > 0.5
- Adaptive threshold: As an agent's generationCount increases, tighten the threshold. Mature agents should only surface truly exceptional findings.
- Output: boolean + threshold values used (for auditability)

#### File: src/eil/evaluators/benchmark.runner.ts

Build EvoBenchmarkRunner:
- Maintains a set of benchmark tasks per domain (stored in EvoStorage at initialization)
- Method: `runAgentBenchmark(agentId, taskSet) -> BenchmarkResult`
- Method: `runClusterBenchmark(clusterId) -> ClusterBenchmarkResult`
- Method: `compareTopologies(topologyA, topologyB, taskSet) -> TopologyComparisonResult`
- Benchmark results feed directly into the Optimizer Manager's decision logic.

---

### INTEGRATION POINT — MASTRA ENTRY (src/eil/index.ts)

Build the main EIL entry point and integration class.

#### File: src/eil/index.ts

Build EvoIntelligenceLayer class:
- Constructor accepts: mastraInstance, eilConfig (EvoConfig), storageAdapter
- Method: `initialize() -> Promise<void>`
  - Reads all 96,000 agent files from src/agents/
  - Builds EvoRegistry (clusters + colonies)
  - Wraps each agent in an EvoAgentHarness
  - Spins up all SupervisorAgents (96 total, one per cluster)
  - Spins up the 3 MetaAgents
  - Wires all EventBus subscriptions
  - Starts the evolution cycle scheduler (configurable interval)
- Method: `start() -> Promise<void>` (begins the live evolution cycle)
- Method: `pause() -> void`
- Method: `getStatus() -> EILStatus` (current generation counts, top findings, scores, active directives)
- Method: `forceEvolutionCycle() -> Promise<void>` (manual trigger for testing)

In src/index.ts (Mastra's main entry), add optional EIL initialization:
```typescript
const eil = new EvoIntelligenceLayer(mastraInstance, eilConfig, storage);
await eil.initialize();
await eil.start();
```

---

### TESTING REQUIREMENTS

For every file you create, also create a corresponding test file in src/eil/__tests__/:
- Unit tests for all EvoRegistry methods (test with mock agent data, not all 96k agents)
- Unit tests for EvoTextGradOptimizer with mocked LLM calls
- Unit tests for SignificanceFilter with known score combinations
- Integration test: initialize EIL with 10 mock agents, run one evolution cycle, assert findings are stored and scores updated
- Do NOT write tests that depend on real LLM API calls. Use dependency injection to inject mock LLM functions.

---

### STRICT RULES FOR THIS WORK

1. Do NOT modify any file in src/agents/. These files are read-only material for the EIL.
2. Do NOT modify @mastra/core source. Extend it through composition and Mastra's official extension points (Scorer API, AgentNetwork, custom tools, Storage adapters).
3. Every interface, class, and function must be fully TypeScript typed. No "any". Use generics where appropriate.
4. Every class must use dependency injection for its external dependencies (LLM, storage, eventBus). This makes testing possible.
5. All LLM calls within the EIL must go through Mastra's model router. Do not instantiate LLM clients directly.
6. The EIL must be designed so that it can be disabled entirely by setting `enabled: false` in EvoConfig without affecting Mastra's normal operation. The 96,000 agents must remain usable as standard Mastra agents even when EIL is off.
7. Comment every non-obvious architectural decision with a `//EVO:` tag explaining why the decision was made.

---

### DELIVERABLES IN ORDER

Build in this exact order. Do not skip ahead. Each layer depends on the one before it.

1. src/eil/core/types.ts
2. src/eil/core/registry.ts
3. src/eil/core/event-bus.ts
4. src/eil/core/storage.ts
5. src/eil/agents/evo-agent-harness.ts
6. src/eil/agents/supervisor-agent.ts
7. src/eil/agents/meta-agent.ts
8. src/eil/workflows/evolution-cycle.workflow.ts
9. src/eil/workflows/topology-mutation.workflow.ts
10. src/eil/optimizers/text-grad.optimizer.ts
11. src/eil/optimizers/aflow.optimizer.ts
12. src/eil/optimizers/mipro.optimizer.ts
13. src/eil/optimizers/optimizer.manager.ts
14. src/eil/evaluators/evo-scorer.ts
15. src/eil/evaluators/significance-filter.ts
16. src/eil/evaluators/benchmark.runner.ts
17. src/eil/index.ts
18. All test files in src/eil/__tests__/
19. Update src/index.ts with optional EIL initialization
20. Update package.json with any new dependencies needed

When done, run: `npx tsc --noEmit` to verify zero type errors across the entire project.

---

**This is not a plugin. This is not a wrapper. This is a data center connection.**
