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
var import_vite = require("vite");
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_node_url = require("node:url");

// src/data/seedData.ts
var INITIAL_WORKSPACE_STATE = {
  projectName: "KronoSphere v4.2 Zero-Trust Cloud & Spatial Telemetry Rollout",
  projectCode: "KRN-2026-Q4",
  encryptionKeyFingerprint: "SHA256:9F86D081884C7D659A2FEAA0C55AD015A3BF4F1B2B0B822CD15D6C15B0F00A08",
  lastSyncedAt: "2026-11-01T19:45:00.000Z",
  members: [
    {
      id: "usr-1",
      name: "Marcus Sterling",
      role: "Admin",
      title: "Principal Systems Architect",
      department: "Engineering",
      email: "m.sterling@kronosphere.io",
      initials: "MS",
      avatarHue: 215,
      capacityHoursPerWeek: 40,
      hourlyRate: 165,
      platforms: ["macOS", "iOS"]
    },
    {
      id: "usr-2",
      name: "Elena Vance",
      role: "Project Lead",
      title: "Staff Security & Cryptography Lead",
      department: "Security",
      email: "e.vance@kronosphere.io",
      initials: "EV",
      avatarHue: 160,
      capacityHoursPerWeek: 40,
      hourlyRate: 175,
      platforms: ["macOS", "Android"]
    },
    {
      id: "usr-3",
      name: "Devon Kagawa",
      role: "Project Lead",
      title: "Lead Product Designer",
      department: "Design",
      email: "d.kagawa@kronosphere.io",
      initials: "DK",
      avatarHue: 265,
      capacityHoursPerWeek: 38,
      hourlyRate: 145,
      platforms: ["macOS", "iOS"]
    },
    {
      id: "usr-4",
      name: "Soren Lindqvist",
      role: "Contributor",
      title: "Senior DevOps & Mesh Engineer",
      department: "DevOps",
      email: "s.lindqvist@kronosphere.io",
      initials: "SL",
      avatarHue: 32,
      capacityHoursPerWeek: 40,
      hourlyRate: 155,
      platforms: ["Windows", "Android"]
    },
    {
      id: "usr-5",
      name: "Amara Okafor",
      role: "Contributor",
      title: "Distributed Storage Engineer",
      department: "Engineering",
      email: "a.okafor@kronosphere.io",
      initials: "AO",
      avatarHue: 195,
      capacityHoursPerWeek: 40,
      hourlyRate: 150,
      platforms: ["Windows", "iOS"]
    },
    {
      id: "usr-6",
      name: "Claire Beaumont",
      role: "Auditor",
      title: "ISO-27001 Compliance & Risk Auditor",
      department: "Product",
      email: "c.beaumont@kronosphere.io",
      initials: "CB",
      avatarHue: 340,
      capacityHoursPerWeek: 32,
      hourlyRate: 140,
      platforms: ["macOS", "Windows"]
    }
  ],
  milestones: [
    {
      id: "ms-1",
      code: "MS-01",
      title: "Zero-Trust Identity & E2E Vault Core",
      targetDate: "2026-11-10",
      department: "Security",
      progress: 88,
      isCritical: true,
      description: "Complete AES-GCM-256 client key derivation, hardware token attestation, and RBAC policy enforcement.",
      position3D: [-11, 0, -6]
    },
    {
      id: "ms-2",
      code: "MS-02",
      title: "Distributed Offline Sync & CRDT Engine",
      targetDate: "2026-11-18",
      department: "Engineering",
      progress: 64,
      isCritical: true,
      description: "Deterministic conflict-free state replication across macOS, Windows, iOS, and Android clients.",
      position3D: [-3.5, 0, 5.5]
    },
    {
      id: "ms-3",
      code: "MS-03",
      title: "Multi-Region Kubernetes Mesh Cutover",
      targetDate: "2026-11-26",
      department: "DevOps",
      progress: 45,
      isCritical: true,
      description: "Automated blue/green ingress failover with sub-50ms replication latency across 3 availability zones.",
      position3D: [4.5, 0, -5]
    },
    {
      id: "ms-4",
      code: "MS-04",
      title: "Executive Analytics & ISO Audit Sign-off",
      targetDate: "2026-12-04",
      department: "Product",
      progress: 32,
      isCritical: false,
      description: "Automated PDF/CSV compliance reporting, custom dashboard widgets, and external security attestation.",
      position3D: [11.5, 0, 5]
    }
  ],
  tasks: [
    {
      id: "tsk-101",
      code: "KRN-101",
      title: "Implement WebCrypto PBKDF2 + AES-GCM-256 Vault Provider",
      description: "Client-side zero-knowledge encryption wrapper for offline project snapshots and attachment blobs.",
      status: "Completed",
      priority: "Critical",
      department: "Security",
      assigneeId: "usr-2",
      milestoneId: "ms-1",
      estimatedHours: 24,
      loggedHours: 22.5,
      dueDate: "2026-11-03",
      dependencies: [],
      tags: ["crypto", "e2e", "audit-verified"],
      updatedAt: "2026-10-29T14:20:00Z"
    },
    {
      id: "tsk-102",
      code: "KRN-102",
      title: "Granular Role-Based Access Control (RBAC) Policy Engine",
      description: "Enforce role permissions across API routes and frontend action controls for Admin, Lead, Contributor, and Auditor roles.",
      status: "Completed",
      priority: "High",
      department: "Security",
      assigneeId: "usr-2",
      milestoneId: "ms-1",
      estimatedHours: 18,
      loggedHours: 17.5,
      dueDate: "2026-11-05",
      dependencies: ["tsk-101"],
      tags: ["rbac", "security", "audit-verified"],
      updatedAt: "2026-10-30T18:10:00Z"
    },
    {
      id: "tsk-103",
      code: "KRN-103",
      title: "IndexedDB Offline Mutation Queue & Delta Reconciler",
      description: "Queue task edits, time entries, and file updates while offline and replay deterministically on reconnect.",
      status: "In Progress",
      priority: "Critical",
      department: "Engineering",
      assigneeId: "usr-1",
      milestoneId: "ms-2",
      estimatedHours: 32,
      loggedHours: 26,
      dueDate: "2026-11-12",
      dependencies: ["tsk-101", "tsk-102"],
      tags: ["offline-first", "sync", "core"],
      updatedAt: "2026-11-01T16:40:00Z"
    },
    {
      id: "tsk-104",
      code: "KRN-104",
      title: "Cross-Platform Push Notification & Deadline Scheduler",
      description: "Real-time milestone alerts and deadline reminders across macOS, Windows, iOS, and Android clients.",
      status: "In Review",
      priority: "High",
      department: "Engineering",
      assigneeId: "usr-5",
      milestoneId: "ms-2",
      estimatedHours: 20,
      loggedHours: 18,
      dueDate: "2026-11-14",
      dependencies: ["tsk-102"],
      tags: ["notifications", "cross-platform"],
      updatedAt: "2026-11-01T12:15:00Z"
    },
    {
      id: "tsk-105",
      code: "KRN-105",
      title: "Zero-Downtime Envoy mTLS Certificate Rotation Pipeline",
      description: "Automated SPIFFE/SPIRE identity rotation across multi-region worker nodes; currently awaiting HSM firewall rule.",
      status: "Blocked",
      priority: "Critical",
      department: "DevOps",
      assigneeId: "usr-4",
      milestoneId: "ms-3",
      estimatedHours: 28,
      loggedHours: 19.5,
      dueDate: "2026-11-19",
      dependencies: ["tsk-102", "tsk-103"],
      tags: ["mtls", "kubernetes", "auto-escalated"],
      updatedAt: "2026-11-01T18:05:00Z"
    },
    {
      id: "tsk-106",
      code: "KRN-106",
      title: "Customizable Drag-and-Drop Executive Widget Grid",
      description: "Enable non-technical leaders to reorder, resize, and toggle telemetry widgets with persistent layout state.",
      status: "Completed",
      priority: "Medium",
      department: "Design",
      assigneeId: "usr-3",
      milestoneId: "ms-4",
      estimatedHours: 16,
      loggedHours: 15,
      dueDate: "2026-11-08",
      dependencies: [],
      tags: ["ux", "dashboard", "audit-verified"],
      updatedAt: "2026-10-31T11:00:00Z"
    },
    {
      id: "tsk-107",
      code: "KRN-107",
      title: "Automated PDF & RFC-4180 CSV Analytics Report Compiler",
      description: "Client and server report generator producing executive PDF briefs and raw CSV datasets for BI pipelines.",
      status: "In Progress",
      priority: "High",
      department: "Product",
      assigneeId: "usr-6",
      milestoneId: "ms-4",
      estimatedHours: 22,
      loggedHours: 14.5,
      dueDate: "2026-11-22",
      dependencies: ["tsk-106"],
      tags: ["reporting", "pdf", "csv"],
      updatedAt: "2026-11-01T15:30:00Z"
    },
    {
      id: "tsk-108",
      code: "KRN-108",
      title: "3D Spatial Dependency & Critical Path Topology Engine",
      description: "Hardware-accelerated Three.js visualization of milestone monuments, task nodes, and real-time critical path flow.",
      status: "In Progress",
      priority: "High",
      department: "Design",
      assigneeId: "usr-3",
      milestoneId: "ms-2",
      estimatedHours: 26,
      loggedHours: 21,
      dueDate: "2026-11-16",
      dependencies: ["tsk-103", "tsk-106"],
      tags: ["threejs", "webgl", "topology"],
      updatedAt: "2026-11-01T19:00:00Z"
    },
    {
      id: "tsk-109",
      code: "KRN-109",
      title: "Multi-Region Cloud Backup & Snapshot Verification Cron",
      description: "Verify SHA-256 checksums of encrypted project backups replicated across primary and disaster-recovery vaults.",
      status: "Backlog",
      priority: "High",
      department: "DevOps",
      assigneeId: "usr-4",
      milestoneId: "ms-3",
      estimatedHours: 24,
      loggedHours: 6,
      dueDate: "2026-11-25",
      dependencies: ["tsk-105"],
      tags: ["backup", "disaster-recovery"],
      updatedAt: "2026-11-01T09:00:00Z"
    },
    {
      id: "tsk-110",
      code: "KRN-110",
      title: "Custom IF/THEN Workflow Trigger & Webhook Dispatcher",
      description: "Deterministic rule evaluator for automatic priority escalation, reviewer routing, and compliance tagging.",
      status: "In Review",
      priority: "Medium",
      department: "Engineering",
      assigneeId: "usr-1",
      milestoneId: "ms-4",
      estimatedHours: 18,
      loggedHours: 16.5,
      dueDate: "2026-11-20",
      dependencies: ["tsk-104"],
      tags: ["automation", "workflow"],
      updatedAt: "2026-11-01T17:45:00Z"
    }
  ],
  timeEntries: [
    {
      id: "tm-1",
      taskId: "tsk-101",
      userId: "usr-2",
      date: "2026-10-28",
      durationMinutes: 480,
      billable: true,
      notes: "Implemented WebCrypto PBKDF2 key derivation and AES-GCM-256 cipher suite."
    },
    {
      id: "tm-2",
      taskId: "tsk-101",
      userId: "usr-2",
      date: "2026-10-29",
      durationMinutes: 870,
      billable: true,
      notes: "Completed unit test suite and zero-knowledge key rotation verification."
    },
    {
      id: "tm-3",
      taskId: "tsk-102",
      userId: "usr-2",
      date: "2026-10-30",
      durationMinutes: 1050,
      billable: true,
      notes: "Built RBAC permission matrix and audited Auditor read-only guardrails."
    },
    {
      id: "tm-4",
      taskId: "tsk-103",
      userId: "usr-1",
      date: "2026-10-31",
      durationMinutes: 960,
      billable: true,
      notes: "Architected offline mutation log and deterministic conflict resolution."
    },
    {
      id: "tm-5",
      taskId: "tsk-103",
      userId: "usr-1",
      date: "2026-11-01",
      durationMinutes: 600,
      billable: true,
      notes: "Tested reconnect batch sync and checksum verification under packet loss."
    },
    {
      id: "tm-6",
      taskId: "tsk-104",
      userId: "usr-5",
      date: "2026-10-31",
      durationMinutes: 1080,
      billable: true,
      notes: "Integrated desktop/mobile push notification service worker & reminder queue."
    },
    {
      id: "tm-7",
      taskId: "tsk-105",
      userId: "usr-4",
      date: "2026-11-01",
      durationMinutes: 1170,
      billable: true,
      notes: "Configured Envoy SDS mTLS rotation; blocked on upstream HSM port 8443."
    },
    {
      id: "tm-8",
      taskId: "tsk-106",
      userId: "usr-3",
      date: "2026-10-30",
      durationMinutes: 900,
      billable: false,
      notes: "Designed customizable executive dashboard layout and drag-and-drop cards."
    },
    {
      id: "tm-9",
      taskId: "tsk-107",
      userId: "usr-6",
      date: "2026-11-01",
      durationMinutes: 870,
      billable: true,
      notes: "Built binary PDF 1.4 report generator and RFC-4180 CSV exporter."
    },
    {
      id: "tm-10",
      taskId: "tsk-108",
      userId: "usr-3",
      date: "2026-11-01",
      durationMinutes: 1260,
      billable: true,
      notes: "Constructed composite 3D procedural milestone towers and dependency tubes."
    },
    {
      id: "tm-11",
      taskId: "tsk-110",
      userId: "usr-1",
      date: "2026-11-01",
      durationMinutes: 990,
      billable: true,
      notes: "Implemented IF/THEN workflow automation engine and real-time alert dispatch."
    }
  ],
  automations: [
    {
      id: "auto-1",
      name: "Auto-Escalate Blocked Tasks to Critical",
      department: "All",
      trigger: "status_changed_to_blocked",
      action: "escalate_priority_critical",
      enabled: true,
      executionCount: 4,
      lastTriggeredAt: "2026-11-01T18:05:00Z"
    },
    {
      id: "auto-2",
      name: "Compliance Audit Tag on Task Completion",
      department: "All",
      trigger: "status_changed_to_completed",
      action: "auto_tag_audit_ready",
      enabled: true,
      executionCount: 9,
      lastTriggeredAt: "2026-10-31T11:00:00Z"
    },
    {
      id: "auto-3",
      name: "Notify Project Lead on Critical Escalation",
      department: "Engineering",
      trigger: "priority_escalated_to_critical",
      action: "notify_project_lead",
      enabled: true,
      executionCount: 3,
      lastTriggeredAt: "2026-11-01T16:40:00Z"
    },
    {
      id: "auto-4",
      name: "Trigger Encrypted Cloud Snapshot on Completion",
      department: "Security",
      trigger: "status_changed_to_completed",
      action: "trigger_cloud_backup",
      enabled: true,
      executionCount: 6,
      lastTriggeredAt: "2026-10-30T18:10:00Z"
    },
    {
      id: "auto-5",
      name: "Budget Overrun Alert on Hours Exceeding Estimate",
      department: "All",
      trigger: "hours_exceeded_estimate",
      action: "notify_project_lead",
      enabled: true,
      executionCount: 2,
      lastTriggeredAt: "2026-10-29T10:15:00Z"
    }
  ],
  notifications: [
    {
      id: "ntf-1",
      title: "Critical Blocker: KRN-105 (mTLS Rotation)",
      message: "Envoy mTLS Certificate Rotation Pipeline is blocked awaiting HSM firewall rule approval.",
      severity: "critical",
      category: "Dependency",
      timestamp: "2026-11-01T18:05:00Z",
      read: false,
      relatedTaskId: "tsk-105"
    },
    {
      id: "ntf-2",
      title: "Milestone MS-01 Approaching (88% Complete)",
      message: "Zero-Trust Identity & E2E Vault Core is on track for Nov 10 delivery.",
      severity: "info",
      category: "Milestone",
      timestamp: "2026-11-01T16:30:00Z",
      read: false
    },
    {
      id: "ntf-3",
      title: "Workflow Automation Executed (auto-1)",
      message: "KRN-105 was automatically escalated to Critical priority when marked Blocked.",
      severity: "warning",
      category: "Automation",
      timestamp: "2026-11-01T18:05:02Z",
      read: false,
      relatedTaskId: "tsk-105"
    },
    {
      id: "ntf-4",
      title: "E2E Encrypted Cloud Snapshot Verified",
      message: "AES-GCM-256 vault backup replicated across macOS, Windows, iOS, and Android endpoints.",
      severity: "success",
      category: "Security",
      timestamp: "2026-11-01T15:00:00Z",
      read: true
    }
  ],
  widgets: [
    {
      id: "velocity_burndown",
      title: "Sprint Velocity & Burndown Trajectory",
      subtitle: "Planned vs. delivered story points and logged engineering hours across 5 sprints",
      visible: true,
      order: 0,
      colSpan: 2
    },
    {
      id: "milestone_tracker",
      title: "Critical Milestone Readiness",
      subtitle: "Real-time progress and deadline proximity across Q4 program pillars",
      visible: true,
      order: 1,
      colSpan: 1
    },
    {
      id: "department_workload",
      title: "Cross-Department Resource Utilization",
      subtitle: "Logged vs. budgeted capacity across Engineering, Security, Design, DevOps, and Product",
      visible: true,
      order: 2,
      colSpan: 1
    },
    {
      id: "critical_alerts",
      title: "Real-Time Milestone & Blocker Feed",
      subtitle: "Automated workflow triggers, dependency bottlenecks, and deadline notifications",
      visible: true,
      order: 3,
      colSpan: 1
    },
    {
      id: "encryption_sync_status",
      title: "Offline Vault & Cross-Platform Sync Telemetry",
      subtitle: "AES-GCM-256 encryption state and multi-device replication across Desktop & Mobile",
      visible: true,
      order: 4,
      colSpan: 1
    }
  ],
  files: [
    {
      id: "fil-1",
      name: "zero-trust-architecture-blueprint-v4.pdf",
      department: "Security",
      sizeKb: 2480,
      version: "v4.2.1",
      offlineCached: true,
      encryptedHex: "8f4a2c91e0b7d31249a8c5f60192837465ab9c8d7e6f5a4b3c2d1e0f9a8b7c6d",
      ivHex: "a1b2c3d4e5f60718293a4b5c",
      checksum: "SHA256:4B91C8E2",
      updatedAt: "2026-11-01T14:20:00Z",
      summary: "Complete cryptographic key hierarchy, hardware security module (HSM) routing, and zero-knowledge proof specification."
    },
    {
      id: "fil-2",
      name: "crdt-offline-sync-protocol-spec.md",
      department: "Engineering",
      sizeKb: 640,
      version: "v2.8.0",
      offlineCached: true,
      encryptedHex: "3e1f9a04c8b27d6510f2e3d4c5b6a7988796a5b4c3d2e1f0a9b8c7d6e5f4a3b2",
      ivHex: "f1e2d3c4b5a69788796a5b4c",
      checksum: "SHA256:9D04A17F",
      updatedAt: "2026-11-01T11:10:00Z",
      summary: "Hybrid Logical Clock (HLC) vector state resolution for offline desktop and mobile clients."
    },
    {
      id: "fil-3",
      name: "multi-region-envoy-mesh-topology.yaml",
      department: "DevOps",
      sizeKb: 412,
      version: "v1.9.4",
      offlineCached: true,
      encryptedHex: "7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
      ivHex: "112233445566778899aabbcc",
      checksum: "SHA256:E7215B09",
      updatedAt: "2026-10-31T19:45:00Z",
      summary: "Declarative Envoy service mesh config with automated mTLS rotation and circuit breaking."
    },
    {
      id: "fil-4",
      name: "iso27001-soc2-compliance-matrix-2026.csv",
      department: "Product",
      sizeKb: 1190,
      version: "v3.1.0",
      offlineCached: true,
      encryptedHex: "5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
      ivHex: "99887766554433221100ffed",
      checksum: "SHA256:C3087D12",
      updatedAt: "2026-10-30T16:00:00Z",
      summary: "Control attestation log mapping RBAC permissions and E2E encryption keys to ISO-27001 Annex A."
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
      delete_task: false,
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

// server.ts
var import_meta = {};
var __dirname = import_node_path.default.dirname((0, import_node_url.fileURLToPath)(import_meta.url));
var DATA_DIR = import_node_path.default.join(__dirname, ".data");
var STORE_PATH = import_node_path.default.join(DATA_DIR, "workspace-store.json");
var BACKUP_PATH = import_node_path.default.join(DATA_DIR, "encrypted-backups.json");
function loadWorkspaceStore() {
  try {
    if (!import_node_fs.default.existsSync(DATA_DIR)) {
      import_node_fs.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (import_node_fs.default.existsSync(STORE_PATH)) {
      const raw = import_node_fs.default.readFileSync(STORE_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to read workspace store, using seed data:", err);
  }
  return structuredClone(INITIAL_WORKSPACE_STATE);
}
function saveWorkspaceStore(state) {
  try {
    if (!import_node_fs.default.existsSync(DATA_DIR)) {
      import_node_fs.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    import_node_fs.default.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist workspace store:", err);
  }
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "5mb" }));
  let workspaceState = loadWorkspaceStore();
  app.get("/api/workspace", (_req, res) => {
    res.json(workspaceState);
  });
  app.post("/api/sync", (req, res) => {
    const incoming = req.body;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    if (incoming && Array.isArray(incoming.tasks)) {
      workspaceState = {
        ...workspaceState,
        ...incoming,
        lastSyncedAt: nowIso
      };
      saveWorkspaceStore(workspaceState);
    } else {
      workspaceState.lastSyncedAt = nowIso;
      saveWorkspaceStore(workspaceState);
    }
    res.json({
      status: "synchronized",
      lastSyncedAt: workspaceState.lastSyncedAt,
      workspace: workspaceState
    });
  });
  app.post("/api/backups", (req, res) => {
    try {
      const bundle = req.body;
      let backups = [];
      if (import_node_fs.default.existsSync(BACKUP_PATH)) {
        backups = JSON.parse(import_node_fs.default.readFileSync(BACKUP_PATH, "utf-8"));
      }
      backups.unshift({
        id: `bkp-${Date.now()}`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        ...bundle
      });
      import_node_fs.default.writeFileSync(BACKUP_PATH, JSON.stringify(backups.slice(0, 20), null, 2), "utf-8");
      res.json({ ok: true, count: backups.length });
    } catch (err) {
      console.error("Backup save error:", err);
      res.status(500).json({ error: "Failed to store encrypted cloud backup" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_node_path.default.join(__dirname, "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_node_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`KronoSphere server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer();
