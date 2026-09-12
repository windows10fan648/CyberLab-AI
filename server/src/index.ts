import { initializeDatabase } from './database/db.js';
import { config } from './config.js';
import { app } from './api/server.js';
initializeDatabase();
app.listen(config.port, () => console.log(`CyberLab AI server listening on http://localhost:${config.port}`));
