import { Agent } from '@mastra/core/agent';

export const agent61850 = new Agent({
  id: 'agent-61850',
  name: 'Agent 61850',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
