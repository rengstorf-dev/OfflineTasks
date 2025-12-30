const STATUSES = ['todo', 'in-progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const validateValue = (schema, value, path, errors) => {
  if (!schema || schema.type === undefined) {
    return;
  }

  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  const matchesType = types.some((type) => {
    if (type === 'array') return Array.isArray(value);
    if (type === 'object') return isPlainObject(value);
    if (type === 'string') return typeof value === 'string';
    if (type === 'number') return typeof value === 'number' && !Number.isNaN(value);
    if (type === 'integer') return Number.isInteger(value);
    if (type === 'boolean') return typeof value === 'boolean';
    if (type === 'null') return value === null;
    return false;
  });

  if (!matchesType) {
    errors.push(`${path} should be ${types.join(' or ')}`);
    return;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path} must be one of: ${schema.enum.join(', ')}`);
  }

  if (schema.type === 'array' && schema.items) {
    value.forEach((item, index) => {
      validateValue(schema.items, item, `${path}[${index}]`, errors);
    });
  }

  if (schema.type === 'object') {
    if (schema.required) {
      schema.required.forEach((key) => {
        if (value[key] === undefined) {
          errors.push(`${path}.${key} is required`);
        }
      });
    }
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, childSchema]) => {
        if (value[key] !== undefined) {
          validateValue(childSchema, value[key], `${path}.${key}`, errors);
        }
      });
    }
  }
};

const validateInput = (schema, input) => {
  const errors = [];
  validateValue(schema, input, 'input', errors);
  return errors;
};

const taskMetadataSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: STATUSES },
    priority: { type: 'string', enum: PRIORITIES },
    assignee: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    kanbanOrder: { type: 'integer' },
  },
};

const tools = [
  {
    name: 'create_project',
    description: 'Create a new project.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        color: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_tasks',
    description: 'Create multiple tasks (optionally under a project).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: ['string', 'null'] },
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              status: { type: 'string', enum: STATUSES },
              priority: { type: 'string', enum: PRIORITIES },
              assignee: { type: 'string' },
              startDate: { type: 'string' },
              endDate: { type: 'string' },
              kanbanOrder: { type: 'integer' },
              parentId: { type: ['string', 'null'] },
              projectId: { type: ['string', 'null'] },
              sortIndex: { type: 'integer' },
            },
            required: ['title'],
          },
        },
      },
      required: ['tasks'],
    },
  },
  {
    name: 'list_tasks',
    description: 'List tasks with optional filters.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: ['string', 'null'] },
        status: { type: 'string', enum: STATUSES },
        limit: { type: 'integer' },
      },
    },
  },
  {
    name: 'get_next_task',
    description:
      'Return the next task ordered by priority (high > medium > low) then sort index.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: ['string', 'null'] },
        status: { type: 'string', enum: STATUSES },
      },
    },
  },
  {
    name: 'update_task_status',
    description: 'Update a task status.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        status: { type: 'string', enum: STATUSES },
      },
      required: ['taskId', 'status'],
    },
  },
  {
    name: 'get_task_detail',
    description: 'Fetch a single task by id.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'update_task',
    description: 'Update task fields.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        projectId: { type: ['string', 'null'] },
        parentId: { type: ['string', 'null'] },
        sortIndex: { type: 'integer' },
        metadata: taskMetadataSchema,
        status: { type: 'string', enum: STATUSES },
        priority: { type: 'string', enum: PRIORITIES },
        assignee: { type: 'string' },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        kanbanOrder: { type: 'integer' },
      },
      required: ['taskId'],
    },
  },
];

const normalizeTask = (task) => ({
  id: task.id,
  title: task.title,
  description: task.description,
  projectId: task.projectId ?? task.project_id ?? null,
  parentId: task.parentId ?? task.parent_id ?? null,
  sortIndex: task.sortIndex ?? task.sort_index ?? 0,
  metadata: {
    status: task.metadata?.status ?? task.status ?? 'todo',
    priority: task.metadata?.priority ?? task.priority ?? 'medium',
    assignee: task.metadata?.assignee ?? task.assignee ?? '',
    startDate: task.metadata?.startDate ?? task.start_date ?? '',
    endDate: task.metadata?.endDate ?? task.end_date ?? '',
    kanbanOrder: task.metadata?.kanbanOrder ?? task.kanban_order ?? null,
  },
});

const handlers = {
  create_project: async (api, args) => {
    const payload = {
      name: args.name,
      color: args.color,
    };
    const response = await api.post('/projects', payload);
    return response;
  },

  create_tasks: async (api, args) => {
    const tasks = Array.isArray(args.tasks) ? args.tasks : [];
    if (tasks.length === 0) {
      throw new Error('tasks must be a non-empty array');
    }

    const created = [];
    for (const task of tasks) {
      const metadata = {
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        startDate: task.startDate,
        endDate: task.endDate,
        kanbanOrder: task.kanbanOrder,
      };
      const payload = {
        title: task.title,
        description: task.description,
        projectId: task.projectId ?? args.projectId ?? null,
        parentId: task.parentId ?? null,
        sortIndex: task.sortIndex,
        metadata,
      };
      const response = await api.post('/tasks', payload);
      created.push(normalizeTask(response.task));
    }

    return { tasks: created };
  },

  list_tasks: async (api, args) => {
    const response = await api.get('/tasks');
    const allTasks = (response.tasks || []).map(normalizeTask);
    const filtered = allTasks.filter((task) => {
      if (args.projectId !== undefined && task.projectId !== args.projectId) {
        return false;
      }
      if (args.status && task.metadata.status !== args.status) {
        return false;
      }
      return true;
    });

    const limit = args.limit && args.limit > 0 ? args.limit : null;
    return { tasks: limit ? filtered.slice(0, limit) : filtered };
  },

  get_next_task: async (api, args) => {
    const response = await api.get('/tasks');
    const tasks = (response.tasks || []).map(normalizeTask);
    const status = args.status || 'todo';

    const priorityRank = {
      high: 0,
      medium: 1,
      low: 2,
    };

    const candidates = tasks
      .filter((task) => {
        if (args.projectId !== undefined && task.projectId !== args.projectId) {
          return false;
        }
        return task.metadata.status === status;
      })
      .sort((a, b) => {
        const priorityDiff =
          (priorityRank[a.metadata.priority] ?? 99) -
          (priorityRank[b.metadata.priority] ?? 99);
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        return (a.sortIndex ?? 0) - (b.sortIndex ?? 0);
      });

    return { task: candidates[0] || null };
  },

  update_task_status: async (api, args) => {
    const response = await api.patch(`/tasks/${args.taskId}`, {
      metadata: { status: args.status },
    });
    return { task: normalizeTask(response.task) };
  },

  get_task_detail: async (api, args) => {
    const response = await api.get(`/tasks/${args.taskId}`);
    return { task: normalizeTask(response.task) };
  },

  update_task: async (api, args) => {
    const metadata = {
      ...(args.metadata || {}),
    };

    if (args.status) metadata.status = args.status;
    if (args.priority) metadata.priority = args.priority;
    if (args.assignee !== undefined) metadata.assignee = args.assignee;
    if (args.startDate !== undefined) metadata.startDate = args.startDate;
    if (args.endDate !== undefined) metadata.endDate = args.endDate;
    if (args.kanbanOrder !== undefined) metadata.kanbanOrder = args.kanbanOrder;

    const payload = {
      title: args.title,
      description: args.description,
      projectId: args.projectId,
      parentId: args.parentId,
      sortIndex: args.sortIndex,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };

    const response = await api.patch(`/tasks/${args.taskId}`, payload);
    return { task: normalizeTask(response.task) };
  },
};

module.exports = {
  tools,
  handlers,
  validateInput,
};
