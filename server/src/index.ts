import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import auth from './routes/auth.js';
import clientsRouter from './routes/clients.js';
import integratorsRouter from './routes/integrators.js';
import modulesRouter from './routes/modules.js';
import moduleRolesRouter from './routes/module-roles.js';
import modulePermissionsRouter from './routes/module-permissions.js';
import moduleWorkflowsRouter from './routes/module-workflows.js';
import organizationalEntitiesRouter from './routes/organizational-entities.js';
import referentialsRouter from './routes/referentials.js';
import profileTemplatesRouter from './routes/profile-templates.js';
import clientUsersRouter from './routes/client-users.js';
import designRouter from './routes/design.js';
import translationsRouter from './routes/translations.js';

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

// Routes
app.route('/api/auth', auth);
app.route('/api/clients', clientsRouter);
app.route('/api/integrators', integratorsRouter);
app.route('/api/modules', modulesRouter);
app.route('/api/module-roles', moduleRolesRouter);
app.route('/api/module-permissions', modulePermissionsRouter);
app.route('/api/module-workflows', moduleWorkflowsRouter);
app.route('/api/organizational-entities', organizationalEntitiesRouter);
app.route('/api/referentials', referentialsRouter);
app.route('/api/listes', referentialsRouter);
app.route('/api/profile-templates', profileTemplatesRouter);
app.route('/api/client-users', clientUsersRouter);
app.route('/api/design', designRouter);
app.route('/api/translations', translationsRouter);

const port = Number(process.env.PORT) || 3001;

console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
