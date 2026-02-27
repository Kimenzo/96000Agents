import { Agent } from '@mastra/core/agent';

export const agent60123 = new Agent({
  id: 'agent-60123',
  name: 'Agent 60123',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
