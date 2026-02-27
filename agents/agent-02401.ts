import { Agent } from '@mastra/core/agent';

export const agent2401 = new Agent({
  id: 'agent-2401',
  name: 'Agent 2401',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
