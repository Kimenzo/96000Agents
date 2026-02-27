import { Agent } from '@mastra/core/agent';

export const agent201 = new Agent({
  id: 'agent-201',
  name: 'Agent 201',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
