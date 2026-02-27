import { Agent } from '@mastra/core/agent';

export const agent10203 = new Agent({
  id: 'agent-10203',
  name: 'Agent 10203',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
