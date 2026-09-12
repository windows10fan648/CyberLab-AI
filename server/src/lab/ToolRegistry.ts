import { z } from 'zod';
import type { MockLabProvider } from './MockLabProvider.js';

const tools = {
  create_lab_session: z.object({ name: z.string().min(1).max(100), template: z.string().min(1).max(100), durationMinutes: z.number().int().min(1).max(240), networkMode: z.enum(['isolated', 'host-only', 'none']), telemetry: z.boolean(), autoRevert: z.boolean() }),
  get_lab_status: z.object({ id: z.string().min(1) }),
  start_lab: z.object({ id: z.string().min(1) }),
  stop_lab: z.object({ id: z.string().min(1) }),
  extend_lab_session: z.object({ id: z.string().min(1), minutes: z.number().int().min(1).max(120) }),
  collect_telemetry: z.object({ id: z.string().min(1) }),
  revert_lab: z.object({ id: z.string().min(1) })
};
export type ToolName = keyof typeof tools;
export class ToolRegistry {
  constructor(private readonly provider: MockLabProvider) {}
  has(name: string): name is ToolName { return Object.prototype.hasOwnProperty.call(tools, name); }
  validate(name: string, input: unknown) { if (!this.has(name)) throw new Error(`Tool '${name}' is not allowlisted`); return tools[name].parse(input); }
  get providerInstance() { return this.provider; }
}
