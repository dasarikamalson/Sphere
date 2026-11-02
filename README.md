# KronoSphere — Open-Source Enterprise Project Execution, Time Intelligence & Lean Six Sigma (DMAIC) Platform

**KronoSphere** is a production-grade, open-source project management, critical-path scheduling, time-tracking, and **Lean Six Sigma (DMAIC)** quality control platform built with **React 19**, **TypeScript**, **Three.js**, and **Node.js / Express**.

Designed with an ultra-clean **Black & White monochrome architectural interface** and exclusive **Inter** typography (`tabular-nums`), KronoSphere ships with **zero pre-populated demo data** so engineering, construction, event production, and operations teams can immediately initialize clean production programs.

---

## Key Capabilities

### 1. Multi-Industry Real-World Operational Templates
KronoSphere adapts across mission-critical operational verticals:
- **Construction & Civil Engineering**: Structural structural pours, MEP rough-ins, safety inspections, crane/rigging critical paths, and punch-list defect tracking.
- **Event Production & Live Broadcast**: Stage rigging, AV/lighting signal verification, vendor load-in windows, pyrotechnics safety sign-off, and run-of-show synchronization.
- **Tech Application Development**: Distributed system architecture, API security audits, zero-downtime database migrations, CI/CD release gates, and SLA regression tracking.
- **Manufacturing & Operations**: Supply-chain qualification, assembly line takt-time optimization, statistical process control (SPC), and ISO compliance audits.

### 2. Lean Six Sigma (DMAIC) & Process Capability Engine
Every deliverable is mapped to a **DMAIC Phase** (`Define`, `Measure`, `Analyze`, `Improve`, `Control`) and tracks **Defects ($D$)** alongside **Inspection Opportunities per Unit ($O$)**:
- **DPMO (Defects Per Million Opportunities)**:
  $$\text{DPMO} = \frac{\sum D}{\sum O} \times 1,000,000$$
- **Sigma Level ($\sigma$)**: Automatically interpolated with the standard $1.5\sigma$ long-term process shift (up to $6.0\sigma$ world-class quality at $\le 3.4\text{ DPMO}$).
- **First-Pass Yield (%) & Process Capability Index ($C_{pk}$)**: Live calculation of process capability and phase-by-phase DMAIC gate distribution.

### 3. Drag-and-Drop Priority Reordering (`priorityIndex`) & DAG Critical Path
- **Interactive Priority Queue**: Drag and drop tasks directly within the **Priority Order & DAG Table** (or use accessible keyboard/step controls) to reorder execution priority. Every reorder operation deterministically recalculates sequential `priorityIndex` values (`0..n-1`) across the application state and persists immediately.
- **Cycle-Safe Dependency Graph (DAG)**: Adding upstream task dependencies runs a depth-first cycle detector (`hasDependencyCycle`) before committing, preventing circular schedules.
- **Critical Path Method (CPM)**: Automatically computes forward-pass Earliest Start (`ES`), Earliest Finish (`EF`), total project duration, and slack floats across all tasks.

### 4. Interactive 3D Spatial Topology Studio (Three.js WebGL)
- Renders the live DMAIC 5-stage architectural monuments (`Define` through `Control`) alongside composite 3D task nodes and overhead dependency arcs in real time.
- Supports click-to-inspect raycasting, camera preset orchestration, and software-WebGL frame pacing (`window.__advance3D`).

### 5. Integrated Chronometer, Automated Reporting & Exports
- **Live Task Stopwatch & Manual Timesheets**: Track billable and non-billable engineering hours directly against tasks.
- **RFC-4180 CSV & Spec-Compliant PDF 1.4 Generator**: One-click export of executive project analytics, `PriorityIndex` schedules, Six Sigma DPMO metrics, and audit logs.

### 6. Granular Role-Based Access Control (RBAC), Workflow Automation & E2E Encryption
- **4-Tier Permission Matrix**: Live toggleable capabilities across `Admin`, `Manager`, `Contributor`, and `Viewer` roles.
- **Event-Driven Automation Engine**: Automatically executes status escalations, tag assignments, and real-time notifications when task states or schedules change.
- **Offline Queue & Web Crypto AES-GCM-256 Vault**: Full offline mutation queuing with automatic cloud reconciliation and client-side `PBKDF2` (100,000 iterations, SHA-256) + `AES-GCM-256` encrypted backup bundles.

---

## System Architecture

```text
├── server.ts                              # Express full-stack API server & persistent JSON store
├── src/
│   ├── App.tsx                            # Root state container, offline sync queue & navigation shell
│   ├── types/project.ts                   # Core TypeScript domain models (Task, DMAIC, RBAC, Vault)
│   ├── data/seedData.ts                   # Clean zero-demo production state initializer
│   ├── utils/
│   │   ├── projectEngine.ts               # Pure business logic: priorityIndex, DAG CPM, Six Sigma, PDF/CSV, AES-GCM
│   │   └── projectEngine.test.ts          # Node:test suite covering all pure domain algorithms
│   └── components/
│       ├── DashboardView.tsx              # Executive KPIs, Six Sigma DMAIC control & customizable widgets
│       ├── TasksAndDependenciesView.tsx   # Drag-and-drop priorityIndex table, Kanban & DAG inspector
│       ├── TopologyScene3D.tsx            # Three.js WebGL 3D DMAIC & dependency topology visualizer
│       ├── TimeTrackingAndReportsView.tsx # Chronometer, timesheets, SVG charts & PDF/CSV exports
│       └── AutomationAndSecurityView.tsx  # Workflow triggers, RBAC permission matrix & AES-GCM-256 vault
```

---

## Getting Started & Production Deployment

### Prerequisites
- **Node.js** `>= 20.x`
- **npm** `>= 10.x`

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Unit & Domain Logic Tests
Verify the drag-and-drop `priorityIndex` engine, DAG cycle detection, Critical Path Method, Six Sigma DPMO calculator, RBAC matrix, and Web Crypto AES-GCM-256 encryption:
```bash
npx tsx --test src/utils/projectEngine.test.ts
```

### 3. Start Full-Stack Development Server
Starts the Express backend and Vite frontend middleware on port `3000`:
```bash
npm run dev
```

### 4. Build for Production
Compiles the TypeScript and Vite production bundle to `dist/`:
```bash
npm run build
```

### 5. Run in Production
```bash
npm start
```

---

## REST API Endpoints (`server.ts`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Returns server status, encryption specification, and timestamp. |
| `GET` | `/api/workspace` | Retrieves the current persisted workspace state. |
| `POST` | `/api/sync` | Persists workspace mutations and reconciles offline queues. |
| `POST` | `/api/reset` | Resets the workspace to a clean zero-data production state. |
| `GET` | `/api/backups` | Lists encrypted AES-GCM-256 backup snapshots (metadata only). |
| `POST` | `/api/backups` | Stores a new client-side encrypted AES-GCM-256 backup bundle. |

---

## License
Released under the **Apache-2.0 License**.
