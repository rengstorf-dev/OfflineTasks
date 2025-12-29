const fastify = require('fastify');
const { getToken } = require('./token');
const { openDb } = require('./db');
const projectsRepo = require('./repo/projects');
const tasksRepo = require('./repo/tasks');
const dependenciesRepo = require('./repo/dependencies');
const relatedRepo = require('./repo/related');
const settingsRepo = require('./repo/settings');

const HOST = '127.0.0.1';
const PORT = 3123;

const buildServer = () => {
  const app = fastify({ logger: false });
  const token = getToken();
  const db = openDb();

  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS') {
      return;
    }
    const header = request.headers.authorization || '';
    const parts = header.split(' ');
    const bearer = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : '';

    if (!bearer || bearer !== token) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  app.addHook('onSend', (request, reply, payload, done) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    reply.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    done();
  });

  app.options('*', async () => ({ ok: true }));

  app.get('/health', async () => ({ ok: true }));

  app.get('/projects', async () => {
    return { projects: projectsRepo.listProjects(db) };
  });

  app.post('/projects', async (request) => {
    return { project: projectsRepo.createProject(db, request.body || {}) };
  });

  app.get('/projects/:id', async (request, reply) => {
    const project = projectsRepo.getProject(db, request.params.id);
    if (!project) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return { project };
  });

  app.patch('/projects/:id', async (request, reply) => {
    const project = projectsRepo.updateProject(db, request.params.id, request.body || {});
    if (!project) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return { project };
  });

  app.delete('/projects/:id', async (request, reply) => {
    const ok = projectsRepo.deleteProject(db, request.params.id);
    if (!ok) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return { ok: true };
  });

  app.get('/tasks', async () => {
    return { tasks: tasksRepo.listTasks(db) };
  });

  app.get('/tasks/tree', async () => {
    return { tasks: tasksRepo.getTaskTree(db) };
  });

  app.post('/tasks', async (request) => {
    return { task: tasksRepo.createTask(db, request.body || {}) };
  });

  app.get('/tasks/:id', async (request, reply) => {
    const task = tasksRepo.getTask(db, request.params.id);
    if (!task) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return { task };
  });

  app.patch('/tasks/:id', async (request, reply) => {
    const task = tasksRepo.updateTask(db, request.params.id, request.body || {});
    if (!task) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return { task };
  });

  app.delete('/tasks/:id', async (request, reply) => {
    const ok = tasksRepo.deleteTask(db, request.params.id);
    if (!ok) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return { ok: true };
  });

  app.get('/dependencies', async () => {
    return { dependencies: dependenciesRepo.listDependencies(db) };
  });

  app.get('/tasks/:id/dependencies', async (request) => {
    return {
      dependencies: dependenciesRepo.listDependenciesForTask(db, request.params.id),
    };
  });

  app.post('/dependencies', async (request, reply) => {
    const { taskId, dependsOnId } = request.body || {};
    if (!taskId || !dependsOnId) {
      return reply.code(400).send({ error: 'taskId and dependsOnId required' });
    }
    dependenciesRepo.addDependency(db, taskId, dependsOnId);
    return { ok: true };
  });

  app.delete('/dependencies', async (request, reply) => {
    const { taskId, dependsOnId } = request.body || {};
    if (!taskId || !dependsOnId) {
      return reply.code(400).send({ error: 'taskId and dependsOnId required' });
    }
    const ok = dependenciesRepo.removeDependency(db, taskId, dependsOnId);
    if (!ok) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return { ok: true };
  });

  app.get('/related', async () => {
    return { related: relatedRepo.listRelated(db) };
  });

  app.get('/tasks/:id/related', async (request) => {
    return { related: relatedRepo.listRelatedForTask(db, request.params.id) };
  });

  app.post('/related', async (request, reply) => {
    const { taskId, relatedId } = request.body || {};
    if (!taskId || !relatedId) {
      return reply.code(400).send({ error: 'taskId and relatedId required' });
    }
    relatedRepo.addRelated(db, taskId, relatedId);
    relatedRepo.addRelated(db, relatedId, taskId);
    return { ok: true };
  });

  app.delete('/related', async (request, reply) => {
    const { taskId, relatedId } = request.body || {};
    if (!taskId || !relatedId) {
      return reply.code(400).send({ error: 'taskId and relatedId required' });
    }
    const ok1 = relatedRepo.removeRelated(db, taskId, relatedId);
    const ok2 = relatedRepo.removeRelated(db, relatedId, taskId);
    if (!ok1 && !ok2) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return { ok: true };
  });

  app.get('/settings', async () => {
    return { settings: settingsRepo.listSettings(db) };
  });

  app.get('/settings/:key', async (request, reply) => {
    const value = settingsRepo.getSetting(db, request.params.key);
    if (value === null) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return { key: request.params.key, value };
  });

  app.put('/settings/:key', async (request) => {
    const rawValue = (request.body || {}).value;
    const value =
      typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue ?? null);
    return { setting: settingsRepo.setSetting(db, request.params.key, value) };
  });

  app.delete('/settings/:key', async (request, reply) => {
    const ok = settingsRepo.deleteSetting(db, request.params.key);
    if (!ok) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return { ok: true };
  });

  app.addHook('onClose', async () => {
    db.close();
  });

  return app;
};

const startServer = async () => {
  const app = buildServer();
  await app.listen({ host: HOST, port: PORT });
  return app;
};

if (require.main === module) {
  startServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  buildServer,
  startServer,
  HOST,
  PORT,
};
