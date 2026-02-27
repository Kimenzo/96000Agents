import { Agent } from '@mastra/core/agent';

export const agent60820 = new Agent({
  id: 'agent-60820',
  name: 'Agent 60820',
  instructions: 'Awaiting skill assignment.',
  model: 'openai/gpt-4o-mini',
});
