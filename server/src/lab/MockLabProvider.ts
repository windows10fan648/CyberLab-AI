import { nanoid } from 'nanoid';
import type { LabConfig, LabSession, Telemetry } from '../../../shared/types.js';
import type { ExecutionResult, LabProvider } from './LabProvider.js';

export class MockLabProvider implements LabProvider {
  private sessions = new Map<string, LabSession>();
  async createSession(config: LabConfig) { const session: LabSession = { ...config, id: `lab_${nanoid(10)}`, state: 'created', createdAt: new Date().toISOString(), telemetryStatus: 'idle' }; this.sessions.set(session.id, session); return session; }
  async startSession(id: string) { const s = this.require(id); s.state = 'running'; s.startedAt = new Date().toISOString(); s.endsAt = new Date(Date.now() + s.durationMinutes * 60_000).toISOString(); }
  async stopSession(id: string) { const s = this.require(id); s.state = 'stopping'; await new Promise(r => setTimeout(r, 250)); s.state = 'completed'; }
  async executeTest(id: string, artifact: string): Promise<ExecutionResult> { const s = this.require(id); if (s.state !== 'running') throw new Error('Lab must be running before an experiment can start'); s.currentExperiment = artifact; await new Promise(r => setTimeout(r, 400)); return { experimentId: `exp_${nanoid(8)}`, status: 'completed', summary: 'Mock execution completed; synthetic telemetry is available.' }; }
  async collectTelemetry(id: string): Promise<Telemetry> { const s = this.require(id); s.telemetryStatus = 'collecting'; await new Promise(r => setTimeout(r, 200)); s.telemetryStatus = 'ready'; return { id: `tel_${nanoid(8)}`, sessionId: id, capturedAt: new Date().toISOString(), processEvents: [{ process: 'sample.exe', pid: 4180, action: 'created' }, { process: 'powershell.exe', pid: 4224, action: 'child process' }], filesystemEvents: [{ path: 'C:\\Lab\\sample.exe', action: 'read' }, { path: 'C:\\Lab\\output.log', action: 'created' }], registryEvents: [{ key: 'HKCU\\Software\\CyberLab\\RunState', action: 'set' }], networkEvents: [{ destination: '10.0.0.10:443', protocol: 'TCP', action: 'connection attempt' }] }; }
  async revertSnapshot(id: string) { const s = this.require(id); s.state = 'reverted'; s.currentExperiment = undefined; }
  get(id: string) { return this.sessions.get(id); }
  private require(id: string) { const s = this.sessions.get(id); if (!s) throw new Error('Lab session not found'); return s; }
}
