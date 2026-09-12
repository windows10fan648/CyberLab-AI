export type ResearchMode = 'normal' | 'lab';
export type LabState = 'created' | 'starting' | 'running' | 'stopping' | 'completed' | 'reverted' | 'failed';
export type NetworkMode = 'isolated' | 'host-only' | 'none';

export interface LabConfig { name: string; template: string; durationMinutes: number; networkMode: NetworkMode; telemetry: boolean; autoRevert: boolean; }
export interface LabSession extends LabConfig { id: string; state: LabState; createdAt: string; startedAt?: string; endsAt?: string; currentExperiment?: string; telemetryStatus: 'idle' | 'collecting' | 'ready'; }
export interface Telemetry { id: string; sessionId: string; capturedAt: string; processEvents: Array<{ process: string; pid: number; action: string }>; filesystemEvents: Array<{ path: string; action: string }>; registryEvents: Array<{ key: string; action: string }>; networkEvents: Array<{ destination: string; protocol: string; action: string }>; }
export interface ChatMessage { id: string; conversationId: string; role: 'user' | 'assistant' | 'system'; content: string; createdAt: string; mode: ResearchMode; }
