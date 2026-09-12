import type { LabConfig, LabSession, Telemetry } from '../../../shared/types.js';
export interface ExecutionResult { experimentId: string; status: 'completed' | 'rejected'; summary: string; }
export interface LabProvider { createSession(config: LabConfig): Promise<LabSession>; startSession(id: string): Promise<void>; stopSession(id: string): Promise<void>; executeTest(id: string, artifact: string): Promise<ExecutionResult>; collectTelemetry(id: string): Promise<Telemetry>; revertSnapshot(id: string): Promise<void>; }
