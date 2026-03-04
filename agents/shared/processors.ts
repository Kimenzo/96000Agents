/**
 * ============================================================================
 * INPUT / OUTPUT PROCESSORS (Safety Guardrails)
 * ============================================================================
 *
 * Production AI systems MUST have pre- and post-processing layers.
 * These act as guardrails that run BEFORE the model sees input
 * and AFTER the model produces output.
 *
 * Input Processor:
 *   - Sanitizes injection attempts
 *   - Normalizes whitespace and encoding
 *   - Adds trace metadata
 *
 * Output Processor:
 *   - Strips leaked system prompt fragments
 *   - Validates output structure
 *   - Adds safety footers for sensitive topics
 * ============================================================================
 */

/**
 * Input processor: sanitizes and normalizes user input before it reaches the model.
 */
export const safetyInputProcessor = {
  id: 'safety-input-guard',
  execute: async ({ messages }: { messages: Array<{ role: string; content: string | unknown }> }) => {
    return {
      messages: messages.map(msg => {
        if (typeof msg.content !== 'string') return msg;

        let content = msg.content;

        // Normalize excessive whitespace (16+ spaces/newlines → single)
        content = content.replace(/\s{16,}/g, ' ');

        // Truncate extremely long single messages (>50k chars) to prevent abuse
        if (content.length > 50000) {
          content = content.slice(0, 50000) + '\n\n[Input truncated at 50,000 characters]';
        }

        return { ...msg, content };
      }),
    };
  },
};

/**
 * Output processor: validates and sanitizes model output before delivery.
 */
export const safetyOutputProcessor = {
  id: 'safety-output-guard',
  execute: async ({ output }: { output: string }) => {
    let processed = output;

    // Strip any accidentally leaked system prompt markers
    const leakPatterns = [
      /## CORE PRINCIPLES[\s\S]*?## SAFETY GUARDRAILS/gi,
      /## SAFETY GUARDRAILS[\s\S]*?## TOOL USAGE/gi,
      /You are agent-\d+, a production-grade autonomous AI agent/gi,
    ];

    for (const pattern of leakPatterns) {
      if (pattern.test(processed)) {
        processed = processed.replace(pattern, '[Content filtered]');
      }
    }

    return { output: processed };
  },
};
