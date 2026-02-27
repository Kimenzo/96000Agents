/**
 * Generator script to scaffold 96,000 production-ready Mastra agents.
 * 
 * Output structure:
 *   agents/
 *     batch-001.ts ... batch-960.ts  (100 agents each)
 *     index.ts                       (barrel re-exports)
 *     registry.ts                    (aggregated agent map)
 */

const fs = require('fs');
const path = require('path');

const TOTAL_AGENTS = 96000;
const BATCH_SIZE = 100;
const TOTAL_BATCHES = TOTAL_AGENTS / BATCH_SIZE; // 960
const OUTPUT_DIR = path.join(__dirname, '..', 'agents');

function padBatch(n) {
    return String(n).padStart(3, '0');
}

function camelCase(num) {
    return `agent${num}`;
}

function generateBatchFile(batchNum) {
    const startId = (batchNum - 1) * BATCH_SIZE + 1;
    const endId = batchNum * BATCH_SIZE;

    let content = `import { Agent } from '@mastra/core/agent';\n\n`;

    for (let i = startId; i <= endId; i++) {
        content += `export const ${camelCase(i)} = new Agent({
  id: 'agent-${i}',
  name: 'Agent ${i}',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});\n\n`;
    }

    return content;
}

function generateIndexFile() {
    let content = `// Auto-generated barrel file — re-exports all 96,000 agents\n\n`;
    for (let b = 1; b <= TOTAL_BATCHES; b++) {
        content += `export * from './batch-${padBatch(b)}';\n`;
    }
    return content;
}

function generateRegistryFile() {
    let content = `// Auto-generated registry — all 96,000 agents in a single map\n`;
    content += `import { Agent } from '@mastra/core/agent';\n\n`;

    // Import from each batch
    for (let b = 1; b <= TOTAL_BATCHES; b++) {
        const startId = (b - 1) * BATCH_SIZE + 1;
        const endId = b * BATCH_SIZE;
        const imports = [];
        for (let i = startId; i <= endId; i++) {
            imports.push(camelCase(i));
        }
        content += `import { ${imports.join(', ')} } from './batch-${padBatch(b)}';\n`;
    }

    content += `\nexport const agentRegistry: Record<string, Agent> = {\n`;
    for (let i = 1; i <= TOTAL_AGENTS; i++) {
        content += `  '${camelCase(i)}': ${camelCase(i)},\n`;
    }
    content += `};\n`;

    return content;
}

// --- Main ---
console.log(`\n🚀 Generating ${TOTAL_AGENTS.toLocaleString()} agents in ${TOTAL_BATCHES} batch files...\n`);

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const startTime = Date.now();

// Generate batch files
for (let b = 1; b <= TOTAL_BATCHES; b++) {
    const filename = `batch-${padBatch(b)}.ts`;
    const filepath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filepath, generateBatchFile(b), 'utf-8');

    if (b % 100 === 0 || b === TOTAL_BATCHES) {
        const agentsGenerated = b * BATCH_SIZE;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  ✅ ${agentsGenerated.toLocaleString()} agents (${b}/${TOTAL_BATCHES} batches) — ${elapsed}s`);
    }
}

// Generate index.ts
console.log(`\n📦 Generating index.ts (barrel exports)...`);
fs.writeFileSync(path.join(OUTPUT_DIR, 'index.ts'), generateIndexFile(), 'utf-8');

// Generate registry.ts
console.log(`📋 Generating registry.ts (agent map)...`);
fs.writeFileSync(path.join(OUTPUT_DIR, 'registry.ts'), generateRegistryFile(), 'utf-8');

const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n🎉 Done! ${TOTAL_AGENTS.toLocaleString()} agents generated in ${totalTime}s`);
console.log(`   📂 Output: ${OUTPUT_DIR}`);
console.log(`   📄 ${TOTAL_BATCHES} batch files + index.ts + registry.ts\n`);
