import { Agent } from '@mastra/core/agent';

export const agent8259 = new Agent({
  id: 'agent-8259',
  name: 'Agent 8259',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
