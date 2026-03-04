/**
 * ============================================================================
 * AGENT UPGRADE SCRIPT — Transforms 96,000 agents to production-grade
 * ============================================================================
 *
 * Run with: node --loader ts-node/esm agents/scripts/upgrade-agents.ts
 * Or:       npx tsx agents/scripts/upgrade-agents.ts
 *
 * What this does:
 *   - Reads every agent-XXXXX.ts file in agents/
 *   - Replaces the old boilerplate with production-grade code that uses
 *     the shared infrastructure (memory, scorers, models, instructions, processors)
 *   - Assigns tiers based on agent number (standard/advanced/elite)
 *   - Writes the upgraded file back in place
 *
 * Safe to run multiple times (idempotent — detects already-upgraded agents).
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AGENTS_DIR = path.resolve(__dirname, '..');
const BATCH_SIZE = 500; // Process in batches to avoid memory pressure
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Generates the production-grade agent file content.
 */
function generateAgentContent(agentNumber: number): string {
  const paddedNum = String(agentNumber).padStart(5, '0');
  const agentId = `agent-${agentNumber}`;
  const agentVarName = `agent${agentNumber}`;
  const agentName = `Agent ${agentNumber}`;

  // Determine tier
  let tier: 'standard' | 'advanced' | 'elite';
  if (agentNumber > 90000) tier = 'elite';
  else if (agentNumber > 64000) tier = 'advanced';
  else tier = 'standard';

  // Determine description based on tier
  const descriptions: Record<string, string> = {
    standard: 'Production-grade autonomous agent — efficient, reliable general-purpose AI with full observability and safety guardrails.',
    advanced: 'Advanced production agent — enhanced reasoning, nuanced analysis, and complex problem-solving with multi-model fallback.',
    elite: 'Elite production agent — frontier-level intelligence with maximum capability, deep expertise, and comprehensive evaluation.',
  };

  return `import { Agent } from '@mastra/core/agent';
import {
  createProductionMemory,
  createProductionScorers,
  productionModelChain,
  getAgentTier,
  buildProductionInstructions,
  PRODUCTION_DEFAULTS,
} from './shared';

// ============================================================================
// ${agentName} — Tier: ${tier.toUpperCase()}
// ============================================================================

const AGENT_NUMBER = ${agentNumber};
const AGENT_ID = '${agentId}';
const TIER = getAgentTier(AGENT_NUMBER);

// Production Memory: semantic recall + working memory + observational memory
const memory = createProductionMemory();

// Production Scorers: relevance, coherence, safety, completeness
const scorers = createProductionScorers(AGENT_ID);

// Production Model Chain: multi-model fallback with automatic retries
const modelChain = productionModelChain(TIER);

// Production Instructions: structured system prompt with safety guardrails
const instructions = buildProductionInstructions(AGENT_ID, AGENT_NUMBER, TIER);

export const ${agentVarName} = new Agent({
  id: AGENT_ID,
  name: '${agentName}',
  description: '${descriptions[tier]}',
  instructions,
  model: modelChain,
  memory,
  scorers,
  defaultOptions: {
    maxSteps: PRODUCTION_DEFAULTS.maxSteps[TIER],
    modelSettings: {
      temperature: PRODUCTION_DEFAULTS.temperature[TIER],
      maxOutputTokens: PRODUCTION_DEFAULTS.maxOutputTokens[TIER],
    },
    onError: ({ error }) => {
      console.error(\`[\${AGENT_ID}] Error:\`, error);
    },
  },
  options: {
    tracingPolicy: 'all',
  },
});
`;
}

/**
 * Checks if an agent file has already been upgraded.
 */
function isAlreadyUpgraded(content: string): boolean {
  return content.includes('./shared') && content.includes('createProductionMemory');
}

/**
 * Main upgrade function.
 */
async function main() {
  console.log('='.repeat(70));
  console.log('  AGENT FLEET UPGRADE — Transforming 96,000 agents to production-grade');
  console.log('='.repeat(70));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no files modified)' : 'LIVE'}`);
  console.log('');

  // Discover all agent files
  const files = fs.readdirSync(AGENTS_DIR)
    .filter(f => /^agent-\d{5}\.ts$/.test(f))
    .sort();

  console.log(`Found ${files.length} agent files to process.`);

  let upgraded = 0;
  let skipped = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(files.length / BATCH_SIZE);

    process.stdout.write(`\rBatch ${batchNum}/${totalBatches} — ${upgraded} upgraded, ${skipped} skipped, ${errors} errors`);

    for (const file of batch) {
      try {
        const filePath = path.join(AGENTS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Skip already-upgraded agents
        if (isAlreadyUpgraded(content)) {
          skipped++;
          continue;
        }

        // Extract agent number from filename
        const match = file.match(/agent-(\d{5})\.ts$/);
        if (!match) {
          errors++;
          continue;
        }

        const agentNumber = parseInt(match[1], 10);
        const newContent = generateAgentContent(agentNumber);

        if (!DRY_RUN) {
          fs.writeFileSync(filePath, newContent, 'utf-8');
        }

        upgraded++;
      } catch (err) {
        errors++;
        console.error(`\nError processing ${file}:`, err);
      }
    }
  }

  console.log('\n');
  console.log('='.repeat(70));
  console.log(`  COMPLETE`);
  console.log(`  Upgraded: ${upgraded}`);
  console.log(`  Skipped (already upgraded): ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log('='.repeat(70));

  // Also handle agents with >5 digit numbers (agent-96001.ts, agent-96002.ts)
  const extraFiles = fs.readdirSync(AGENTS_DIR)
    .filter(f => /^agent-\d{4,}\.ts$/.test(f) && !/^agent-\d{5}\.ts$/.test(f))
    .sort();

  if (extraFiles.length > 0) {
    console.log(`\nFound ${extraFiles.length} additional agent files with non-standard naming.`);
    let extraUpgraded = 0;

    for (const file of extraFiles) {
      try {
        const filePath = path.join(AGENTS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        if (isAlreadyUpgraded(content)) continue;

        const match = file.match(/agent-(\d+)\.ts$/);
        if (!match) continue;

        const agentNumber = parseInt(match[1], 10);
        const newContent = generateAgentContent(agentNumber);

        if (!DRY_RUN) {
          fs.writeFileSync(filePath, newContent, 'utf-8');
        }
        extraUpgraded++;
      } catch (err) {
        console.error(`Error processing ${file}:`, err);
      }
    }

    console.log(`  Extra agents upgraded: ${extraUpgraded}`);
  }
}

main().catch(console.error);
