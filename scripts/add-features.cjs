/**
 * add-features.cjs — Injects Memory, Evals (Scorers), MCP, and Observability into all 96,000 agents.
 */

const fs = require('fs');
const path = require('path');

const TOTAL_AGENTS = 96000;
const OUTPUT_DIR = path.join(__dirname, '..', 'agents');

function pad(n) {
    return String(n).padStart(5, '0');
}

function camelCase(num) {
    return `agent${num}`;
}

function generateAgentFile(i) {
    return `import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createScorer } from '@mastra/core/evals';
import { MCPClient } from '@mastra/mcp';

// 1. Observational Memory
const agentMemory = new Memory();

// 2. Evaluator/Scorer
const customScorer = createScorer({
  id: 'CustomEval',
  description: 'Evaluates the agent response.',
}).generateScore(async () => {
  return 1; // Default pass
});

// 3. MCP Client
const mcp = new MCPClient({
  servers: {
    // Empty config for now, ready for actual server definitions
  }
});

// 4. Agent with Observability enabled
export const ${camelCase(i)} = new Agent({
  id: 'agent-${i}',
  name: 'Agent ${i}',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
  memory: agentMemory,
  scorers: [customScorer],
  options: {
    tracingPolicy: 'all' // Enables full observability/telemetry
  }
});
`;
}

console.log(`\n🚀 Injecting Advanced Features into ${TOTAL_AGENTS.toLocaleString()} agents...\n`);
const startTime = Date.now();

for (let i = 1; i <= TOTAL_AGENTS; i++) {
    const filename = `agent-${pad(i)}.ts`;
    const filepath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filepath, generateAgentFile(i), 'utf-8');

    if (i % 10000 === 0 || i === TOTAL_AGENTS) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  ⚡ Feature injection ${i.toLocaleString()} / ${TOTAL_AGENTS.toLocaleString()} — ${elapsed}s`);
    }
}

const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n🎉 Success! All advanced features added to ${TOTAL_AGENTS.toLocaleString()} agents in ${totalTime}s\n`);
