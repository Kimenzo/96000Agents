import { Agent } from '@mastra/core/agent';

export const agent3750 = new Agent({
  id: 'agent-3750',
  name: 'Agent 3750',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
