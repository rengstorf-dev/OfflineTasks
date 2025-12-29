# Task Manager Handoff Skill

**Purpose:** Automate the creation of handoff documentation at the end of a development session.

**When to use:** At the end of a development session to create a versioned handoff document, version the HTML file, update CLAUDE.md, and create/update TODO.md with remaining work.

---

## Instructions

When this skill is invoked, perform the following steps in order:

### 1. Generate Timestamp
- Get current date/time in format: YYYYMMDD-HHMM
- Use this timestamp for all versioned files

### 2. Create Versioned HTML File
- Copy current `task-manager-v*.html` to new version with timestamp
- New filename: `task-manager-v{TIMESTAMP}.html`
- Example: `task-manager-v20251214-0058.html`

### 3. Create Handoff Document
Create `HANDOFF-v{TIMESTAMP}.md` with the following sections:

#### Required Sections:
1. **Header**
   - Version number (timestamp)
   - Date
   - Previous session version
   - Current file name
   - References to CLAUDE.md and skill files

2. **What Changed This Session**
   - New features implemented (✅)
   - Improvements made
   - Files created/modified

3. **Features Completed**
   - Detailed description of each feature
   - Implementation details (file names and line numbers)
   - Code examples for key patterns
   - UI/UX details

4. **Code Architecture**
   - State management changes
   - File structure updates
   - Critical code locations (with line numbers)

5. **Design Decisions**
   - Why choices were made
   - User preferences incorporated
   - Trade-offs considered

6. **Fixes Applied**
   - Issues identified and resolved
   - Problem description, fix description, file/line references

7. **Important Patterns**
   - New patterns introduced
   - Pattern examples with code
   - When to use each pattern

8. **User Experience Improvements**
   - Before/After comparison
   - UX enhancements made

9. **Testing Checklist**
   - Tests for new features
   - Regression tests
   - All applicable test categories

10. **Technical Learnings**
    - Key insights from this session
    - Gotchas and solutions

11. **Next Priorities**
    - Features requested but not yet implemented
    - Bugs or issues discovered
    - Future enhancement ideas

12. **Start Next Session With**
    - Step-by-step instructions for loading context
    - Commands to run
    - Files to read

13. **Context Usage**
    - Current token usage
    - Safe to continue or needs new session

### 4. Update CLAUDE.md

Update the following sections in CLAUDE.md:

1. **Project Overview** - If Mind Map or other views changed
2. **Data Model** - If new state properties added
3. **Key Architecture Patterns** - If new patterns introduced
4. **Critical Code Locations** - Update line numbers for new features
5. **Keyboard Shortcuts** - If new shortcuts added
6. **Common Patterns & Solutions** - Add new patterns with code examples
7. **Testing Checklist** - Add tests for new features
8. **Common Pitfalls** - Add new pitfalls discovered
9. **Style Guidelines** - If new colors or spacing added
10. **Current Version** - Update version number and implemented features list

### 5. Create/Update TODO.md

Create or update `TODO.md` with:

1. **Current Version** - Timestamp and filename
2. **In Progress** - Features currently being worked on
3. **Next Up** - High priority items for next session
4. **Backlog** - Future enhancements and ideas
5. **Bugs** - Known issues to fix
6. **Notes** - Context or decisions to remember

Format:
```markdown
# Task Manager - TODO

**Version:** v{TIMESTAMP}
**Last Updated:** {DATE}

## 🚧 In Progress
- [ ] Feature being worked on
- [ ] Another active task

## 📋 Next Up (High Priority)
- [ ] Next feature to implement
- [ ] Bug to fix

## 💡 Backlog (Future)
- [ ] Enhancement idea 1
- [ ] Enhancement idea 2

## 🐛 Known Bugs
- [ ] Bug description (file:line)

## 📝 Notes
- Important context
- Design decisions
```

### 6. Summary Output

After creating all files, output a summary:

```
✅ Handoff Complete!

Created/Updated:
- HANDOFF-v{TIMESTAMP}.md
- task-manager-v{TIMESTAMP}.html
- CLAUDE.md (updated)
- TODO.md (created/updated)

Files in this project:
- Current version: task-manager-v{TIMESTAMP}.html
- Previous version: task-manager-v{PREVIOUS}.html
- Handoff docs: {count} files
- Skills: {count} files

Ready for next session!
```

---

## Example Usage

User: `/handoff`

Or: "Create a handoff document for this session"

---

## Important Notes

- Always get the current timestamp (don't use placeholders)
- Read the current HTML file to get accurate line numbers
- Include specific code examples in handoff doc
- Be detailed but concise
- Focus on "why" not just "what"
- Include both successes and challenges
- Make TODO.md actionable with clear next steps

---

## Error Handling

If any step fails:
1. Continue with remaining steps
2. Note the error in the summary
3. Provide guidance on how to complete manually

---

## Version History

- v1.0 (2025-12-14): Initial skill creation
