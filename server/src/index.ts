import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import authRouter from './routes/auth.js';
import clientsRouter from './routes/clients.js';
import integratorsRouter from './routes/integrators.js';
import modulesRouter from './routes/modules.js';
import eoRouter from './routes/eo.js';
import profilesRouter from './routes/profiles.js';
import usersRouter from './routes/users.js';
import listsRouter from './routes/lists.js';
import designRouter from './routes/design.js';
import translationsRouter from './routes/translations.js';
import cvConfigRouter from './routes/cv-config.js';
import cvCampaignsRouter from './routes/cv-campaigns.js';
import displayConfigsRouter from './routes/display-configs.js';

const app = new Hono();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081'],
    credentials: true,
  })
);

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Auth
app.route('/api/auth', authRouter);

// Admin / Integrator management
app.route('/api/clients', clientsRouter);
app.route('/api/integrators', integratorsRouter);

// Modules (mounted under /api for flexibility — routes handle their own prefixes)
app.route('/api', modulesRouter);

// Socle — scoped by client
app.route('/api/clients/:clientId/eo', eoRouter);
app.route('/api/clients/:clientId/profiles', profilesRouter);
app.route('/api/clients/:clientId/users', usersRouter);
app.route('/api/clients/:clientId/lists', listsRouter);
app.route('/api/clients/:clientId/design', designRouter);
app.route('/api/clients/:clientId/translations', translationsRouter);

// Module CV
app.route('/api/modules/:moduleId/cv', cvConfigRouter);
app.route('/api/modules/:moduleId/cv', cvCampaignsRouter);

// Display configs (all modules)
app.route('/api/modules/:moduleId', displayConfigsRouter);

const port = Number(process.env.PORT) || 3001;

console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
