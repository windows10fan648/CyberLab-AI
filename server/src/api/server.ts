import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../database/db.js';
import { MockLabProvider } from '../lab/MockLabProvider.js';
import { ToolRegistry } from '../lab/ToolRegistry.js';
import { audit } from '../security/audit.js';
import { GeminiProvider } from '../services/ai/GeminiProvider.js';
import type { LabConfig, ResearchMode } from '../../../shared/types.js';

const lab = new MockLabProvider(); const registry = new ToolRegistry(lab); const ai = new GeminiProvider(); const clients = new Set<Response>();
const app = express(); app.use(cors()); app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => { if (!req.headers.cookie?.includes('cyberlab_session=')) res.setHeader('Set-Cookie', `cyberlab_session=${nanoid(24)}; HttpOnly; SameSite=Lax; Path=/`); next(); });
const emit = (event: string, data: unknown) => { const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`; clients.forEach(c => c.write(payload)); };
const now = () => new Date().toISOString();
const sessionSchema = z.object({ name: z.string().min(1).max(100), template: z.string().min(1).max(100), durationMinutes: z.number().int().min(1).max(240), networkMode: z.enum(['isolated', 'host-only', 'none']), telemetry: z.boolean(), autoRevert: z.boolean() });
const messageSchema = z.object({ content: z.string().min(1).max(20_000), mode: z.enum(['normal', 'lab']).default('normal') });
function rowSession(id: string) { return db.prepare('SELECT * FROM lab_sessions WHERE id = ?').get(id) as any; }
function saveSession(s: any) { db.prepare(`INSERT OR REPLACE INTO lab_sessions (id,name,template,duration_minutes,network_mode,telemetry,auto_revert,state,created_at,started_at,ends_at,current_experiment,telemetry_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(s.id,s.name,s.template,s.durationMinutes,s.networkMode,s.telemetry?1:0,s.autoRevert?1:0,s.state,s.createdAt,s.startedAt??null,s.endsAt??null,s.currentExperiment??null,s.telemetryStatus); }
function publicSession(r: any) { return { id:r.id,name:r.name,template:r.template,durationMinutes:r.duration_minutes,networkMode:r.network_mode,telemetry:Boolean(r.telemetry),autoRevert:Boolean(r.auto_revert),state:r.state,createdAt:r.created_at,startedAt:r.started_at,endsAt:r.ends_at,currentExperiment:r.current_experiment,telemetryStatus:r.telemetry_status }; }
app.get('/api/health', (_q,res) => res.json({ ok:true, provider:'MockLabProvider', geminiConfigured:Boolean(process.env.GEMINI_API_KEY) }));
app.get('/api/events', (req,res) => { res.setHeader('Content-Type','text/event-stream'); res.setHeader('Cache-Control','no-cache'); res.setHeader('Connection','keep-alive'); res.flushHeaders(); res.write(`event: ready\ndata: ${JSON.stringify({ connectedAt:now() })}\n\n`); clients.add(res); req.on('close', () => clients.delete(res)); });
app.get('/api/conversations', (_q,res) => res.json(db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all()));
app.post('/api/conversations', (req,res) => { const id=nanoid(); const title=String(req.body.title||'New research thread').slice(0,100); const mode=(req.body.mode==='lab'?'lab':'normal') as ResearchMode; db.prepare('INSERT INTO conversations VALUES (?,?,?,?,?)').run(id,title,mode,now(),now()); res.status(201).json({id,title,mode}); });
app.get('/api/conversations/:id', (req,res) => { const conversation=db.prepare('SELECT * FROM conversations WHERE id=?').get(req.params.id); if(!conversation) return res.status(404).json({error:'Conversation not found'}); return res.json({conversation,messages:db.prepare('SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at').all(req.params.id)}); });
app.post('/api/conversations/:id/messages', async (req,res) => { const parsed=messageSchema.safeParse(req.body); if(!parsed.success) return res.status(400).json({error:parsed.error.flatten()}); const convo=db.prepare('SELECT * FROM conversations WHERE id=?').get(req.params.id) as any; if(!convo) return res.status(404).json({error:'Conversation not found'}); const user={id:nanoid(),conversationId:req.params.id,role:'user',content:parsed.data.content,mode:parsed.data.mode,createdAt:now()}; db.prepare('INSERT INTO messages VALUES (?,?,?,?,?,?)').run(user.id,user.conversationId,user.role,user.content,user.mode,user.createdAt); const context=db.prepare('SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at').all(req.params.id) as any[]; try { const answer=await ai.generate(context.map(m=>({...m,createdAt:m.created_at,conversationId:m.conversation_id})),parsed.data.mode); const assistant={id:nanoid(),conversationId:req.params.id,role:'assistant',content:answer,mode:parsed.data.mode,createdAt:now()}; db.prepare('INSERT INTO messages VALUES (?,?,?,?,?,?)').run(assistant.id,assistant.conversationId,assistant.role,assistant.content,assistant.mode,assistant.createdAt); db.prepare('UPDATE conversations SET updated_at=? WHERE id=?').run(assistant.createdAt,req.params.id); emit('chat',assistant); return res.json({user,assistant}); } catch (e) { return res.status(502).json({error:e instanceof Error?e.message:'AI provider error'}); } });
app.post('/api/lab/sessions', async (req,res) => { const parsed=sessionSchema.safeParse(req.body); if(!parsed.success) return res.status(400).json({error:parsed.error.flatten()}); const created=await lab.createSession(parsed.data as LabConfig); saveSession(created); audit('create_lab_session',parsed.data,created,created.id); emit('lab',publicSession(created)); res.status(201).json(created); });
app.get('/api/lab/sessions/:id', (req,res) => { const s=rowSession(req.params.id); return s?res.json(publicSession(s)):res.status(404).json({error:'Lab session not found'}); });
async function action(req:Request,res:Response,kind:string) { const id=String(req.params.id); const r=rowSession(id); if(!r) return res.status(404).json({error:'Lab session not found'}); try { const s=lab.get(id); if(!s) throw new Error('Mock provider session unavailable'); if(kind==='start') await lab.startSession(id); if(kind==='stop') await lab.stopSession(id); if(kind==='revert') await lab.revertSnapshot(id); if(kind==='telemetry') { const telemetry=await lab.collectTelemetry(id); db.prepare('INSERT INTO telemetry VALUES (?,?,?,?)').run(telemetry.id,telemetry.sessionId,JSON.stringify(telemetry),telemetry.capturedAt); audit('collect_telemetry',{},telemetry,id); emit('telemetry',telemetry); return res.json(telemetry); } saveSession(s); audit(`${kind}_lab`,{},s,id); emit('lab',publicSession(s)); return res.json(publicSession(s)); } catch(e) { return res.status(400).json({error:e instanceof Error?e.message:'Lab action failed'}); } }
app.post('/api/lab/sessions/:id/start',(q,r)=>action(q,r,'start')); app.post('/api/lab/sessions/:id/stop',(q,r)=>action(q,r,'stop')); app.post('/api/lab/sessions/:id/revert',(q,r)=>action(q,r,'revert')); app.post('/api/lab/sessions/:id/telemetry',(q,r)=>action(q,r,'telemetry'));
app.post('/api/lab/sessions/:id/extend',(req,res)=>{ const r=rowSession(req.params.id); const minutes=z.number().int().min(1).max(120).safeParse(req.body.minutes); if(!r||!minutes.success) return res.status(400).json({error:'Valid session and extension minutes required'}); const base=new Date(r.ends_at||Date.now()).getTime(); db.prepare('UPDATE lab_sessions SET ends_at=? WHERE id=?').run(new Date(base+minutes.data*60000).toISOString(),r.id); const s=rowSession(r.id); audit('extend_lab_session',{minutes:minutes.data},s,r.id); emit('lab',publicSession(s)); res.json(publicSession(s)); });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, '../../../../client');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

export { app, emit };
