import { Agent } from '@mastra/core/agent';

export const agent60601 = new Agent({
  id: 'agent-60601',
  name: 'Agent 60601',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
