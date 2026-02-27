/**
 * Unbatch script — expands 96,000 agents into individual TypeScript files.
 * 
 * Output:
 *   agents/agent-00001.ts ... agents/agent-96000.ts  (one agent per file)
 *   agents/index.ts  (barrel re-exports all 96,000 files)
 *   agents/registry.ts  (aggregated agent map)
 * 
 * Also removes the old batch-*.ts files after generation.
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

export const ${camelCase(i)} = new Agent({
  id: 'agent-${i}',
  name: 'Agent ${i}',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
`;
}

function generateIndexFile() {
    let content = `// Auto-generated barrel file — re-exports all 96,000 agents\n\n`;
    for (let i = 1; i <= TOTAL_AGENTS; i++) {
        content += `export { ${camelCase(i)} } from './agent-${pad(i)}';\n`;
    }
    return content;
}

function generateRegistryFile() {
    let content = `// Auto-generated registry — all 96,000 agents in a single map\n`;
    content += `import type { Agent } from '@mastra/core/agent';\n\n`;

    // Use dynamic imports via a loader function for efficiency
    content += `// Import all agents\n`;
    for (let i = 1; i <= TOTAL_AGENTS; i++) {
        content += `import { ${camelCase(i)} } from './agent-${pad(i)}';\n`;
    }

    content += `\nexport const agentRegistry: Record<string, Agent> = {\n`;
    for (let i = 1; i <= TOTAL_AGENTS; i++) {
        content += `  '${camelCase(i)}': ${camelCase(i)},\n`;
    }
    content += `};\n`;

    return content;
}

// --- Main ---
console.log(`\n🚀 Generating ${TOTAL_AGENTS.toLocaleString()} individual agent files...\n`);

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Remove old batch files first
const oldBatchFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith('batch-'));
if (oldBatchFiles.length > 0) {
    console.log(`🗑️  Removing ${oldBatchFiles.length} old batch files...`);
    for (const f of oldBatchFiles) {
        fs.unlinkSync(path.join(OUTPUT_DIR, f));
    }
}

const startTime = Date.now();

// Generate individual agent files
for (let i = 1; i <= TOTAL_AGENTS; i++) {
    const filename = `agent-${pad(i)}.ts`;
    const filepath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filepath, generateAgentFile(i), 'utf-8');

    if (i % 10000 === 0 || i === TOTAL_AGENTS) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  ✅ ${i.toLocaleString()} / ${TOTAL_AGENTS.toLocaleString()} agent files — ${elapsed}s`);
    }
}

// Generate index.ts
console.log(`\n📦 Generating index.ts (barrel exports)...`);
fs.writeFileSync(path.join(OUTPUT_DIR, 'index.ts'), generateIndexFile(), 'utf-8');

// Generate registry.ts
console.log(`📋 Generating registry.ts (agent map)...`);
fs.writeFileSync(path.join(OUTPUT_DIR, 'registry.ts'), generateRegistryFile(), 'utf-8');

const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n🎉 Done! ${TOTAL_AGENTS.toLocaleString()} individual agent files generated in ${totalTime}s`);
console.log(`   📂 Output: ${OUTPUT_DIR}`);
console.log(`   📄 ${TOTAL_AGENTS.toLocaleString()} agent files + index.ts + registry.ts\n`);
