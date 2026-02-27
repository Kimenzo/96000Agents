import { Agent } from '@mastra/core/agent';

export const agent60405 = new Agent({
  id: 'agent-60405',
  name: 'Agent 60405',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
