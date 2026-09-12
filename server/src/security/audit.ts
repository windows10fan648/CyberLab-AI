import { nanoid } from 'nanoid';
import { db } from '../database/db.js';
export function audit(tool: string, parameters: unknown, result: unknown, sessionId?: string) { db.prepare('INSERT INTO tool_invocations VALUES (?, ?, ?, ?, ?, ?)').run(nanoid(), sessionId ?? null, tool, JSON.stringify(parameters), result === undefined ? null : JSON.stringify(result), new Date().toISOString()); }
