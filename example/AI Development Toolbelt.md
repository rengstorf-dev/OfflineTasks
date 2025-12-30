## Complete Workflow for Hobby-Scale Projects 

---
 
## 🎯 Core Principle

**Separate exploration from execution. Use fresh chats for each phase to prevent context pollution.**
 

---

  
## 🏷️ Optional: Project Type Context Primers

  
If you already know your project category, add this to your Phase 1 prompt for more focused questions:

  
```

PROJECT TYPE: [choose one]

- Web Application (browser-based app with frontend/backend)

- CLI Tool (command-line utility)

- API Service (backend only, no UI)

- Mobile App (iOS/Android application)

- Chrome Extension (browser extension)

- Desktop App (Electron/Tauri application)

- Static Site (marketing site, blog, portfolio)

- Automation Script (workflow automation, data processing)

```

  
**Not required** - AI will figure it out through questions, but this speeds up Phase 1.  

---
 
## 📋 The 4-Phase Workflow

  
### **Phase 1: Discovery & Ideation**

*Goal: Refine your idea through AI collaboration*  
**Tool:** Claude.ai (new chat)  
**Duration:** 15-30 minutes

#### Meta Prompt:

```

I have a project idea but need help refining it.

  

MY INITIAL IDEA:

[Describe your rough concept - even if vague]

  

YOUR ROLE:

- Ask me probing questions to clarify the vision

- Help me identify what I actually need vs. want

- Point out things I haven't considered

- Challenge assumptions

- Suggest alternatives I might not know about

  

Ask questions one at a time. Be Socratic. Help me think through capturing all potential elements of the idea.



```

  
#### Order of Operations:

1. Paste meta prompt with your rough idea
2. Answer AI's questions honestly (including "I don't know")
3. Let AI guide you through: purpose → users → core features → constraints
4. Continue until you have clarity on what you're actually building
5. **Save the final summary AI provides**  

---

  

### **Phase 2: Technical Planning**

*Goal: Determine architecture, tech stack, and implementation approach*  

**Tool:** Claude.ai (NEW chat - don't continue Phase 1)  

**Duration:** 20-40 minutes  

#### Meta Prompt:

```

I need help planning the technical implementation of my project.

  

PROJECT SUMMARY:

[Paste the summary from Phase 1]

  

MY TECHNICAL BACKGROUND:

- Experience level: [beginner/intermediate/advanced]

- Languages I know: [list]

- Frameworks I've used: [list]

- What I want to learn: [list or "whatever works best"]

  

YOUR ROLE:

- Recommend the best tech stack for this project

- Explain trade-offs between options

- Ask about my preferences (hosting, database, etc.)

- Identify technical challenges I should know about

- Suggest tools and libraries

- Create a high-level architecture

  

Ask me questions to understand my constraints and preferences.

Start by asking about my deployment preferences and timeline.

```

  
#### Order of Operations:

1. Paste meta prompt with Phase 1 summary

2. Answer questions about your technical preferences

3. Review AI's tech stack recommendations

4. Discuss trade-offs if unsure

5. Ask AI: "Based on this, create a project architecture document"

6. **Save the architecture document**

  

---


### **Phase 3: Requirements Definition**

*Goal: Create a crystal-clear specification for implementation*  

**Tool:** Claude.ai (NEW chat)  

**Duration:** 15-30 minutes  

#### Meta Prompt:

```

Create a complete requirements document for my project.

  

PROJECT SUMMARY:

[Paste from Phase 1]

  

TECHNICAL PLAN:

[Paste from Phase 2]

  

YOUR ROLE:

- Break down the project into specific, buildable features

- Prioritize features (MVP vs. nice-to-have)

- Define the exact file structure needed

- List all components/modules required

- Identify what content I need to provide

- Create a step-by-step build order

- **Create a "Manual Setup Checklist" for infrastructure I need

  to configure (hosting, databases, API keys, etc.)**

  

Ask me questions (be Socratic, one at a time) to fill gaps, then generate:

1. A complete requirements document

2. A "Manual Setup Checklist" of things I must do before Phase 4

3. An implementation meta prompt for Phase 4

```
 

#### Order of Operations:

1. Paste meta prompt with Phase 1 & 2 outputs

2. Answer clarifying questions

3. Review the feature breakdown

4. Request: "Generate the Manual Setup Checklist and implementation meta prompt"

5. **Save both documents** (checklist first, then implementation prompt)

  

---

  
### **Phase 4: Implementation**

*Goal: Build the actual project*  

**Tool:** Cursor/Windsurf (recommended) OR Claude.ai (NEW chat)  

**Duration:** 2-8 hours (mostly AI work)

  

#### BEFORE PHASE 4: Complete Your Manual Setup Checklist

**⚠️ DO THIS FIRST:** Review the checklist from Phase 3 and complete all items.

  

Common setup tasks:

- Sign up for hosting (Vercel, Netlify, Railway, etc.)

- Create database (Supabase, PlanetScale, MongoDB Atlas)

- Set up storage (Cloudflare R2, AWS S3, Vercel Blob)

- Get API keys (OpenAI, Stripe, SendGrid, etc.)

- Configure domains/DNS (if needed)

- Create environment variable template

  

**Save all credentials** in a secure location (password manager).

  

---

  

#### Meta Prompt:

```

[Paste the EXACT meta prompt that Phase 3 generated]

  

Additional instructions:

- Generate complete, production-ready code

- Create all files with proper structure

- Follow best practices for [tech stack]

- When you need credentials/keys, I'll provide them in this format:

  - DATABASE_URL=<I'll provide>

  - API_KEY=<I'll provide>

- Ask questions ONLY for specific content you need from me

  (like my name, API keys, specific text, images, etc.)

  

Do not explain concepts unless I ask. Just build.

  

Ready? Start with the project setup and configuration files.

```

  

#### Order of Operations:

1. **If using Cursor/Windsurf:**

   - Create project folder

   - Open in IDE

   - Paste meta prompt in AI chat

   - Let AI create files directly

   - Review and run code as it's built

  

2. **If using Claude.ai:**

   - Paste meta prompt

   - AI generates components in artifacts

   - You create files and paste code

   - Test each component as you go

  

3. **Building sequence:**

   - AI creates config files → you verify

   - AI creates base components → you test

   - AI creates features → you provide content

   - AI creates pages → you review

   - Continue until complete

  

4. **Iterating:**

   - "Add [specific feature]"

   - "Fix [specific bug]"

   - "Improve [specific aspect]"

   - Keep requests focused and specific

  

---

  

## 🛠️ Tool Selection Guide

  

### **Choose Your Implementation Tool:**

  

| Tool | Best For | AI Creates Files | Setup Required |

|------|----------|------------------|----------------|

| **Cursor** | Professional workflow, learning | ✅ Yes | Node.js installed |

| **Windsurf** | Similar to Cursor, newer | ✅ Yes | Node.js installed |

| **Bolt.new** | Instant preview, rapid prototyping | ✅ Yes | None (browser) |

| **Replit Agent** | Complete beginners, simple apps | ✅ Yes | None (browser) |

| **Claude.ai** | Learning, no setup, manual control | ❌ No (you copy) | None |

  

**Recommendation for hobbyists:** Start with Claude.ai to learn, move to Cursor for real projects.

  

---

  

## 📝 Quick Reference: When to Start Fresh

  

| Scenario | New Chat? |

|----------|-----------|

| Exploring what to build | ✅ YES - Phase 1 |

| Deciding on tech stack | ✅ YES - Phase 2 |

| Creating requirements | ✅ YES - Phase 3 |

| Starting implementation | ✅ YES - Phase 4 |

| Adding a small feature | ❌ NO - continue Phase 4 |

| Major pivot or redesign | ✅ YES - back to Phase 2 |

| Debugging specific issue | ❌ NO - continue Phase 4 |

| Building second project | ✅ YES - start at Phase 1 |

  

---

  

## ⚡ Common Mistakes to Avoid

  

1. **❌ Building without planning** → You'll hit walls and restart

2. **❌ Explaining + building in same chat** → Context pollution

3. **❌ Not saving phase outputs** → You'll lose important decisions

4. **❌ Vague implementation prompts** → AI produces generic code

5. **❌ Asking "what should I build?"** → Start with YOUR idea first

6. **❌ Skipping the Manual Setup Checklist** → Phase 4 will fail when AI needs credentials

7. **❌ Committing credentials to git** → Security risk; use .env files

  

---

  

## 🔧 Who Does What: AI vs. You

  

### AI Handles:

- ✅ Code generation (all of it)

- ✅ File structure and organization

- ✅ Best practice recommendations

- ✅ Architecture decisions

- ✅ Component implementation

- ✅ Configuration files (with your credentials)

- ✅ Deployment instructions

  

### You Handle:

- 🔑 Signing up for services (hosting, databases, APIs)

- 🔑 Payment/billing for services

- 🔑 Creating accounts and getting API keys

- 🔑 Configuring DNS/domains

- 🔑 Providing credentials to AI (securely)

- 🔑 Running terminal commands AI suggests

- 🔑 Final deployment clicks

- 🔑 Testing and providing feedback

  

**Rule of thumb:** If it requires a credit card or logging into a service, you do it. Everything else, AI does it.

  

---

  

## 🎓 Example Flow: Building a Habit Tracker

  

```

Phase 1 (Discovery):

You: "I want to build something to track my habits"

AI: "What specific habits? Daily/weekly? What's the goal?"

→ Output: "Simple daily habit tracker with streaks and stats"

  

Phase 2 (Planning):

You: [paste Phase 1 output]

AI: "Let's use Next.js + Supabase. Here's why..."

→ Output: Architecture doc with tech decisions

  

Phase 3 (Requirements):

You: [paste Phase 1 & 2]

AI: Creates detailed feature list, file structure, AND checklist:

    "You need to: 1) Sign up for Supabase 2) Create tables 3) Get API keys"

→ Output: Implementation meta prompt + Manual Setup Checklist

  

Phase 3.5 (Manual Setup - YOU DO THIS):

→ Sign up for Supabase

→ Create database tables

→ Get anon and service keys

→ Save credentials

Time: 20 minutes

  

Phase 4 (Build):

You: [paste meta prompt + provide credentials when asked]

AI: Creates entire app, asks for your habit names/icons

→ Output: Working habit tracker app

  

Total time: ~4 hours (AI work) + 20 min (your setup)

```

  

---

  

## 💾 What to Save Between Phases

  

Create a `project-notes.md` file:

  

```markdown

# [Project Name]

  

## Phase 1: Discovery Summary

[Paste AI's final summary]

  

## Phase 2: Technical Architecture

[Paste tech stack decisions and architecture]

  

## Phase 3A: Manual Setup Checklist

### Infrastructure I Need to Configure:

- [ ] Hosting: [service name] - [what to set up]

- [ ] Database: [service name] - [what to set up]

- [ ] Storage: [service name] - [what to set up]

- [ ] API Keys: [list of services]

- [ ] Other: [domain, email service, etc.]

  

### Credentials (DO NOT COMMIT):

Store separately in password manager:

- DATABASE_URL=

- API_KEY=

- [etc.]

  

## Phase 3B: Implementation Prompt

[Paste the meta prompt for Phase 4]

  

## Phase 4: Build Notes

- Started: [date]

- Progress: [track major milestones]

- Issues: [note blockers]

```

  

---

  

## 🚀 Pro Tips

  

1. **Be specific in Phase 4**: "Add a dark mode toggle" > "make it look better"

2. **Ask for explanations separately**: Don't mix "build this" with "explain how this works"

3. **Test incrementally**: Don't wait until everything is built to test

4. **Use anchored context in Phase 4**: Set coding standards once at the start

5. **Save working versions**: Commit to git before major changes

  

---

  

## 📊 Success Metrics

  

You're doing it right if:

- ✅ Each chat has a single, clear purpose

- ✅ AI asks YOU questions in Phases 1-2

- ✅ AI confidently builds in Phase 4 without confusion

- ✅ You're reviewing code, not writing it

- ✅ You finish projects instead of abandoning them

  

---

  

## 🔄 When to Loop Back

  

- **New feature?** → Stay in Phase 4, add it

- **Tech stack not working?** → Back to Phase 2

- **Pivot the concept?** → Back to Phase 1

- **Confused about what to build next?** → Back to Phase 3

  

---

  

## 🚧 Common Roadblocks & Solutions

  

### **Roadblock 1: "The code doesn't work when I run it"**

  

**Symptoms:**

- Import errors, missing dependencies

- "Module not found" errors

- Code runs in artifact but not locally

  

**Solution:**

In Phase 4, after AI generates code:

```

Prompt: "I got this error: [paste exact error]

What command should I run to fix it?"

  

AI will tell you: npm install [package], or fix the import

```

  

**Prevention:** Ask AI in Phase 3: "Create a setup script that installs all dependencies"

  

---

  

### **Roadblock 2: "AI forgot what we built 20 messages ago"**

  

**Symptoms:**

- AI suggests rebuilding something that exists

- AI asks questions you already answered

- Code quality degrades over time

  

**Solution A - Context Refresh:**

```

Prompt: "Here's what we've built so far:

- Hero component ✅

- Navigation ✅

- Projects section ✅

  

Currently working on: Contact form

What's next?"

```

  

**Solution B - Start Fresh (for major additions):**

- Save your current code

- New chat with: "I have an existing [project]. Here's the code: [paste key files]. I need to add [feature]."

  

**Prevention:** Keep messages focused. One feature per conversation thread.

  

---

  

### **Roadblock 3: "I don't understand the code AI generated"**

  

**Symptoms:**

- Can't modify the code yourself

- Don't know what files do what

- Stuck when something breaks

  

**Solution - Separate Learning Chat:**

Open a NEW chat (don't pollute Phase 4):

```

Prompt: "Explain this code to me like I'm learning:

[paste the confusing code]

  

Break down:

- What each part does

- Why it's structured this way

- What I'd change to add [feature]"

```

  

**Prevention:** In Phase 4 meta prompt, add: "Add code comments explaining complex logic"

  

---

  

### **Roadblock 4: "The design looks amateur/generic"**

  

**Symptoms:**

- Basic, unstyled components

- Looks like a template

- Not visually appealing

  

**Solution:**

```

Prompt: "Review the current design and make it more

professional. Add:

- Modern color palette

- Smooth animations

- Better spacing and typography

- Visual hierarchy

Show me the updated Hero component first."

```

  

**Pro tip:** Provide design references: "Make it look like [website URL]" or "Use this color palette: [hex codes]"

  

**Prevention:** In Phase 1, explicitly mention: "I want this to look professional and modern, not like a basic template"

  

---

  

### **Roadblock 5: "AI is generating different styles/patterns across components"**

  

**Symptoms:**

- Button styling inconsistent

- Some components use different state management

- Mix of coding patterns

  

**Solution - Create Design System First:**

```

Phase 4, Message 1: "Before we build features, create:

1. A design tokens file (colors, spacing, fonts)

2. Reusable UI components (Button, Input, Card)

3. A coding pattern guide for this project

  

Then we'll use these consistently."

```

  

**Prevention:** Ask for this in Phase 3 requirements

  

---

  

### **Roadblock 6: "I need to integrate a service AI doesn't know about"**

  

**Symptoms:**

- New API, niche service, recent tool

- AI hallucinates the API structure

  

**Solution:**

```

Prompt: "I need to integrate [Service Name].

Here's their documentation: [paste key parts or URL]

  

Based on this, show me how to:

1. Set up authentication

2. Make a basic API call

3. Handle errors"

```

  

**If URL:** Use web_fetch: "Read this documentation and integrate: [URL]"

  

**Prevention:** In Phase 2, ask: "Is [service] commonly used? Will you need documentation?"

  

---

  

### **Roadblock 7: "The app works locally but deployment fails"**

  

**Symptoms:**

- Works on your machine

- Errors on Vercel/Netlify

- Environment variables not working

  

**Solution:**

```

Prompt: "My deployment failed with this error: [paste]

  

Current setup:

- Hosting: [platform]

- Environment variables: [list names, not values]

- Build command: [what you're using]

  

What's wrong?"

```

  

**Prevention:** In Phase 3, ask AI to create:

- `.env.example` file (template for environment variables)

- `DEPLOYMENT.md` with step-by-step deployment instructions

- Platform-specific config files (vercel.json, netlify.toml)

  

---

  

### **Roadblock 8: "I want to change something but don't know where the code is"**

  

**Symptoms:**

- Can't find which file controls a feature

- Project structure confusing

- Wasting time searching

  

**Solution:**

```

Prompt: "I want to change [specific thing on screen].

Which file(s) do I need to modify?"

  

AI: "That's in src/components/Hero.tsx, line 45"

```

  

**Prevention:** In Phase 3, ask for: "Create a CODEBASE.md that maps features to files"

  

---

  

### **Roadblock 9: "AI keeps adding features I didn't ask for"**

  

**Symptoms:**

- Code becomes bloated

- Unnecessary complexity

- Features you won't use

  

**Solution:**

```

Prompt: "Stop. Build ONLY what I ask for.

Remove any extra features or complex abstractions.

Keep it simple. Here's what I actually need: [list]"

```

  

**Prevention:** In Phase 4 meta prompt, add: "Build minimally. Only implement features I explicitly request. Prefer simple over clever."

  

---

  

### **Roadblock 10: "I'm stuck between phases"**

  

**Symptoms:**

- Finished Phase 2 but not sure if ready for Phase 3

- Requirements feel incomplete

- Unsure if planning is "done"

  

**Solution - Readiness Checklist:**

  

**After Phase 1, ask:** "Do I clearly understand: what problem this solves, who it's for, and what the 3 core features are?"

  

**After Phase 2, ask:** "Do I know: what tech stack we're using, why we chose it, and what services I'll need?"

  

**After Phase 3, ask:** "Do I have: a complete feature list, a manual setup checklist, and an implementation prompt?"

  

If no to any → ask AI more questions in that phase

  

**Prevention:** At end of each phase, ask AI: "Is this phase complete? What questions should I answer before moving to Phase [next]?"

  

---

  

### **Roadblock 11: "The project is taking way longer than expected"**

  

**Symptoms:**

- Thought it'd be 2 hours, it's day 3

- Scope keeps growing

- No end in sight

  

**Solution - Reality Check:**

```

New chat: "I'm building [project]. Here's what I have so far: [summary]

Here's what's left: [list]

  

Honestly, how much longer will this take?

What should I cut to ship faster?"

```

  

AI will help you prioritize MVP vs nice-to-have

  

**Prevention:** In Phase 1, explicitly ask: "What's the absolute minimum version that provides value? Let's build that first."

  

---

  

### **Roadblock 12: "I need to share my project but credentials are hardcoded"**

  

**Symptoms:**

- API keys in code

- Can't push to GitHub safely

- Don't know how to handle secrets

  

**Solution:**

```

Prompt: "I need to move all credentials to environment variables.

Show me:

1. How to create .env file

2. How to update code to use process.env

3. What to add to .gitignore

4. How to set env vars on [hosting platform]"

```

  

**Prevention:** Phase 3 checklist should include: "Create .env.example and .gitignore files"

  

---

  

### **Roadblock 13: "AI is too verbose / not verbose enough"**

  

**Symptoms:**

- AI explains everything (you just want code)

- OR: AI gives no context (you need explanation)

  

**Solution - Set Communication Style:**

```

For less talk: "From now on: code first, brief explanations

only if I ask. No preambles."

  

For more context: "Explain your decisions. Before writing code,

tell me what you're building and why."

```

  

**Prevention:** Add to Phase 4 meta prompt: "Communication style: [concise/detailed]"

  

---

  

### **Roadblock 14: "The artifact/code is too long to copy-paste"**

  

**Symptoms:**

- AI generates 500+ line files

- Artifact gets truncated

- Hard to manage large components

  

**Solution:**

```

Prompt: "That file is too large. Split it into:

1. Main component

2. Helper functions (separate file)

3. Type definitions (separate file)

  

Show me each file separately."

```

  

**Prevention:** In Phase 4: "Keep files under 200 lines. Split into smaller modules."

  

---

  

### **Roadblock 15: "I want to learn, not just copy-paste"**

  

**Symptoms:**

- Building fast but not understanding

- Can't modify code confidently

- Worried about being dependent on AI

  

**Solution - Hybrid Approach:**

```

Phase 4: Build normally, but after each component:

  

New learning chat: "I just built [component].

Teach me:

- What are the key concepts here?

- What would break if I changed [X]?

- How would I add [related feature]?

  

Use the code as a teaching example."

```

  

**Also:** After finishing project, ask AI: "Create a tutorial that teaches someone how to build this from scratch, step by step."

  

---

  

## 🎯 Emergency Shortcuts

  

### "I'm completely stuck and frustrated"

```

1. Take a break (seriously)

2. New chat: "I'm stuck. Here's my project: [paste summary]

   Here's the issue: [describe problem]

   What's the fastest path forward?"

3. AI will usually find a simple solution you missed

```

  

### "I want to start over but keep some code"

```

1. Save your good components to a "components-to-keep" folder

2. Fresh Phase 4 chat

3. "Build [project]. I already have these components: [list]

   Integrate them and build the rest."

```

  

### "The AI is hallucinating / making up APIs"

```

Prompt: "Stop. You're hallucinating.

Search the actual documentation for [service] and use the real API.

Here's the official docs: [URL]"

```

  

Use web_fetch if needed: AI will read the real docs.

  

---

  

**Remember: Every roadblock is solvable. When stuck, start a fresh chat and ask AI how to fix it. The key is recognizing when to power through vs. when to reset.**