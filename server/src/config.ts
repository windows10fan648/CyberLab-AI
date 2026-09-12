import 'dotenv/config';
import path from 'node:path';
export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? './data/cyberlab.sqlite',
  geminiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET ?? 'local-development-secret'
};
export const databasePath = path.resolve(process.cwd(), config.databaseUrl);
