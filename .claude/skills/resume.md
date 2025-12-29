# Task Manager Resume Session Skill

**Purpose:** Quickly load all necessary context at the start of a development session.

**When to use:** At the beginning of a new development session or when starting work after a break to get full context on the task manager application.

---

## Instructions

When this skill is invoked, perform the following steps in order:

### 1. Read Core Documentation Files

Read these files to understand the project architecture and current state:

1. **CLAUDE.md** - Project architecture, patterns, and development guidelines
2. **Latest HANDOFF-*.md file** - Most recent session changes and handoff notes
3. **task-manager-dev-skill.md** - Detailed development context and patterns

### 2. Open Current Working File

Open the current version of the HTML file:
- **task-manager-v20251213-0423.html** (or most recent version)

### 3. Context Summary

After reading all files, provide a brief summary:
- Current version number
- Last major features implemented
- Any in-progress work mentioned in handoff
- Current development priorities from TODO.md (if exists)

### 4. Ready State

Confirm you're ready to work with:
- Full understanding of the codebase architecture
- Knowledge of recent changes
- Awareness of current priorities
- Understanding of key patterns and conventions

---

## Example Usage

User: `/resume`

Or: "Resume my development session"

Or: "Start a new session with context"

---

## Important Notes

- Always find and read the LATEST HANDOFF file (highest timestamp)
- If task-manager-dev-skill.md doesn't exist, note this and continue
- Provide a concise summary - don't overwhelm with details
- Highlight any urgent issues or in-progress work
- Reference specific line numbers when discussing code locations

---

## Automatic File Discovery

- Use glob pattern to find latest HANDOFF-v*.md file
- Use glob pattern to find current task-manager-v*.html file
- Read TODO.md if it exists for current priorities

---

## Error Handling

If any file is missing:
1. Note which file is missing
2. Continue with available files
3. Suggest creating missing files if critical
4. Provide best context possible with available information

---

## Version History

- v1.0 (2025-12-14): Initial skill creation
