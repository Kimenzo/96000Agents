import { Agent } from '@mastra/core/agent';

export const agent2560 = new Agent({
  id: 'agent-2560',
  name: 'Agent 2560',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
