---
'@mastra/eil': minor
---

**Added EVO Intelligence Layer (EIL)**

New package that grafts self-evolving capabilities onto the 96,000-agent Mastra deployment, inspired by the [EvoAgentX](https://github.com/EvoAgentX/EvoAgentX) research framework. The EIL wraps existing agents without modifying any agent files, adding autonomous prompt evolution, finding propagation, topology mutation, and multi-optimizer cascading.

**Key features:**

- **EvoAgentHarness** — Non-invasive agent wrapper that adds evaluation, finding publication, directive injection, and prompt versioning
- **Supervisor agents** — One per cluster (96 total) for finding classification, compression, and directive routing
- **Meta-agents** — Three cross-colony synthesizers across Sciences, Engineering & Systems, and Abstract & Theoretical domains
- **Evolution cycle workflow** — 7-step heartbeat (collect → score → compress → synthesize → directive → optimize → persist)
- **Topology mutation workflow** — Macro-evolution via cluster splits, merges, and agent reassignment with tournament selection
- **Optimizer cascade** — TextGrad → MIPRO → AFlow escalation with automatic stall detection
- **Adaptive significance filtering** — Thresholds that tighten with agent maturity

**Usage:**

```typescript
import { EvoIntelligenceLayer } from '@mastra/eil';

const eil = new EvoIntelligenceLayer({
  enabled: true,
  agentsDir: './agents',
  fastLLM: { generate: async (prompt) => myLLM.call(prompt) },
});

await eil.initialize();
await eil.start();
```

Set `enabled: false` to disable all EIL behavior — agents operate as standard Mastra agents.
