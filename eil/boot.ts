#!/usr/bin/env node
/**
 * EVO Intelligence Layer — Boot Script
 *
 * This is the ACTUAL integration point. It:
 *   1. Scans all 96,000 agent files in ../agents/
 *   2. Builds clusters (96 clusters of 1,000 agents each)
 *   3. Builds colonies (3 colonies of 32 clusters each)
 *   4. Creates 96 supervisor agents (one per cluster)
 *   5. Creates 3 meta-agents (Sciences, Engineering, Abstract)
 *   6. Wires the evolution cycle and topology mutation workflows
 *   7. Starts the evolution loop
 *
 * Usage:
 *   npx tsx eil/boot.ts              # Full boot — starts evolution cycle
 *   npx tsx eil/boot.ts --dry-run    # Initialize only — scan, cluster, report, exit
 *   npx tsx eil/boot.ts --status     # Initialize, print status JSON, exit
 *   npx tsx eil/boot.ts --cycle      # Initialize, run one evolution cycle, exit
 *
 * EVO: This file is the answer to "what have we integrated?" — without this,
 * the EIL is just a library sitting next to the agents. With this, it's alive.
 */

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EvoIntelligenceLayer, type EILConfig, type EvoLLM, InMemoryStorageAdapter } from './index.js';

// ── Resolve paths ───────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AGENTS_DIR = path.resolve(__dirname, '..', 'agents');

// ── Parse CLI flags ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const STATUS_ONLY = args.includes('--status');
const SINGLE_CYCLE = args.includes('--cycle');

// ── LLM Stub ────────────────────────────────────────────────────────────────
//
// EVO: In production, this would be wired to Mastra's model router
// (e.g., `openai/gpt-4o-mini`). For the integration boot, we use a
// deterministic stub that returns structured responses so the system
// can initialize and run cycles without requiring an API key.
//
// To use a real LLM, replace this with:
//   import { createOpenAI } from '@ai-sdk/openai';
//   const llm: EvoLLM = { generate: async (prompt) => { ... } };
//

const stubLLM: EvoLLM = {
  async generate(prompt: string): Promise<string> {
    // EVO: Deterministic responses for different EIL operations
    if (prompt.includes('Score this finding')) {
      return JSON.stringify({ relevance: 0.6, novelty: 0.5, coherence: 0.7 });
    }
    if (prompt.includes('cross-colony') || prompt.includes('synthesize')) {
      return JSON.stringify([
        {
          patternId: `pattern-${Date.now().toString(36)}`,
          description: 'Synthesis pattern from cross-colony analysis',
          confidence: 0.65,
          contributingColonies: [],
        },
      ]);
    }
    if (prompt.includes('feedback') || prompt.includes('gradient')) {
      return JSON.stringify({
        strengths: ['Structured approach'],
        weaknesses: ['Could be more specific'],
        suggestions: ['Add domain context'],
        overallScore: 0.6,
      });
    }
    if (prompt.includes('rewrite') || prompt.includes('improve')) {
      return 'Improved instructions with enhanced domain specificity and structured reasoning approach.';
    }
    // Default: return a neutral response
    return 'Acknowledged.';
  },
};

// ── Boot ─────────────────────────────────────────────────────────────────────

async function boot(): Promise<void> {
  const startTime = Date.now();

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         EVO INTELLIGENCE LAYER — BOOT SEQUENCE              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Agents directory: ${AGENTS_DIR}`);
  console.log(`║  Mode: ${DRY_RUN ? 'DRY RUN' : STATUS_ONLY ? 'STATUS' : SINGLE_CYCLE ? 'SINGLE CYCLE' : 'FULL BOOT'}`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  // ── Configure ───────────────────────────────────────────────────────────

  const config: EILConfig = {
    enabled: true,
    agentsDir: AGENTS_DIR,
    fastLLM: stubLLM,
    synthesisLLM: stubLLM,
    storageAdapter: new InMemoryStorageAdapter(),
    evo: {
      clusterSize: 1000,
      clustersPerColony: 32,
      cycleDurationMs: 30 * 60 * 1000, // 30 minutes
      findingThreshold: 0.55,
    },
  };

  const eil = new EvoIntelligenceLayer(config);

  // ── Initialize (this is where 96k agents get scanned) ─────────────────

  console.log('[BOOT] Phase 1: Scanning and registering agents...');

  await eil.initialize((scanned, total) => {
    const pct = ((scanned / total) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\r[BOOT]   Scanned ${scanned.toLocaleString()} / ${total.toLocaleString()} agents (${pct}%) — ${elapsed}s`);
  });

  const scanTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n[BOOT] Phase 1 complete: ${scanTime}s`);

  // ── Report ──────────────────────────────────────────────────────────────

  const status = eil.getStatus();

  console.log();
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│  EIL STATUS                                                 │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log(`│  State:           ${status.state}`);
  console.log(`│  Agents:          ${status.agentCount.toLocaleString()}`);
  console.log(`│  Clusters:        ${status.clusterCount} (${status.agentCount / status.clusterCount} agents each)`);
  console.log(`│  Colonies:        ${status.colonyCount}`);
  console.log(`│  Supervisors:     ${status.supervisorCount}`);
  console.log(`│  Meta-Agents:     ${status.metaAgentCount}`);
  console.log(`│  Cycle Count:     ${status.cycleCount}`);
  console.log(`│  Event Bus:       ${status.eventBusEventCount} events`);

  // SWITCH: Report mode controller status
  const modeCtrl = eil.getModeController();
  if (modeCtrl) {
    const mode = modeCtrl.currentMode;
    const switchHistory = modeCtrl.getSwitchHistory();
    console.log(`│  Runtime Mode:    ${mode}`);
    console.log(`│  Switch History:  ${switchHistory.length} switches`);
  } else {
    console.log(`│  Runtime Mode:    N/A (controller not initialized)`);
  }

  console.log('└─────────────────────────────────────────────────────────────┘');
  console.log();

  if (STATUS_ONLY) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  if (DRY_RUN) {
    console.log('[BOOT] Dry run complete. Exiting.');
    return;
  }

  // ── Run a single evolution cycle ──────────────────────────────────────

  if (SINGLE_CYCLE) {
    console.log('[BOOT] Phase 2: Running single evolution cycle...');
    const cycleStart = Date.now();
    await eil.forceEvolutionCycle();
    const cycleTime = ((Date.now() - cycleStart) / 1000).toFixed(2);
    console.log(`[BOOT] Evolution cycle complete: ${cycleTime}s`);

    const postStatus = eil.getStatus();
    console.log(`[BOOT] Post-cycle event count: ${postStatus.eventBusEventCount}`);
    console.log(`[BOOT] Cycle count: ${postStatus.cycleCount}`);
    return;
  }

  // ── Full boot: start the evolution loop ───────────────────────────────

  console.log('[BOOT] Phase 2: Starting evolution loop...');
  await eil.start();

  const finalStatus = eil.getStatus();
  console.log(`[BOOT] EIL is ${finalStatus.state.toUpperCase()}`);
  console.log(`[BOOT] Evolution cycle interval: ${config.evo?.cycleDurationMs ?? 1800000}ms`);
  console.log(`[BOOT] Topology mutation interval: ${(config.evo?.cycleDurationMs ?? 1800000) * 4}ms`);
  console.log();
  console.log('[BOOT] Press Ctrl+C to stop.');

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n[BOOT] Shutting down EIL...');
    eil.pause();
    const shutdownStatus = eil.getStatus();
    console.log(`[BOOT] Final state: ${shutdownStatus.state}`);
    console.log(`[BOOT] Total cycles completed: ${shutdownStatus.cycleCount}`);
    process.exit(0);
  });
}

// ── Run ─────────────────────────────────────────────────────────────────────

boot().catch((error) => {
  console.error('[BOOT] Fatal error:', error);
  process.exit(1);
});
