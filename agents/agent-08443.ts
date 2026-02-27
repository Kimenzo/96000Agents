import { Agent } from '@mastra/core/agent';

export const agent8443 = new Agent({
  id: 'agent-8443',
  name: 'Agent 8443',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
