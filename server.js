var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_ws = require("ws");
var import_vite = require("vite");
var import_genai = require("@google/genai");

// src/data/seedData.ts
var INITIAL_WORKSPACE_STATE = {
  isSetupComplete: false,
  organizationName: "KronoSphere Enterprise",
  organizationDomain: "enterprise.local",
  targetSigmaLevel: 6,
  activeProjectId: "prj-default-1",
  projects: [
    {
      id: "prj-default-1",
      name: "Production Program Alpha",
      code: "PRJ-001",
      industrySector: "Tech Development",
      description: "Primary operational execution program governed by Six Sigma DMAIC quality gates.",
      targetSigmaLevel: 6,
      leadName: "System Administrator",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ],
  currentUserId: "usr-admin-1",
  projectName: "Production Program Alpha",
  projectCode: "PRJ-001",
  industrySector: "Tech Development",
  encryptionKeyFingerprint: "SHA256:E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855",
  lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString(),
  members: [
    {
      id: "usr-admin-1",
      name: "System Administrator",
      role: "Admin",
      title: "Master Black Belt & Principal Architect",
      department: "Quality & Six Sigma",
      email: "admin@enterprise.local",
      initials: "SA",
      avatarHue: 0,
      capacityHoursPerWeek: 40,
      hourlyRate: 150,
      platforms: ["macOS", "Windows", "iOS", "Android"],
      status: "active",
      accessPin: "0000",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ],
  milestones: [],
  tasks: [],
  timeEntries: [],
  automations: [],
  notifications: [],
  files: [],
  channels: [
    {
      id: "chn-general",
      name: "general",
      topic: "Organization-wide operational announcements, cross-project handoffs & daily standups",
      isPrivate: false,
      type: "channel",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "chn-dmaic-gates",
      name: "dmaic-quality-gates",
      topic: "Six Sigma DMAIC phase reviews, DPMO defect root-cause analysis & Cpk control audits",
      isPrivate: false,
      type: "channel",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "chn-critical-path",
      name: "critical-path-alerts",
      topic: "Real-time DAG dependency blockers, priorityIndex escalations & schedule variance",
      isPrivate: false,
      type: "channel",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ],
  messages: [],
  knowledgeDocs: [],
  widgets: [
    {
      id: "dmaic_methodology",
      title: "Six Sigma DMAIC Methodology & Tool Mapping",
      subtitle: "Interactive guide mapping Define, Measure, Analyze, Improve, and Control to KronoSphere workflows",
      visible: true,
      order: 0,
      colSpan: 2
    },
    {
      id: "six_sigma_dmaic",
      title: "Six Sigma DMAIC & Process Capability Control",
      subtitle: "Live DPMO, Sigma Level (\u03C3), Process Yield, and DMAIC phase distribution",
      visible: true,
      order: 1,
      colSpan: 2
    },
    {
      id: "velocity_burndown",
      title: "Execution Velocity & Hours Trajectory",
      subtitle: "Planned vs. delivered hours across active work packages",
      visible: true,
      order: 2,
      colSpan: 2
    },
    {
      id: "milestone_tracker",
      title: "Milestone Gates & Phase Readiness",
      subtitle: "Deliverable gates across Construction, Events, or Tech releases",
      visible: true,
      order: 3,
      colSpan: 1
    },
    {
      id: "department_workload",
      title: "Department & Workstream Allocation",
      subtitle: "Logged vs. estimated hours by operational unit",
      visible: true,
      order: 4,
      colSpan: 1
    },
    {
      id: "critical_alerts",
      title: "Operational & Quality Event Log",
      subtitle: "Real-time milestone, dependency, and Six Sigma quality alerts",
      visible: true,
      order: 5,
      colSpan: 1
    },
    {
      id: "encryption_sync_status",
      title: "Offline Vault & Cross-Platform Sync",
      subtitle: "AES-GCM-256 encryption state across Desktop & Mobile endpoints",
      visible: true,
      order: 6,
      colSpan: 1
    }
  ],
  permissions: {
    Admin: {
      create_task: true,
      update_task: true,
      delete_task: true,
      log_time: true,
      manage_automations: true,
      manage_rbac: true,
      export_reports: true,
      manage_encryption: true
    },
    "Project Lead": {
      create_task: true,
      update_task: true,
      delete_task: true,
      log_time: true,
      manage_automations: true,
      manage_rbac: false,
      export_reports: true,
      manage_encryption: true
    },
    Contributor: {
      create_task: true,
      update_task: true,
      delete_task: false,
      log_time: true,
      manage_automations: false,
      manage_rbac: false,
      export_reports: true,
      manage_encryption: false
    },
    Auditor: {
      create_task: false,
      update_task: false,
      delete_task: false,
      log_time: false,
      manage_automations: false,
      manage_rbac: false,
      export_reports: true,
      manage_encryption: false
    }
  }
};

// src/utils/projectEngine.ts
function computeSixSigmaMetrics(tasks) {
  const phases = ["Define", "Measure", "Analyze", "Improve", "Control"];
  const dmaicBreakdown = phases.map((phase) => {
    const matching = tasks.filter((t) => t.dmaicPhase === phase);
    return {
      phase,
      total: matching.length,
      completed: matching.filter((t) => t.status === "Completed").length,
      defects: matching.reduce((acc, t) => acc + (t.defectsCount || 0), 0)
    };
  });
  const totalOpportunities = tasks.reduce(
    (sum, t) => sum + Math.max(0, t.opportunitiesCount || 0),
    0
  );
  const totalDefects = tasks.reduce(
    (sum, t) => sum + Math.max(0, t.defectsCount || 0),
    0
  );
  if (totalOpportunities === 0) {
    return {
      totalOpportunities: 0,
      totalDefects: 0,
      dpmo: 0,
      yieldPct: 100,
      sigmaLevel: 6,
      cpk: 2,
      dmaicBreakdown
    };
  }
  const clampedDefects = Math.min(totalDefects, totalOpportunities);
  const dpmo = Math.round(clampedDefects / totalOpportunities * 1e6);
  const yieldPct = Number(
    ((totalOpportunities - clampedDefects) / totalOpportunities * 100).toFixed(3)
  );
  let sigmaLevel = 6;
  if (dpmo <= 3.4) sigmaLevel = 6;
  else if (dpmo <= 233) {
    sigmaLevel = 5 + (233 - dpmo) / (233 - 3.4);
  } else if (dpmo <= 6210) {
    sigmaLevel = 4 + (6210 - dpmo) / (6210 - 233);
  } else if (dpmo <= 66807) {
    sigmaLevel = 3 + (66807 - dpmo) / (66807 - 6210);
  } else if (dpmo <= 308537) {
    sigmaLevel = 2 + (308537 - dpmo) / (308537 - 66807);
  } else {
    sigmaLevel = Math.max(1, 2 - (dpmo - 308537) / 691463);
  }
  sigmaLevel = Number(sigmaLevel.toFixed(2));
  const cpk = Number((sigmaLevel / 3).toFixed(2));
  return {
    totalOpportunities,
    totalDefects: clampedDefects,
    dpmo,
    yieldPct,
    sigmaLevel,
    cpk,
    dmaicBreakdown
  };
}
var DMAIC_METHODOLOGY_GUIDE = [
  {
    phase: "Define",
    stepNumber: "01",
    tagline: "Clarify Project Scope, Customer Goals & Priority Order",
    plainLanguageExplanation: "Before starting work, agree on what success looks like, what could go wrong, and which tasks matter most to the client or end user.",
    kronosphereToolMapping: "Use the Multi-Project Portfolio Switcher to charter the project, create Milestone Gates, and assign initial task priority order (priorityIndex) in Tasks & DAG.",
    mappedTab: "tasks",
    mappedFeatureLabel: "Tasks, Milestones & Priority Queue",
    keyOutputs: [
      "Multi-Project Charter & Target Sigma Level (\u03C3)",
      "Critical-To-Quality (CTQ) Milestone Gates",
      "Ranked Task Backlog (priorityIndex #1..#N)"
    ],
    industryExamples: {
      construction: "Define structural blueprint sign-off gates and site safety inspection criteria.",
      events: "Define venue capacity, run-of-show timeline gates, and AV redundancy requirements.",
      tech: "Define API latency SLAs, release acceptance criteria, and security compliance scope.",
      manufacturing: "Define assembly line tolerance specifications and supplier quality standards."
    }
  },
  {
    phase: "Measure",
    stepNumber: "02",
    tagline: "Track Real Effort, Inspection Opportunities & Defect Counts",
    plainLanguageExplanation: "Replace guesswork with real numbers by recording how long tasks actually take and how many quality checks pass or fail.",
    kronosphereToolMapping: "Use the Live Task Chronometer & Manual Timesheets in Time & Reports to measure actual vs. budgeted hours, and record Inspection Opportunities (O) and Defects (D) on each task row.",
    mappedTab: "timetracking",
    mappedFeatureLabel: "Chronometer & Defect/Opportunity Counters",
    keyOutputs: [
      "Actual Logged Hours vs. Estimated Baseline",
      "Inspection Opportunities per Deliverable (O)",
      "Recorded Non-Conformances / Defects (D)"
    ],
    industryExamples: {
      construction: "Measure concrete cure test results and rebar inspection pass/fail counts.",
      events: "Measure soundcheck decibel levels, load-in duration, and ticket scanner error rates.",
      tech: "Measure sprint velocity, QA test pass rates, and production error frequencies.",
      manufacturing: "Measure cycle times, unit weight variance, and batch defect rates."
    }
  },
  {
    phase: "Analyze",
    stepNumber: "03",
    tagline: "Spot Bottlenecks, Schedule Delays & Root Causes of Defects",
    plainLanguageExplanation: "Find out why delays or defects happen by inspecting which tasks block downstream work and which departments are overloaded.",
    kronosphereToolMapping: "Use the Cycle-Safe DAG Dependency Linker & Critical Path Calculator to identify zero-slack bottlenecks, and query the RAG Knowledge Copilot to analyze root causes across team logs.",
    mappedTab: "tasks",
    mappedFeatureLabel: "DAG Dependency Linker & RAG Root-Cause Search",
    keyOutputs: [
      "Critical Path Duration & Blocked Task Chain",
      "Departmental Workload & Cost Burn Variance",
      "RAG-Assisted Root-Cause Synthesis Across SOPs & Channels"
    ],
    industryExamples: {
      construction: "Identify how delayed MEP permit approvals block drywall and finishing trades.",
      events: "Analyze why stage rigging delays cascade into lighting focus and dress rehearsal.",
      tech: "Trace how database schema bottlenecks block API integration and frontend QA.",
      manufacturing: "Analyze which upstream tooling station causes downstream assembly defects."
    }
  },
  {
    phase: "Improve",
    stepNumber: "04",
    tagline: "Resequence Priorities, Coordinate in Channels & Automate Fixes",
    plainLanguageExplanation: "Fix bottlenecks immediately by dragging high-impact fixes to the top of the queue, coordinating in team channels, and automating escalations.",
    kronosphereToolMapping: "Drag and drop rows in the Priority Matrix to update priorityIndex in real time, coordinate rapid fixes in Slack-style Channels, and enable Workflow Automation Rules.",
    mappedTab: "collaboration",
    mappedFeatureLabel: "Drag-and-Drop Priority & Team Channels",
    keyOutputs: [
      "Reordered Task Priority Queue (Auto-Updated priorityIndex)",
      "Automated Escalation & Reassignment Triggers",
      "Cross-Functional Channel Resolutions & SOP Updates"
    ],
    industryExamples: {
      construction: "Reprioritize crane scheduling and dispatch rapid remediation crew via #field-ops.",
      events: "Reorder load-in dock sequence and alert stagehands in #dmaic-quality-gates.",
      tech: "Move hotfix to priorityIndex #1 and auto-assign blocked tickets to principal engineers.",
      manufacturing: "Adjust machine calibration parameters and update operator SOP in the RAG index."
    }
  },
  {
    phase: "Control",
    stepNumber: "05",
    tagline: "Lock In Quality with Live DPMO, RBAC Governance & Encrypted Audits",
    plainLanguageExplanation: "Keep the process running smoothly over time with automated quality scorecards, role permissions, and tamper-proof backups.",
    kronosphereToolMapping: "Monitor the Six Sigma DPMO / Sigma Level (\u03C3) / Cpk scorecard on the Dashboard, enforce 4-tier RBAC permissions, and seal snapshots in the AES-GCM-256 Encrypted Vault.",
    mappedTab: "automation",
    mappedFeatureLabel: "Six Sigma Control Scorecard, RBAC & AES-GCM Vault",
    keyOutputs: [
      "Live DPMO, First-Pass Yield (%) & Process Capability (Cpk)",
      "Role-Based Access Control (Admin, Project Lead, Contributor, Auditor)",
      "Exportable PDF 1.4 / CSV Audit Reports & Encrypted Snapshots"
    ],
    industryExamples: {
      construction: "Enforce final building code sign-offs and archive encrypted inspection logs.",
      events: "Lock run-of-show changes to Project Leads and export post-event quality metrics.",
      tech: "Enforce release gate approvals and maintain 6\u03C3 (\u22643.4 DPMO) production stability.",
      manufacturing: "Maintain Statistical Process Control (Cpk \u2265 1.33) and ISO audit readiness."
    }
  }
];
function tokenizeText(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length >= 2);
}
function buildRagCorpus(workspace) {
  const chunks = [];
  for (const proj of workspace.projects || []) {
    chunks.push({
      id: `rag-proj-${proj.id}`,
      sourceType: "project",
      sourceCode: proj.code,
      title: `Project ${proj.code}: ${proj.name}`,
      content: `Project ${proj.name} (${proj.code}) in sector ${proj.industrySector}. Lead: ${proj.leadName}. Target Sigma Level: ${proj.targetSigmaLevel}\u03C3. Description: ${proj.description}`,
      projectId: proj.id
    });
  }
  for (const task of workspace.tasks || []) {
    chunks.push({
      id: `rag-task-${task.id}`,
      sourceType: "task",
      sourceCode: task.code,
      title: `Task ${task.code}: ${task.title}`,
      content: `Deliverable ${task.code} (${task.title}) in ${task.industrySector} / ${task.department}. DMAIC Phase: ${task.dmaicPhase}. Status: ${task.status}. Priority: ${task.priority} (priorityIndex: ${task.priorityIndex}, rank #${task.priorityIndex + 1}). Defects: ${task.defectsCount} / ${task.opportunitiesCount} opportunities. Hours: ${task.loggedHours}h logged of ${task.estimatedHours}h estimated. Due: ${task.dueDate}. Notes: ${task.description}`,
      projectId: task.projectId
    });
  }
  for (const ms of workspace.milestones || []) {
    chunks.push({
      id: `rag-ms-${ms.id}`,
      sourceType: "milestone",
      sourceCode: ms.code,
      title: `Milestone ${ms.code}: ${ms.title}`,
      content: `Milestone Gate ${ms.code} (${ms.title}) in ${ms.department}. Target Date: ${ms.targetDate}. Progress: ${ms.progress}%. Critical Gate: ${ms.isCritical ? "Yes" : "No"}. Details: ${ms.description}`,
      projectId: ms.projectId
    });
  }
  for (const doc of workspace.knowledgeDocs || []) {
    chunks.push({
      id: `rag-doc-${doc.id}`,
      sourceType: "knowledge_doc",
      sourceCode: doc.code,
      title: `${doc.category} ${doc.code}: ${doc.title}`,
      content: `Document ${doc.code} (${doc.title}) [${doc.category} \xB7 DMAIC ${doc.dmaicPhase}]. Author: ${doc.authorName}. Content: ${doc.content}`,
      projectId: doc.projectId
    });
  }
  for (const msg of workspace.messages || []) {
    if (msg.isRagResponse) continue;
    const ch = (workspace.channels || []).find((c) => c.id === msg.channelId);
    chunks.push({
      id: `rag-msg-${msg.id}`,
      sourceType: "channel_message",
      sourceCode: ch ? `#${ch.name}` : "#channel",
      title: `Message from ${msg.senderName} (${msg.senderRole}) in ${ch ? `#${ch.name}` : "channel"}`,
      content: `${msg.senderName} (${msg.senderRole}) in ${ch ? `#${ch.name}` : "channel"}: "${msg.content}"`,
      projectId: msg.projectId
    });
  }
  for (const step of DMAIC_METHODOLOGY_GUIDE) {
    chunks.push({
      id: `rag-dmaic-${step.phase.toLowerCase()}`,
      sourceType: "methodology",
      sourceCode: `DMAIC-${step.stepNumber}`,
      title: `Six Sigma DMAIC Phase ${step.stepNumber}: ${step.phase} (${step.tagline})`,
      content: `DMAIC ${step.phase} Phase: ${step.plainLanguageExplanation} Tool Mapping: ${step.kronosphereToolMapping} Outputs: ${step.keyOutputs.join(", ")}. Examples \u2014 Construction: ${step.industryExamples.construction} Events: ${step.industryExamples.events} Tech: ${step.industryExamples.tech}`
    });
  }
  return chunks;
}
function retrieveRelevantChunks(query, workspace, topK = 5) {
  const corpus = buildRagCorpus(workspace);
  const queryTokens = tokenizeText(query);
  if (queryTokens.length === 0) {
    return corpus.slice(0, topK).map((c) => ({ ...c, score: 1 }));
  }
  const scored = corpus.map((item) => {
    const haystack = `${item.sourceCode} ${item.title} ${item.content}`.toLowerCase();
    const docTokens = tokenizeText(haystack);
    let score = 0;
    for (const qToken of queryTokens) {
      if (item.sourceCode.toLowerCase().includes(qToken)) {
        score += 6;
      }
      if (item.title.toLowerCase().includes(qToken)) {
        score += 4;
      }
      const matches = docTokens.filter((t) => t === qToken || t.includes(qToken)).length;
      if (matches > 0) {
        score += Math.min(5, 1 + Math.log1p(matches) * 2);
      }
    }
    return {
      ...item,
      score: Number(score.toFixed(2))
    };
  });
  const filtered = scored.filter((c) => c.score > 0).sort((a, b) => b.score - a.score);
  if (filtered.length > 0) {
    return filtered.slice(0, topK);
  }
  return scored.slice(0, topK);
}
function synthesizeLocalRagAnswer(query, chunks, workspace) {
  const sixSigma = computeSixSigmaMetrics(workspace.tasks || []);
  const citations = chunks.map((c) => `${c.sourceCode}: ${c.title}`);
  const bulletPoints = chunks.slice(0, 4).map((c) => `\u2022 [${c.sourceCode}] ${c.content}`).join("\n");
  const answer = [
    `Grounded RAG Analysis for "${query}" across ${workspace.projects?.length || 1} project(s) (${workspace.tasks?.length || 0} tasks, ${sixSigma.sigmaLevel}\u03C3 quality, ${sixSigma.dpmo.toLocaleString()} DPMO):`,
    bulletPoints || "\u2022 No matching records found yet. Add tasks, SOP documents, or channel messages to expand the RAG index."
  ].join("\n\n");
  return { answer, citations };
}

// server.ts
var PORT = 3e3;
var DATA_DIR = import_path.default.resolve(process.cwd(), ".data");
var WORKSPACE_FILE = import_path.default.join(DATA_DIR, "workspace-clean-prod-v6.json");
var BACKUPS_FILE = import_path.default.join(DATA_DIR, "encrypted-backups.json");
function ensureStorage() {
  if (!import_fs.default.existsSync(DATA_DIR)) {
    import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!import_fs.default.existsSync(WORKSPACE_FILE)) {
    import_fs.default.writeFileSync(
      WORKSPACE_FILE,
      JSON.stringify(INITIAL_WORKSPACE_STATE, null, 2),
      "utf-8"
    );
  }
  if (!import_fs.default.existsSync(BACKUPS_FILE)) {
    import_fs.default.writeFileSync(BACKUPS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}
function readWorkspace() {
  ensureStorage();
  try {
    const raw = import_fs.default.readFileSync(WORKSPACE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_WORKSPACE_STATE,
      ...parsed,
      projects: Array.isArray(parsed.projects) && parsed.projects.length > 0 ? parsed.projects : INITIAL_WORKSPACE_STATE.projects,
      channels: Array.isArray(parsed.channels) && parsed.channels.length > 0 ? parsed.channels : INITIAL_WORKSPACE_STATE.channels,
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      knowledgeDocs: Array.isArray(parsed.knowledgeDocs) ? parsed.knowledgeDocs : [],
      widgets: Array.isArray(parsed.widgets) && parsed.widgets.some((w) => w.id === "dmaic_methodology") ? parsed.widgets : INITIAL_WORKSPACE_STATE.widgets
    };
  } catch {
    return INITIAL_WORKSPACE_STATE;
  }
}
function writeWorkspace(state) {
  ensureStorage();
  import_fs.default.writeFileSync(WORKSPACE_FILE, JSON.stringify(state, null, 2), "utf-8");
}
async function startServer() {
  ensureStorage();
  const app = (0, import_express.default)();
  const server = import_http.default.createServer(app);
  app.use(import_express.default.json({ limit: "5mb" }));
  const wss = new import_ws.WebSocketServer({ server, path: "/ws" });
  const connectedUsers = /* @__PURE__ */ new Map();
  function broadcastEvent(event, payload) {
    const serialized = JSON.stringify({ event, payload, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    for (const client of wss.clients) {
      if (client.readyState === import_ws.WebSocket.OPEN) {
        client.send(serialized);
      }
    }
  }
  function broadcastPresence() {
    const activeUsers = Array.from(connectedUsers.values());
    broadcastEvent("presence:update", { activeUsers, count: Math.max(1, activeUsers.length) });
  }
  wss.on("connection", (ws) => {
    connectedUsers.set(ws, {
      userId: "usr-admin-1",
      name: "System Administrator",
      role: "Admin"
    });
    broadcastPresence();
    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.event === "user:identify" && data.payload) {
          connectedUsers.set(ws, {
            userId: String(data.payload.userId || "usr-admin-1"),
            name: String(data.payload.name || "Member"),
            role: String(data.payload.role || "Contributor")
          });
          broadcastPresence();
        } else if (data.event === "message:create" && data.payload) {
          const msg = data.payload;
          const wsState = readWorkspace();
          if (!wsState.messages.some((m) => m.id === msg.id)) {
            wsState.messages = [...wsState.messages, msg];
            wsState.lastSyncedAt = (/* @__PURE__ */ new Date()).toISOString();
            writeWorkspace(wsState);
          }
          broadcastEvent("message:created", msg);
        } else if (data.event === "channel:create" && data.payload) {
          const ch = data.payload;
          const wsState = readWorkspace();
          if (!wsState.channels.some((c) => c.id === ch.id)) {
            wsState.channels = [...wsState.channels, ch];
            writeWorkspace(wsState);
          }
          broadcastEvent("channel:created", ch);
        }
      } catch {
      }
    });
    ws.on("close", () => {
      connectedUsers.delete(ws);
      broadcastPresence();
    });
  });
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      engine: "KronoSphere Multi-Project & Six Sigma DMAIC Engine v6.0",
      encryption: "AES-GCM-256 / PBKDF2-SHA256",
      realtime: "WebSocket (/ws)",
      ragEngine: "Hybrid BM25 + Gemini 3.8 Flash Server Synthesis",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/api/workspace", (_req, res) => {
    const state = readWorkspace();
    res.json(state);
  });
  app.post("/api/reset", (_req, res) => {
    const clean = {
      ...INITIAL_WORKSPACE_STATE,
      lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    writeWorkspace(clean);
    broadcastEvent("workspace:reset", clean);
    res.json(clean);
  });
  app.post("/api/sync", (req, res) => {
    const incoming = req.body;
    if (!incoming || typeof incoming !== "object") {
      res.status(400).json({ error: "Invalid workspace payload" });
      return;
    }
    const syncedAt = (/* @__PURE__ */ new Date()).toISOString();
    const updated = {
      ...incoming,
      lastSyncedAt: syncedAt
    };
    writeWorkspace(updated);
    res.json({
      ok: true,
      lastSyncedAt: syncedAt,
      tasksCount: Array.isArray(updated.tasks) ? updated.tasks.length : 0,
      projectsCount: Array.isArray(updated.projects) ? updated.projects.length : 1
    });
  });
  app.post("/api/rag/query", async (req, res) => {
    const { query, workspaceSnapshot } = req.body || {};
    if (!query || typeof query !== "string") {
      res.status(400).json({ error: "Query string is required for RAG retrieval." });
      return;
    }
    const currentWorkspace = workspaceSnapshot && typeof workspaceSnapshot === "object" ? workspaceSnapshot : readWorkspace();
    const retrievedChunks = retrieveRelevantChunks(query, currentWorkspace, 6);
    const localFallback = synthesizeLocalRagAnswer(query, retrievedChunks, currentWorkspace);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      res.json({
        ok: true,
        answer: localFallback.answer,
        citations: localFallback.citations,
        retrievedChunks,
        engine: "Hybrid BM25 Local RAG Index"
      });
      return;
    }
    try {
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const contextBlock = retrievedChunks.map((c, idx) => `[${idx + 1}] (${c.sourceCode} - ${c.sourceType}): ${c.content}`).join("\n");
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `User Query: ${query}

Retrieved Workspace Context:
${contextBlock}`,
        config: {
          systemInstruction: "You are the KronoSphere Enterprise RAG & Six Sigma (DMAIC) Operations Copilot. Answer the user query concisely using ONLY the Retrieved Workspace Context provided. Always cite source codes in brackets like [PRJ-001], [KRN-101], [SOP-101], or [DMAIC-01]. Explain any Six Sigma DMAIC implications clearly for both technical and non-technical users."
        }
      });
      const answerText = response.text?.trim() || localFallback.answer;
      res.json({
        ok: true,
        answer: answerText,
        citations: localFallback.citations,
        retrievedChunks,
        engine: "Gemini 3.8 Flash + Hybrid BM25 RAG"
      });
    } catch {
      res.json({
        ok: true,
        answer: localFallback.answer,
        citations: localFallback.citations,
        retrievedChunks,
        engine: "Hybrid BM25 Local RAG Index (Fallback)"
      });
    }
  });
  app.get("/api/backups", (_req, res) => {
    try {
      const backups = JSON.parse(import_fs.default.readFileSync(BACKUPS_FILE, "utf-8"));
      res.json(backups);
    } catch {
      res.json([]);
    }
  });
  app.post("/api/backups", (req, res) => {
    const bundle = req.body;
    if (!bundle || !bundle.ciphertextHex || !bundle.ivHex) {
      res.status(400).json({ error: "Encrypted bundle requires ciphertextHex and ivHex" });
      return;
    }
    try {
      const existing = JSON.parse(import_fs.default.readFileSync(BACKUPS_FILE, "utf-8"));
      const entry = {
        id: `bkp-${Date.now()}`,
        algorithm: bundle.algorithm || "AES-GCM-256",
        ivHex: bundle.ivHex,
        saltHex: bundle.saltHex,
        byteLength: Math.round(bundle.ciphertextHex.length / 2),
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const next = [entry, ...existing].slice(0, 25);
      import_fs.default.writeFileSync(BACKUPS_FILE, JSON.stringify(next, null, 2), "utf-8");
      res.json({ ok: true, backup: entry, totalBackups: next.length });
    } catch {
      res.status(500).json({ error: "Failed to store encrypted backup" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`KronoSphere Multi-Project Server listening on http://localhost:${PORT}`);
  });
}
startServer();
