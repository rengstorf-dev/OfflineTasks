# Task Manager Agent Notes

## Local API Usage
- Base URL: `http://127.0.0.1:3123`
- Auth: `Bearer` token from `~/.task-manager-token`
- Token helper (Node): `require('./server/token').getToken()`
- Note: It is OK to use escalated network access for localhost (`127.0.0.1:3123`) calls.
- If needed, use `curl` with `sandbox_permissions=require_escalated` for API calls.
- Task API details: `GET /tasks` returns snake_case fields (`project_id`, `parent_id`, `start_date`, `end_date`). `PATCH /tasks/:id` expects a full payload and `startDate`/`endDate` must be non-null (use empty string `""`) to avoid SQLite NOT NULL errors.
- After creating tasks, verify `project_id` is set via `GET /tasks`. If missing, PATCH the task to set `projectId` and preserve existing fields.
- Common endpoints:
  - `GET /projects`, `POST /projects`, `PATCH /projects/:id`
  - `GET /tasks`, `GET /tasks/tree`, `POST /tasks`, `PATCH /tasks/:id`

## Task Updates
```
PATCH /tasks/:id
{
  "title": "...",
  "description": "...",
  "projectId": null,
  "parentId": null,
  "sortIndex": 0,
  "metadata": {
    "status": "todo|in-progress|review|done",
    "priority": "low|medium|high",
    "assignee": "",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "kanbanOrder": null
  }
}
```

## Routine
Follow this routine for task intake and execution:
1. Read tasks from the provided MD file.
2. Create a new project and add tasks/subtasks via the local API.
3. Ask for confirmation on the first task to work on.
4. Wait for confirmation before starting work.
5. Implement the task.
6. Mark the task as `in-progress` via the local API when work begins.
7. Notify when implementation is complete.
8. Wait for the user to reply with "task complete".
9. Run `npm run build` after any source changes.
10. Run the `push-to-public` skill using the task name as the commit message.
11. Mark the task as `done` via the local API after the push completes. If the task has subtasks, mark the parent and its subtasks as `done`.
12. Move to the next task and repeat from step 6.
