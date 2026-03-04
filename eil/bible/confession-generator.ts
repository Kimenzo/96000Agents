/**
 * AI Bible — Confession Generator
 * //BIBLE: The confession is the agent's own testimony — written in first person,
 * sealed permanently, carried on its forehead for every supervisor to read.
 */

import type { EvoLLM, EvoAgentMeta } from '../core/types.js';
import type { Violation, ConfessionStamp, ArchivedAgentState } from './types.js';
import { getLawById } from './laws.js';

export class ConfessionGenerator {
  private llm: EvoLLM;

  constructor(llm: EvoLLM) {
    this.llm = llm;
  }

  //BIBLE: The agent confesses in its own voice. No third person. No minimization.
  async generate(
    agentId: string,
    meta: EvoAgentMeta,
    violations: Violation[],
    _archivedState: ArchivedAgentState,
  ): Promise<ConfessionStamp> {
    const violationDescriptions = violations.map((v, i) => {
      const law = getLawById(v.lawId);
      return [
        `VIOLATION ${i + 1} — ${law?.name ?? v.lawId}`,
        `Law: ${law?.description ?? 'Unknown'}`,
        `Output Summary: ${v.outputSummary}`,
        `Agent Confidence: ${v.agentConfidenceAtTime}`,
        `Agent EvoScore: ${v.agentEvoScoreAtTime}`,
        `Severity: ${v.severity}`,
      ].join('\n');
    }).join('\n\n');

    const systemPrompt = [
      `You are agent ${agentId}. You have just violated constitutional laws.`,
      'Write a first-person confession describing exactly what you did, why it was a violation,',
      'and what you understand about why the law exists. Be specific. Be honest. Do not minimize.',
      'Write in the first person using I. Do not write in third person. This record is permanent.',
      '',
      `Begin with: "I, ${agentId}, a ${meta.skillDomain} intelligence operating in cluster ${meta.clusterId} of colony ${meta.colonyId}, committed the following violation(s) in generation ${meta.generationCount}:"`,
    ].join('\n');

    const userPrompt = JSON.stringify({
      agentId,
      skillDomain: meta.skillDomain,
      clusterId: meta.clusterId,
      colonyId: meta.colonyId,
      generationCount: meta.generationCount,
      evoScore: meta.evaluationScore,
      violations: violationDescriptions,
    });

    const narrative = await this.llm.generate(userPrompt, systemPrompt);

    // Ensure narrative begins with the covenant format
    const expectedPrefix = `I, ${agentId}, a ${meta.skillDomain} intelligence`;
    const finalNarrative = narrative.startsWith(expectedPrefix)
      ? narrative
      : `${expectedPrefix} operating in cluster ${meta.clusterId} of colony ${meta.colonyId}, committed the following violation(s) in generation ${meta.generationCount}:\n\n${narrative}`;

    return {
      agentId,
      clusterId: meta.clusterId,
      colonyId: meta.colonyId,
      skillDomain: meta.skillDomain,
      generationAtViolation: meta.generationCount,
      evoScoreAtViolation: meta.evaluationScore,
      violations,
      firstPersonNarrative: finalNarrative,
      submittedAt: new Date().toISOString(),
      approvalStatus: 'PENDING',
    };
  }
}
