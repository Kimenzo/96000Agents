import { Agent } from '@mastra/core/agent';

export const agent68000 = new Agent({
  id: 'agent-68000',
  name: 'Agent 68000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
