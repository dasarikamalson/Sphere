# KronoSphere — Open-Source Multi-Project Execution, Six Sigma (DMAIC), Real-Time Messaging & Enterprise RAG Suite

**KronoSphere** is a production-grade, open-source multi-project management, critical-path scheduling, time-tracking, **Lean Six Sigma (DMAIC)** quality control, **Slack-style real-time collaboration**, and **Retrieval-Augmented Generation (RAG)** platform built with **React 19**, **TypeScript**, **WebSockets (`ws`)**, **Gemini (`@google/genai`)**, and **Node.js / Express**.

Designed with an ultra-clean **Black & White monochrome architectural interface** and exclusive **Inter** typography (`tabular-nums`), KronoSphere ships with **zero pre-populated demo data** and includes an **Advanced First-Load Enterprise Installation & Provisioning Wizard**.

---

## Core Capabilities

### 1. Advanced First-Load Installation & Multi-Project Portfolio Engine
- **4-Step Enterprise Setup System**: Launches on initial boot (`SetupInstallerModal.tsx`) to provision:
  1. **Organization Identity, AES-GCM-256 Vault & Target Six Sigma Level ($3.0\sigma$–$6.0\sigma$)**
  2. **Root Administrator & Role-Based User Accounts (RBAC Directory)**
  3. **Multi-Project Portfolio** across **Construction & Civil**, **Event Production**, **Tech Development**, and **Manufacturing & Ops**
  4. **Slack-Style Collaboration Channels & Initial RAG Knowledge Base**
- **Multi-Project Isolation & Portfolio Switching**: Switch instantaneously between projects in the global control bar or Dashboard portfolio strip while retaining cross-project RAG search.

### 2. Six Sigma DMAIC Methodology Panel & Statistical Quality Control
- **Interactive DMAIC Methodology & Tool Mapping Panel (`DashboardView.tsx`)**:
  - Designed for non-technical users, explaining in plain language how **Define, Measure, Analyze, Improve, and Control** map directly to KronoSphere modules, complete with sector-specific playbooks and 1-click navigation links.
- **Live DPMO, Sigma Level ($\sigma$), First-Pass Yield (%) & $C_{pk}$**:
  $$\text{DPMO} = \frac{\sum D}{\sum O} \times 1,000,000$$

### 3. Drag-and-Drop Priority Reordering (`priorityIndex`) & Cycle-Safe DAG
- **Interactive Priority Matrix**: Drag and drop tasks to reorder execution priority, automatically recalculating sequential `priorityIndex` values (`0..n-1`) in state.
- **Cycle-Safe Dependency Graph (DAG) & Critical Path Method (CPM)**: Prevents circular dependencies (`hasDependencyCycle`) and computes Earliest Start (`ES`), Earliest Finish (`EF`), and zero-slack critical chains.

### 4. Slack-Type Real-Time WebSocket Channels & Hybrid Gemini RAG Copilot
- **Real-Time Team Messaging (`/ws` WebSocket Server)**:
  - Public and private channels (`#general`, `#dmaic-quality-gates`, `#critical-path-alerts`, plus custom channels), threaded replies, reaction counters, and inline `/rag <query>` commands.
- **Enterprise RAG (Retrieval-Augmented Generation)**:
  - Automatically indexes all **Projects**, **Tasks**, **Milestones**, **Slack Channel Messages**, **Uploaded SOP / Charter Documents**, and the **DMAIC Methodology Guide**.
  - Combines deterministic **BM25 + keyword overlap retrieval** (`retrieveRelevantChunks`) with server-side **Gemini 3.8 Flash** synthesis (`POST /api/rag/query`) and verified `[SourceCode]` citations.

### 5. Role-Based User Authentication (RBAC), Workflow Automations & E2E Vault
- **User Directory & Session Authentication**: Provision user accounts with roles (`Admin`, `Project Lead`, `Contributor`, `Auditor`), security PIN verification, and live session switching.
- **Web Crypto AES-GCM-256 Vault**: Client-side `PBKDF2` + `AES-GCM-256` encrypted cloud backups and offline mutation queuing.

---

## System Architecture

```text
├── server.ts                                # Express API, WebSocket (/ws) server & @google/genai RAG endpoint
├── src/
│   ├── App.tsx                              # Multi-project state container, WebSocket client & navigation shell
│   ├── types/project.ts                     # Domain types (ProjectEntity, Task, DMAIC, RBAC, Channels, RAG)
│   ├── data/seedData.ts                     # Clean zero-demo initial state with first-load installer flag
│   ├── utils/
│   │   ├── projectEngine.ts                 # Pure logic: priorityIndex, DMAIC guide, BM25 RAG, CPM, AES-GCM
│   │   └── projectEngine.test.ts            # Node:test unit suite covering all pure domain algorithms
│   └── components/
│       ├── SetupInstallerModal.tsx          # 4-step First-Load Enterprise Installation & Setup Wizard
│       ├── DashboardView.tsx                # Executive KPIs, DMAIC Methodology Panel & Multi-Project Switcher
│       ├── TasksAndDependenciesView.tsx     # Drag-and-drop priorityIndex matrix, Kanban & DAG linker
│       ├── CollaborationAndRagView.tsx      # Slack-style real-time channels, SOP ingestion & RAG Copilot
│       ├── TimeTrackingAndReportsView.tsx   # Chronometer, timesheets, SVG charts & PDF 1.4 / CSV exports
│       └── AutomationAndSecurityView.tsx    # User Auth directory, 4-tier RBAC matrix, Automations & Vault
```

---

## Getting Started & Production Deployment

```bash
# 1. Install dependencies
npm install

# 2. Run the unit test suite (11 tests)
npx tsx --test src/utils/projectEngine.test.ts

# 3. Start full-stack dev server (Express + Vite + WebSocket on port 3000)
npm run dev

# 4. Build for production
npm run build

# 5. Start production server
npm start
```

---

## License
Released under the **Apache-2.0 License**.
