# Task Manager Agent Notes

## Local API Usage
- Base URL: `http://127.0.0.1:3123`
- Auth: `Bearer` token from `~/.task-manager-token`
- Token helper (Node): `require('./server/token').getToken()`
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
11. Mark the task as `done` via the local API after the push completes.
12. Move to the next task and repeat from step 6.
