import { Agent } from '@mastra/core/agent';

export const agent70000 = new Agent({
  id: 'agent-70000',
  name: 'Agent 70000',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
