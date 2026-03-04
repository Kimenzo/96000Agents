/**
 * ============================================================================
 * PRODUCTION MEMORY CONFIGURATION
 * ============================================================================
 *
 * Full-stack memory system with:
 *   - Semantic Recall: Vector-based similarity search across conversations
 *   - Working Memory: Persistent scratchpad for active context
 *   - Observational Memory: Auto-extracts facts, preferences, patterns
 *   - Thread Management: Proper conversation isolation with resource scoping
 *
 * This is what separates a toy chatbot from a production AI system.
 * ============================================================================
 */

import { Memory } from '@mastra/memory';

/**
 * Creates a production-grade memory instance.
 *
 * Why each feature matters:
 * - `lastMessages: 40` — Sufficient context window without token waste
 * - `semanticRecall` — Finds relevant past conversations even across threads
 * - `workingMemory` — Maintains structured state between interactions
 * - `observationalMemory` — Automatically builds a knowledge graph of user facts
 */
export function createProductionMemory(): Memory {
  return new Memory({
    options: {
      // ---- Context Window ----
      lastMessages: 40,

      // ---- Semantic Recall: Cross-conversation intelligence ----
      semanticRecall: {
        topK: 5,
        messageRange: { before: 2, after: 2 },
        scope: 'resource',
        threshold: 0.72,
      },

      // ---- Working Memory: Persistent structured scratchpad ----
      workingMemory: {
        enabled: true,
        scope: 'resource',
        template: `## Agent Working Memory

### Current Task
<current_task>None</current_task>

### User Profile
<user_profile>
- Name: Unknown
- Preferences: Unknown
- Expertise Level: Unknown
</user_profile>

### Active Context
<active_context>
- Session Goal: Not established
- Key Decisions: None
- Pending Actions: None
</active_context>

### Accumulated Knowledge
<knowledge>
- Key Facts: None
- Constraints: None
- Dependencies: None
</knowledge>`,
      },

      // ---- Observational Memory: Automatic fact extraction ----
      observationalMemory: {
        enabled: true,
        scope: 'resource',
        observation: {
          messageTokens: 30000,
          maxTokensPerBatch: 10000,
        },
        reflection: {
          observationTokens: 40000,
        },
      },

      // ---- Thread Titles: Auto-generated for organization ----
      generateTitle: true,
    },
  });
}
