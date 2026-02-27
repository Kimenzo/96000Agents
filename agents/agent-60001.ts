import { Agent } from '@mastra/core/agent';

export const agent60001 = new Agent({
  id: 'agent-60001',
  name: 'Agent 60001',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
