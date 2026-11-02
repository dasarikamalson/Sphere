export type TaskStatus = 'Backlog' | 'In Progress' | 'In Review' | 'Blocked' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type IndustrySector =
  | 'Construction & Civil'
  | 'Event Production'
  | 'Tech Development'
  | 'Manufacturing & Ops';

export type DmaicPhase = 'Define' | 'Measure' | 'Analyze' | 'Improve' | 'Control';

export type Department =
  | 'Engineering'
  | 'Field Operations'
  | 'Quality & Six Sigma'
  | 'Logistics & Venue'
  | 'Architecture & Design'
  | 'Security'
  | 'Design'
  | 'DevOps'
  | 'Product';

export type UserRole = 'Admin' | 'Project Lead' | 'Contributor' | 'Auditor';

export type PermissionAction =
  | 'create_task'
  | 'update_task'
  | 'delete_task'
  | 'log_time'
  | 'manage_automations'
  | 'manage_rbac'
  | 'export_reports'
  | 'manage_encryption';

export type RolePermissionMatrix = Record<UserRole, Record<PermissionAction, boolean>>;

export interface TeamMember {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  department: string;
  email: string;
  initials: string;
  avatarHue: number;
  capacityHoursPerWeek: number;
  hourlyRate: number;
  platforms: ('macOS' | 'Windows' | 'iOS' | 'Android')[];
  status?: 'active' | 'invited' | 'suspended';
  accessPin?: string;
  createdAt?: string;
}

export interface ProjectEntity {
  id: string;
  name: string;
  code: string;
  industrySector: IndustrySector;
  description: string;
  targetSigmaLevel: number;
  leadName: string;
  createdAt: string;
}

export interface Milestone {
  id: string;
  projectId?: string;
  title: string;
  code: string;
  targetDate: string;
  department: string;
  progress: number;
  isCritical: boolean;
  description: string;
  position3D?: [number, number, number];
}

export interface Task {
  id: string;
  projectId?: string;
  code: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  priorityIndex: number; // Automatically updated via drag-and-drop priority reordering
  dmaicPhase: DmaicPhase; // Six Sigma DMAIC lifecycle phase
  industrySector: IndustrySector;
  defectsCount: number; // Recorded defects / non-conformances for Six Sigma DPMO
  opportunitiesCount: number; // Quality inspection opportunities for DPMO
  department: string;
  assigneeId: string;
  milestoneId: string;
  estimatedHours: number;
  loggedHours: number;
  dueDate: string;
  dependencies: string[];
  tags: string[];
  encryptedNotes?: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  projectId?: string;
  taskId: string;
  userId: string;
  date: string;
  durationMinutes: number;
  billable: boolean;
  notes: string;
}

export type AutomationTriggerType =
  | 'status_changed_to_blocked'
  | 'status_changed_to_completed'
  | 'priority_escalated_to_critical'
  | 'hours_exceeded_estimate'
  | 'milestone_approaching';

export type AutomationActionType =
  | 'escalate_priority_critical'
  | 'notify_project_lead'
  | 'reassign_to_security_lead'
  | 'auto_tag_audit_ready'
  | 'trigger_cloud_backup';

export interface AutomationRule {
  id: string;
  projectId?: string;
  name: string;
  department: string;
  trigger: AutomationTriggerType;
  action: AutomationActionType;
  enabled: boolean;
  executionCount: number;
  lastTriggeredAt?: string;
}

export interface NotificationItem {
  id: string;
  projectId?: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  category: 'Milestone' | 'Automation' | 'Dependency' | 'Sync' | 'Security' | 'Six Sigma';
  timestamp: string;
  read: boolean;
  relatedTaskId?: string;
}

export type WidgetId =
  | 'six_sigma_dmaic'
  | 'dmaic_methodology'
  | 'velocity_burndown'
  | 'department_workload'
  | 'milestone_tracker'
  | 'critical_alerts'
  | 'encryption_sync_status';

export interface DashboardWidgetConfig {
  id: WidgetId;
  title: string;
  subtitle: string;
  visible: boolean;
  order: number;
  colSpan: 1 | 2;
}

export interface FileVaultItem {
  id: string;
  projectId?: string;
  name: string;
  department: string;
  sizeKb: number;
  version: string;
  offlineCached: boolean;
  encryptedHex: string;
  ivHex: string;
  checksum: string;
  updatedAt: string;
  summary: string;
}

export interface ChatChannel {
  id: string;
  projectId?: string; // undefined or 'all' means cross-project organization channel
  name: string;
  topic: string;
  isPrivate: boolean;
  type: 'channel' | 'dm';
  participants?: string[]; // user IDs for DM or private channel
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  projectId?: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  timestamp: string;
  threadParentId?: string;
  linkedTaskCode?: string;
  reactions: Record<string, string[]>; // reaction label -> array of userIds
  isRagResponse?: boolean;
  citations?: string[];
}

export interface KnowledgeDocument {
  id: string;
  projectId?: string;
  code: string;
  title: string;
  category: 'SOP' | 'Six Sigma Charter' | 'Engineering Spec' | 'Safety & Compliance' | 'Run of Show';
  dmaicPhase: DmaicPhase;
  content: string;
  authorName: string;
  updatedAt: string;
}

export interface OfflineMutation {
  id: string;
  type:
    | 'CREATE_TASK'
    | 'UPDATE_TASK'
    | 'REORDER_TASKS'
    | 'DELETE_TASK'
    | 'LOG_TIME'
    | 'TOGGLE_AUTOMATION'
    | 'SEND_MESSAGE'
    | 'SWITCH_PROJECT';
  summary: string;
  timestamp: string;
  payload: unknown;
}

export interface WorkspaceState {
  isSetupComplete: boolean;
  organizationName: string;
  organizationDomain: string;
  targetSigmaLevel: number;
  activeProjectId: string;
  projects: ProjectEntity[];
  currentUserId: string | null;
  projectName: string;
  projectCode: string;
  industrySector: IndustrySector;
  encryptionKeyFingerprint: string;
  lastSyncedAt: string;
  tasks: Task[];
  milestones: Milestone[];
  members: TeamMember[];
  timeEntries: TimeEntry[];
  automations: AutomationRule[];
  notifications: NotificationItem[];
  widgets: DashboardWidgetConfig[];
  files: FileVaultItem[];
  channels: ChatChannel[];
  messages: ChatMessage[];
  knowledgeDocs: KnowledgeDocument[];
  permissions: RolePermissionMatrix;
}
