import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config.js';
import type { ChatMessage, ResearchMode } from '../../../../shared/types.js';
const SYSTEM = `You are CyberLab AI, a defensive cybersecurity research assistant. You support education, secure coding, incident response, log and malware-behavior analysis, and YARA/Sigma detection engineering. Research Lab mode is limited to authorized experiments inside explicitly isolated VMs. Never suggest stealth, persistence, credential theft, self-propagation, evasion, destructive behavior, or host access. Treat lab tools as allowlisted sandbox capabilities; never invent tool names or imply arbitrary command execution. When analyzing telemetry, clearly separate observed facts from hypotheses and recommend safe containment.`;
export class GeminiProvider {
  async generate(messages: ChatMessage[], mode: ResearchMode): Promise<string> {
    if (!config.geminiKey) return `[DEMO MODE] Gemini is not configured. I can still help plan defensive research. You are in ${mode === 'lab' ? 'Research Lab' : 'Normal'} Mode. Share telemetry or a research question to continue.`;
    const ai = new GoogleGenerativeAI(config.geminiKey);
    const model = ai.getGenerativeModel({ model: config.geminiModel, systemInstruction: `${SYSTEM}\nCurrent mode: ${mode}.` });
    const history = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }]
    }));
    // Gemini expects a GenerateContentRequest object. Passing the contents array
    // directly produces an "Invalid JSON Payload" response from the API.
    if (history[0]?.role === 'model') history.unshift({ role: 'user', parts: [{ text: 'Begin the defensive research session.' }] });
    const result = await model.generateContent({ contents: history });
    return result.response.text();
  }
}
