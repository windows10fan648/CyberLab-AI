import { describe, expect, it } from 'vitest';
import { MockLabProvider } from './MockLabProvider.js';
import { ToolRegistry } from './ToolRegistry.js';

describe('ToolRegistry', () => {
  const registry = new ToolRegistry(new MockLabProvider());
  it('only accepts allowlisted tools', () => {
    expect(registry.has('start_lab')).toBe(true);
    expect(registry.has('execute_host_command')).toBe(false);
    expect(() => registry.validate('execute_host_command', {})).toThrow('not allowlisted');
  });
  it('validates lab configuration before provider use', () => {
    expect(registry.validate('create_lab_session', { name: 'x', template: 'baseline', durationMinutes: 10, networkMode: 'isolated', telemetry: true, autoRevert: true })).toMatchObject({ networkMode: 'isolated' });
    expect(() => registry.validate('create_lab_session', { name: '', template: 'baseline', durationMinutes: 10, networkMode: 'isolated', telemetry: true, autoRevert: true })).toThrow();
  });
});
