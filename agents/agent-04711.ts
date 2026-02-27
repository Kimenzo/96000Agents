import { Agent } from '@mastra/core/agent';

export const agent4711 = new Agent({
  id: 'agent-4711',
  name: 'Agent 4711',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
