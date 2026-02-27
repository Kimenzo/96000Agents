import { Agent } from '@mastra/core/agent';

export const agent8750 = new Agent({
  id: 'agent-8750',
  name: 'Agent 8750',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
