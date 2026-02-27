import { Agent } from '@mastra/core/agent';

export const agent6502 = new Agent({
  id: 'agent-6502',
  name: 'Agent 6502',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
