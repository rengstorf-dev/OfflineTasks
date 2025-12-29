# Task Manager - TODO

**Version:** v20251215-2308
**Last Updated:** December 15, 2025 (CST)
**Build Output:** `dist/task-manager.html` (built from `/src`)


---

## 🎯 NEW FEATURE ROADMAP

### Phase 1: Foundation (Settings Infrastructure)

**Goal:** Create the settings system that other features will build upon

1. **Settings Pane - View-Specific Settings**
   - **UI Location:** Horizontal pane below view selectors
   - **Similar to:** Current Gantt date hierarchy controls
   - **Behavior:** Changes content based on selected view
   - **Replaces:** Current scattered settings (status buttons, search, etc.)
   - **Implementation:**
     - Create settings pane container
     - Define view-specific setting sets
     - Render appropriate settings for each view
     - Persist settings in localStorage
     - **Status:** ✅ COMPLETED
2. **Global Settings Config - Infrastructure**
   - **Storage:** Global preferences saved to localStorage
   - **Settings Class:** Manages get/set with dot notation, persistence, defaults
   - **Display Customization:**
     - Mind Map line style: straight, curved, right-angles
     - Show/hide descriptions on Mind Map nodes
     - Default view on load
     - Auto-save preferences
   - **Filter Toggle Behavior:**
     - Remove "All" filter button
     - Clicking an active filter button deselects it (toggles off)
     - No filter active = show all tasks (equivalent to old "All" behavior)
     - Global setting option to enable/disable this behavior
   - **Integration:** Works with settings pane from #1
   - **Status:** ✅ COMPLETED

2b. **Global Settings UI Panel - User Interface**
   - **Goal:** Provide UI for users to configure global settings
   - **Access:** Settings button in toolbar (⚙️ icon)
   - **UI Type:** Modal or slide-out panel
   - **Settings Categories:**
     - **Theme & Colors:**
       - Status colors customization (Todo, In Progress, Review, Done)
       - Priority colors (High, Medium, Low)
       - Background colors (light/dark mode variants)
       - Accent colors
     - **Icons & Emojis:**
       - Default status emoji/icons (○, ⚡, 👁, ✓)
       - Custom emoji picker for statuses
       - Icon style preferences
     - **Behavior:**
       - Filter toggle behavior (on/off)
       - Auto-save (on/off)
       - Default view selection
       - Checkbox mode (enable/disable)
     - **Mind Map:**
       - Line style (straight/curved/right-angles)
       - Show descriptions on nodes (on/off)
       - Default layout mode (tree/radial)
   - **Actions:**
     - Save button
     - Reset to defaults button
     - Cancel button
   - **Persistence:** Uses existing Settings class
   - **Status:** ✅ COMPLETED

3. **Priority Visualization - Smart Indicators + Sort Controls**
   - **Design Decision:** Status colors remain primary, priority flags what needs attention
   - **Visual Indicators:**
     - **High Priority ONLY:** ⚠️ symbol/icon (reduces clutter)
     - Medium/Low: No visual indicator (assumed "normal")
     - Appears before task title in all views
   - **Sort Controls:**
     - "Sort by Priority" button in settings pane
     - Sorts high → medium → low within each view
     - Maintains hierarchy (parent/child relationships)
     - Works across all views
   - **Per-View Implementation:**
     - **Outline:** ⚠️ icon before bullet point
     - **Kanban:** ⚠️ badge at top-left of card
     - **Gantt:** ⚠️ icon before task name in row
     - **Mind Map:** ⚠️ symbol inside node (top-left corner)
   - **Integration:** Sort button in view-specific settings pane
   - **Status:** ✅ COMPLETED

---

### Phase 2: User Experience Enhancements


1. **Click Status Emoji to Toggle Complete**
   - **Goal:** Quick way to mark tasks complete without detail panel
   - **Behavior:** Simple toggle - Click status icon → toggle between current status and Done
   - **Current Status Icons:**
     - Todo: ○ (circle)
     - In Progress: ⚡ (lightning)
     - Review: 👁 (eye)
     - Done: ✓ (checkmark)
   - **Interaction:**
     - Click ○, ⚡, or 👁 → Changes to ✓ (marks as Done)
     - Click ✓ → Changes back to ○ (marks as Todo)
     - Visual feedback: icon changes immediately
     - Cursor: pointer on hover to indicate clickability
   - **Implementation:**
     - Add `data-toggle-status` attribute to status icon
     - Event handler toggles status (not-done ↔ done)
     - `e.stopPropagation()` to prevent detail panel from opening
   - **UX:** Inline, no panel needed
   - **Undo:** Full undo/redo support
   -  **Status:** ✅ COMPLETED

2. **Outline Dependency Highlighting**
   - **Trigger:** Click dependency icon on a task
   - **Effect:** Highlight all related dependent tasks
   - **Visual:** Scroll to + highlight connections
   - **Clear:** Click again or click elsewhere to clear

3. **Show Dependencies Filter Button**
   - **UI:** Button in toolbar (global control)
   - **Behavior:** Filter showing only tasks with dependenciesne
   - **Visual:** Make non-dependent tasks transparent (like current filters)
   - **Scope:** Shows all dependencies across entire task tree

4. **Inline Description Editing UX - # Delimiter Parsing**
   - **Goal:** Fast, inline description entry without clicking separate panels
   - **Delimiter:** Single `#` symbol
   - **Typing Flow:**
     - Type: `Fix login bug # Need to update auth flow`
     - On blur/save: Parse and split into title + description
     - Title: "Fix login bug"
     - Description: "Need to update auth flow"
   - **Visual Display:**
     - Depends on "Show Descriptions" toggle (existing behavior)
     - When descriptions shown: Display as two separate lines (title above, description below)
     - When descriptions hidden: Only show title
     - **Important:** Never show `#` symbol in rendered view
   - **Editing Behavior:**
     - Title field: Shows only title text (no `#`)
     - Description field: Shows only description text (no `#`)
     - Keeps current separate contenteditable fields
   - **Escape Character:** `\#` for literal hash symbol in title
   - **Parsing Rules:**
     - Split on first `#` only
     - Everything before first `#` = title
     - Everything after first `#` = description
     - Trim whitespace from both
   - **Edge Cases:**
     - `Task #` with no description text = no description saved
     - `Task with no hash` = title only, no description
     - `Task \# with escaped hash` = title includes literal `#` character
   -  **Status:** ✅ COMPLETED

---

### Phase 3: Assignment & Team Management

7. **Assignment Filter System**
   - **NOT a separate view** - Filter applied to existing views
   - **Hierarchy:**
     - **Team** - Top-level organizational grouping
     - **Resource** - Individual assignee within team
   - **Data Model Updates:**
     - Add `team` field to task metadata
     - Extend `assignee` to support team hierarchy
   - **Filter UI:**
     - Dropdown or multi-select in settings pane
     - Filter by team and/or individual resource
   - **Integration:** Works across all views (Outline, Kanban, Gantt, Mind Map)

8. **Project Grouping & Filtering**
   - **Purpose:** Group parent tasks into "projects"
   - **Use Case:** View subset of projects at a time
   - **UI:**
     - Multi-select checkboxes
     - "Select All" / "Deselect All" options
   - **Data Model:**
     - Tag-based or multiple root tasks approach
   - **Filter Persistence:** Save active project filters

---

### Phase 4: Export & Data Portability

9. **Export Individual Visuals**
   - **Priority Views:** Kanban, Gantt (most important)
   - **Secondary Views:** Mind Map, Outline
   - **Formats:**
     - PNG (high priority)
     - SVG (vector graphics for scaling)
     - PDF (optional, nice-to-have)
   - **Technical Approach:**
     - html2canvas for Kanban/Outline
     - Canvas screenshot for Mind Map
     - SVG export for Gantt
   - **UI:** Export button in settings pane per view

10. **Project Export - All Visuals**
    - **Scope:** Export all views in one operation
    - **Format Options:**
      - ZIP with multiple image files
      - Multi-page PDF (one view per page)
    - **Settings:** User selects which views to include

11. **Import/Export Data Schema** ✅ COMPLETED
    - **Purpose:** Data portability between systems
    - **Use Case:** Migrate from other task managers to this app
    - **Format:** JSON schema
    - **Features:**
      - ✅ Export full task hierarchy
      - ✅ Import with validation
      - ✅ Replace mode (merge not implemented)
      - ✅ JSON includes: tasks, dependencies, settings, nextId
    - **Implementation:** Export/Import buttons in Global Settings Modal
    - **Status:** v20251215-2308 CST

---

### Phase 5: Polish & Accessibility

12. **Dark Mode Accessibility**
    - **Scope:** Full color scheme overhaul
    - **Approach:**
      - Define CSS variables for all colors
      - Create light/dark theme definitions
      - System preference detection
      - Manual toggle in settings
    - **Colors to Update:**
      - Status colors (ensure contrast)
      - Background/foreground
      - Borders and dividers
      - Mind Map lines and nodes
    - **Testing:** WCAG AA contrast compliance

---

## 💡 Previous Backlog (Lower Priority)

### Mind Map Features
- [ ] **Export Mind Map as image** (PNG or SVG)
  - Capture current view or entire tree
  - Include zoom/pan state or reset to default
  - Download dialog

- [ ] **Mini-map for navigation**
  - Small overview in corner
  - Shows current viewport
  - Click to jump to area

- [ ] **Mind Map canvas overflow constraint**
  - Prevent panning beyond bounds
  - Add boundary indicators
  - Auto-adjust when zooming out

- [ ] **Collapse all at level N**
  - Collapse everything below a certain depth
  - Useful for very large trees
  - Add to controls or keyboard shortcut

### Data & Persistence
- [ ] **LocalStorage persistence**
  - Save tasks automatically
  - Load on startup
  - Clear storage option

- [ ] **Export to JSON**
  - Download tasks as JSON file
  - Useful for backup

- [ ] **Import from JSON/CSV**
  - Load tasks from file
  - Merge or replace existing

### Gantt Enhancements
- [ ] **Dependency lines** in Gantt view
  - Draw arrows between dependent tasks
  - Show on hover or always visible

- [ ] **Drag to adjust dates** in Gantt view
  - Drag bar ends to change start/end dates
  - Live update as you drag

### General Features
- [ ] **Dark mode**
  - Toggle in settings
  - Persist preference
  - Adjust all colors

- [ ] **Multi-select tasks** (Outline view)
  - Cmd/Ctrl+click to select multiple
  - Bulk operations (delete, change status, etc.)

- [ ] **Task comments/history**
  - Add comments to tasks
  - Show edit history
  - Timestamp changes

- [ ] **Subtask progress bars**
  - Show % complete based on children
  - Visual indicator in parent task

---

## 🐛 Known Bugs

### Current Issues (v20251215-2308 CST)

**Bugs:**
- [ ] **Gantt bars not aligned with task boxes** - Timeline bars misaligned vertically with task name rows (partial fix attempted, still not working)

**UX Enhancements Needed:**

- [ ] **Mind Map: Tree nodes not always visually connected** - Connection lines don't always reach the node boxes properly


---

### Fixed Bugs & Enhancements (v20251225-1508 CST)
- [✅] **Outline: Enter key should insert task below current task** - Currently inserts at bottom of entire outline; should insert below current task or at bottom of current subtask hierarchy
- [✅] **Outline: Click selection should highlight text only** - Currently highlights entire task row, making navigation difficult; should only highlight task text box
- [✅] **Outline: Delete key should not prompt delete row when inline editing** - Currently prompts delete when attempting to hit delete to edit text in outline


### Fixed Bugs & Enhancements (v20251215-2308 CST)
- [✅] **Import/Export Data (Phase 4, Item 11)** - IMPLEMENTED
  - Export button downloads JSON file with all data
  - Import button uploads and replaces current data
  - JSON schema includes: version, exportDate, tasks, nextId, dependencies, settings
  - Located in Global Settings Modal below existing buttons
  - Confirmation dialog on import (warns about data replacement)
  - Implementation: src/ui/modals.js (exportData, importData functions), src/index.template.html (buttons)

- [✅] **Outline filter doesn't show 'review' status tasks** - FIXED
  - Added "Review" filter button to Outline view settings pane
  - Added "Review" filter button to Gantt view settings pane
  - Implementation: src/ui/toolbar.js (lines 13, 67)

### Fixed Bugs & Enhancements (v20251215-0300)
- [✅] **Search tasks does not work** - FIXED & ENHANCED
  - Added `getFilteredFlatTasks()` method to TaskStore
  - Updated Kanban view to apply search filter (lines 16-25 in kanban.js)
  - Updated Gantt view to apply both search and status filters (lines 2-34, 113-144 in gantt.js)
  - Outline view already working correctly
  - **Enhanced:** Search now filters on Enter key press (prevents lag on every keystroke)
  - **Enhanced:** Auto-clears filter when all text is deleted (Delete/Backspace)
  - **Enhanced:** Cursor stays in search box after both Enter and Delete operations
  - **Enhanced:** Cursor positioned at end of text (not selecting all text)
  - Placeholder updated to indicate "Press Enter" behavior
  - Clears filter on blur if input is empty
  - Implementation:
    - Added 'input' event listener for auto-clear (src/ui/toolbar.js lines 191-197)
    - Focus retention with flag-based approach (src/ui/toolbar.js lines 185, 194, 257-269)
    - Sets `app.shouldRefocusSearch` flag on both Enter and Delete operations
    - Refocuses after settings pane re-renders with cursor at end using `setSelectionRange()`

- [✅] **Status filters don't work in Kanban view** - FIXED (by removing)
  - Removed redundant status filter buttons from Kanban settings pane
  - Status filtering doesn't make sense in Kanban since columns organize by status
  - Search filter still works in Kanban view

- [✅] **Toggle display of assignee and priority icons in Mind Map** - ENHANCED
  - Replaced single metadata toggle with two separate controls:
    - "Hide/Show Assignee" button (src/store.js line 15: `showMindMapAssignee`)
    - "Hide/Show Priority ⚠️" button (src/store.js line 16: `showMindMapPriority`)
  - Updated Mind Map settings pane with two toggle buttons (src/ui/toolbar.js lines 101-113)
  - Updated Mind Map rendering to check both properties independently (src/views/mindmap.js lines 184-189)
  - Provides more granular control over what metadata to display
  - Reduces visual clutter for presentations or high-level overviews

---

## 📝 Notes

### Session v20251215-2308 CST Summary (LATEST)
- ✅ **Implemented Import/Export Data (Phase 4, Item 11)**
  - Export button in Global Settings Modal downloads JSON file
  - Import button uploads and replaces all data with confirmation
  - JSON includes: tasks, dependencies, settings, nextId, version, exportDate
- ✅ **Fixed outline/Gantt filter missing 'review' status**
  - Added Review button to Outline and Gantt filter groups
- ⚠️ **Attempted Gantt bar alignment fix** - Still has issues
  - Added height/flexbox to .gantt-task-row (src/styles.css)
  - Bars still not properly aligned with task names
- 📋 **Documented bugs and UX enhancements:**
  - Gantt bar alignment (still broken)
  - Outline Enter key behavior improvement needed
  - Outline click selection refinement needed
  - Mind Map connection line issues

### Session v20251215-0300 Summary
- ✅ Fixed search functionality bug across all views
- ✅ Fixed Kanban status filter issue (removed redundant filters)
- ✅ **Enhanced search UX** - Changed to filter on Enter key (prevents lag on every keystroke)
- ✅ **Auto-clear search filter** - Deleting all text in search box immediately clears filter
- ✅ **Search focus retention** - Cursor stays in search box after both Enter and Delete operations
  - Cursor positioned at end of text (not selecting)
  - Uses flag-based approach to refocus after re-render
  - Implementation: `app.shouldRefocusSearch` flag set on Enter/Delete, checked after settings pane render
- ✅ **Split Mind Map metadata controls** - Separate toggles for assignee and priority (more granular control)
- ✅ All known bugs from previous session now resolved
- 📋 Ready for Phase 2 features or further enhancements

### Session v20251215-0255 Summary
- ✅ Fixed search functionality bug across all views
- ✅ Fixed Kanban status filter issue (removed redundant filters)
- ✅ **Enhanced search UX** - Changed to filter on Enter key (prevents lag on every keystroke)
- ✅ **Auto-clear search filter** - Deleting all text in search box immediately clears filter
- ✅ **Search focus retention** - Fixed: Cursor stays in search box after pressing Enter, with text selected for easy re-search
  - Uses flag-based approach to refocus after re-render
  - Implementation: `app.shouldRefocusSearch` flag set on Enter, checked after settings pane render
- ✅ **Split Mind Map metadata controls** - Separate toggles for assignee and priority (more granular control)
- ✅ All known bugs from previous session now resolved

### Session v20251215-0250 Summary
- ✅ Fixed search functionality bug across all views
- ✅ Fixed Kanban status filter issue (removed redundant filters)
- ✅ **Enhanced search UX** - Changed to filter on Enter key (prevents lag on every keystroke)
- ✅ **Auto-clear search filter** - Deleting all text in search box immediately clears filter
- ✅ **Search focus retention** - Cursor stays in search box after pressing Enter, with text selected for easy re-search
- ✅ **Split Mind Map metadata controls** - Separate toggles for assignee and priority (more granular control)
- ✅ All known bugs from previous session now resolved

### Session v20251215-0245 Summary
- ✅ Fixed search functionality bug across all views
- ✅ Fixed Kanban status filter issue (removed redundant filters)
- ✅ **Enhanced search UX** - Changed to filter on Enter key (prevents lag on every keystroke)
- ✅ **Auto-clear search filter** - Deleting all text in search box immediately clears filter
- ✅ **Split Mind Map metadata controls** - Separate toggles for assignee and priority (more granular control)
- ✅ All known bugs from previous session now resolved

### Session v20251215-0230 Summary
- ✅ Fixed search functionality bug across all views
- ✅ Fixed Kanban status filter issue (removed redundant filters)
- ✅ **Enhanced search UX** - Changed to filter on Enter key (prevents lag on every keystroke)
- ✅ **Split Mind Map metadata controls** - Separate toggles for assignee and priority (more granular control)
- ✅ All known bugs from previous session now resolved

### Session v20251215-0200 Summary
- ✅ Fixed search functionality bug across all views
- ✅ Fixed Kanban status filter issue (removed redundant filters)
- ✅ Added Mind Map metadata toggle for assignee/priority display
- ✅ All known bugs from previous session now resolved

### Session v20251214-1531 Summary
- ✅ Implemented view-specific settings pane infrastructure
- ✅ Implemented Settings class with localStorage persistence
- ✅ Implemented filter toggle behavior (removed "All" button)
- ✅ Added automatic preference saving (default view, Mind Map mode)
- ✅ Documented 12+ features across 5 phases
- ✅ Specified Global Settings UI Panel (theme/colors/icons)
- ✅ Specified click status emoji to toggle complete
- 📋 Ready for Phase 1, Item 3: Priority Visualization

### Session v20251214-0058 Summary
- Implemented dual Mind Map modes (Tree + Radial)
- Added viewport-centered zoom
- Created two-button collapse/expand system
- Fixed pan/zoom state persistence
- Fixed mode switching

### Roadmap Planning Session
- Defined 12 new features organized into 5 phases
- Clarified architectural approach for major features
- Settings pane will be horizontal, below view selectors
- Assignment is a filter, not a separate view
- Priority: Smart indicators (⚠️ for high only) + sort controls
- Import/Export for data portability (not monetization)

### Design Decisions to Remember
- **Tree mode is default** - More familiar for most users
- **Blue = simple, Green = powerful** - Color coding for collapse buttons
- **Reset state on mode switch** - Better UX than preserving incompatible view
- **Transform origin 0,0** - Simplifies viewport-centered zoom math
- **Settings pane layout** - Horizontal bar similar to Gantt date controls
- **Priority vs Status (UPDATED)** - Status colors always shown (primary). High priority flagged with ⚠️ symbol. Medium/low no indicator.
- **Sort by Priority** - Sort controls in settings pane, maintains hierarchy
- **Assignment hierarchy** - Team (group) → Resource (individual)
- **Export priorities** - Kanban and Gantt are most important

### Architecture Notes
- Mind Map state stored at app level (not TaskStore)
- State persistence uses `undefined` as sentinel for "use defaults"
- Recursive descendant collection for "expand/collapse all"
- **NEW:** Settings will use localStorage for persistence
- **NEW:** Team/Resource hierarchy in task metadata
- **NEW:** Project grouping via tags or multiple roots (TBD)

### User Preferences
- Prefers keyboard-first UX
- Wants undo over confirmation dialogs
- Likes inline editing (no modals)
- Values visual feedback and clarity
- Wants view-specific settings (not global catch-all)
- Needs assignment filtering across all views
- Values data portability and migration from other tools

---

## 🎯 Quick Wins (Easy to Implement)

- [ ] Add tooltip on hover for Mind Map nodes (show full title if truncated)
- [ ] Add node count badge on collapsed nodes (show how many hidden)
- [ ] Add "Expand All" / "Collapse All" global buttons in Mind Map controls
- [ ] Add auto-save indicator ("Last saved: 2 minutes ago")
- [ ] Add task count in each Kanban column header

---

## 🔮 Long-term Vision

- Real-time collaboration (would require backend)
- Mobile app version
- Offline support with sync
- Team workspaces
- User authentication
- Cloud storage integration
