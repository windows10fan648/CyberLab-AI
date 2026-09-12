# CyberLab AI

CyberLab AI is a local-first cybersecurity research chat workstation. It combines a Gemini provider abstraction with a fully functional `MockLabProvider`, so the complete authorized malware-analysis workflow can be explored without VMware, VirtualBox, QEMU, or host command execution.

## Run locally

1. Install Node.js 22.5+ (the app uses Node's built-in SQLite API, available without native addon compilation).
2. Copy `.env.example` to `.env` and optionally set `GEMINI_API_KEY`. If it is empty, the app runs in a safe demo response mode.
3. Run `npm install` and then `npm run dev`.
4. Open `http://localhost:5173`.

`npm run db:init` initializes the SQLite database and seeds the welcome conversation. The server also initializes it automatically.

## Architecture and safety

The browser talks only to the Express API. Gemini credentials remain server-side. The model has no shell or host access: all future capabilities must be added to the explicit, validated tool registry boundary. The current mock provider simulates lifecycle, experiments, telemetry, timer-related state, and snapshot reversion in memory. Every lab action is written to `tool_invocations`; sessions and telemetry are persisted in SQLite. Network mode defaults to `isolated` in the UI and must be validated by the server.

The UI labels the environment as local and protected, but this starter does not implement production identity management. For deployment, put the API behind an identity-aware reverse proxy or add an OIDC/session middleware before exposing it outside localhost. Never connect the mock provider to host execution, and only implement a real hypervisor provider with a separately isolated service boundary.

## API

REST endpoints cover conversations, messages, lab creation, lifecycle, extension, telemetry, and reversion under `/api`. `GET /api/events` is an SSE stream for chat, lab state, and telemetry events. The sample synthetic telemetry intentionally contains benign process, filesystem, registry, and network observations for defensive analysis.

## Verification

Run `npm run build` to typecheck/compile the server and produce the Vite client bundle. `npm test` is available for adding provider and API tests.
