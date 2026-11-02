import React, { useEffect, useMemo, useRef, useState } from 'react';
import { INITIAL_WORKSPACE_STATE } from './data/seedData';
import {
  AutomationRule,
  ChatChannel,
  ChatMessage,
  DashboardWidgetConfig,
  IndustrySector,
  KnowledgeDocument,
  Milestone,
  NotificationItem,
  OfflineMutation,
  PermissionAction,
  ProjectEntity,
  Task,
  TeamMember,
  TimeEntry,
  UserRole,
  WorkspaceState,
} from './types/project';
import {
  canRolePerform,
  computeCriticalPath,
  computeProjectAnalytics,
  EncryptedVaultBundle,
  evaluateAutomationRules,
  generateCsvReport,
  generatePdfBinary,
  moveTaskPriorityStep,
  reorderTasksByPriorityIndex,
} from './utils/projectEngine';
import { DashboardView } from './components/DashboardView';
import { TasksAndDependenciesView } from './components/TasksAndDependenciesView';
import { CollaborationAndRagView } from './components/CollaborationAndRagView';
import { TimeTrackingAndReportsView } from './components/TimeTrackingAndReportsView';
import { AutomationAndSecurityView } from './components/AutomationAndSecurityView';
import { SetupInstallerModal } from './components/SetupInstallerModal';
import {
  Bell,
  Cloud,
  CloudOff,
  FolderKanban,
  Moon,
  RefreshCw,
  Settings,
  Shield,
  Sun,
  X,
} from 'lucide-react';

type ActiveTab = 'dashboard' | 'tasks' | 'collaboration' | 'timetracking' | 'automation';

const LOCAL_STORAGE_KEY = 'kronosphere_clean_prod_v6';
const OFFLINE_QUEUE_KEY = 'kronosphere_offline_queue_v6';

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as WorkspaceState;
        return {
          ...INITIAL_WORKSPACE_STATE,
          ...parsed,
          projects:
            Array.isArray(parsed.projects) && parsed.projects.length > 0
              ? parsed.projects
              : INITIAL_WORKSPACE_STATE.projects,
          channels:
            Array.isArray(parsed.channels) && parsed.channels.length > 0
              ? parsed.channels
              : INITIAL_WORKSPACE_STATE.channels,
          messages: Array.isArray(parsed.messages) ? parsed.messages : [],
          knowledgeDocs: Array.isArray(parsed.knowledgeDocs) ? parsed.knowledgeDocs : [],
        };
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_WORKSPACE_STATE;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [activeRole, setActiveRole] = useState<UserRole>('Admin');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineMutation[]>(() => {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? (JSON.parse(raw) as OfflineMutation[]) : [];
    } catch {
      return [];
    }
  });

  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [installerModalOpen, setInstallerModalOpen] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // WebSocket Real-Time Collaboration State
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [onlineUserCount, setOnlineUserCount] = useState<number>(1);

  // Live Task Stopwatch State (Clean initial state — 0s)
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  const currentUser: TeamMember = useMemo(() => {
    const found = workspace.members.find((m) => m.id === workspace.currentUserId);
    return (
      found ||
      workspace.members[0] || {
        id: 'usr-admin-1',
        name: 'System Administrator',
        role: activeRole,
        title: 'Master Black Belt & Principal Architect',
        department: 'Quality & Six Sigma',
        email: 'admin@enterprise.local',
        initials: 'SA',
        avatarHue: 0,
        capacityHoursPerWeek: 40,
        hourlyRate: 150,
        platforms: ['macOS', 'Windows', 'iOS', 'Android'],
      }
    );
  }, [workspace.members, workspace.currentUserId, activeRole]);

  // Active Project entity
  const activeProject: ProjectEntity = useMemo(() => {
    const found = workspace.projects.find((p) => p.id === workspace.activeProjectId);
    return (
      found ||
      workspace.projects[0] || {
        id: 'prj-default-1',
        name: workspace.projectName,
        code: workspace.projectCode,
        industrySector: workspace.industrySector,
        description: 'Primary operational execution program.',
        targetSigmaLevel: workspace.targetSigmaLevel || 6.0,
        leadName: currentUser.name,
        createdAt: new Date().toISOString(),
      }
    );
  }, [workspace, currentUser.name]);

  // Scoped active project tasks, milestones, and time entries
  const activeProjectTasks = useMemo(
    () =>
      workspace.tasks
        .filter((t) => !t.projectId || t.projectId === activeProject.id)
        .sort((a, b) => a.priorityIndex - b.priorityIndex),
    [workspace.tasks, activeProject.id]
  );

  const activeProjectMilestones = useMemo(
    () =>
      workspace.milestones.filter(
        (m) => !m.projectId || m.projectId === activeProject.id
      ),
    [workspace.milestones, activeProject.id]
  );

  const activeProjectTimeEntries = useMemo(
    () =>
      workspace.timeEntries.filter(
        (te) => !te.projectId || te.projectId === activeProject.id
      ),
    [workspace.timeEntries, activeProject.id]
  );

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Persist workspace to localStorage for instant offline access
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(workspace));
    } catch {
      // ignore quota errors
    }
  }, [workspace]);

  useEffect(() => {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue));
    } catch {
      // ignore
    }
  }, [offlineQueue]);

  // Fetch initial workspace from Node/Express backend
  useEffect(() => {
    let mounted = true;
    fetch('/api/workspace')
      .then((res) => (res.ok ? res.json() : null))
      .then((serverData: WorkspaceState | null) => {
        if (mounted && serverData && Array.isArray(serverData.tasks)) {
          setWorkspace((prev) => ({
            ...INITIAL_WORKSPACE_STATE,
            ...serverData,
            isSetupComplete: prev.isSetupComplete || Boolean(serverData.isSetupComplete),
          }));
        }
      })
      .catch(() => {
        // Offline fallback uses local cache seamlessly
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Connect to Real-Time WebSocket server (/ws) on same port 3000
  useEffect(() => {
    if (isOffline) {
      wsRef.current?.close();
      setWsConnected(false);
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;
    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setWsConnected(true);
        socket?.send(
          JSON.stringify({
            event: 'user:identify',
            payload: {
              userId: currentUser.id,
              name: currentUser.name,
              role: activeRole,
            },
          })
        );
      };

      socket.onmessage = (evt) => {
        try {
          const packet = JSON.parse(evt.data);
          if (packet.event === 'presence:update' && packet.payload) {
            setOnlineUserCount(Math.max(1, Number(packet.payload.count || 1)));
          } else if (packet.event === 'message:created' && packet.payload) {
            const incomingMsg = packet.payload as ChatMessage;
            setWorkspace((prev) => {
              if (prev.messages.some((m) => m.id === incomingMsg.id)) {
                return prev;
              }
              return {
                ...prev,
                messages: [...prev.messages, incomingMsg],
              };
            });
          } else if (packet.event === 'channel:created' && packet.payload) {
            const incomingCh = packet.payload as ChatChannel;
            setWorkspace((prev) => {
              if (prev.channels.some((c) => c.id === incomingCh.id)) {
                return prev;
              }
              return {
                ...prev,
                channels: [...prev.channels, incomingCh],
              };
            });
          }
        } catch {
          // ignore
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
      };
    } catch {
      setWsConnected(false);
    }

    return () => {
      socket?.close();
    };
  }, [isOffline, currentUser.id, currentUser.name, activeRole]);

  // Stopwatch interval
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  const criticalPath = useMemo(
    () => computeCriticalPath(activeProjectTasks),
    [activeProjectTasks]
  );

  const analytics = useMemo(
    () =>
      computeProjectAnalytics(
        activeProjectTasks,
        activeProjectTimeEntries,
        activeProjectMilestones,
        workspace.members
      ),
    [activeProjectTasks, activeProjectTimeEntries, activeProjectMilestones, workspace.members]
  );

  const canPerform = (action: PermissionAction): boolean =>
    canRolePerform(activeRole, action, workspace.permissions);

  const pushOrQueueUpdate = async (
    nextState: WorkspaceState,
    mutationType: OfflineMutation['type'],
    summary: string
  ) => {
    setWorkspace(nextState);

    if (isOffline) {
      const item: OfflineMutation = {
        id: `mut-${Date.now()}`,
        type: mutationType,
        summary,
        timestamp: new Date().toISOString(),
        payload: {},
      };
      setOfflineQueue((prev) => [item, ...prev]);
      setStatusBanner(`Queued offline change: ${summary}`);
      return;
    }

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextState),
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspace((prev) => ({ ...prev, lastSyncedAt: data.lastSyncedAt }));
      }
    } catch {
      // fallback to local queue if network unreachable
    }
  };

  const handleCompleteFirstLoadSetup = (payload: {
    organizationName: string;
    organizationDomain: string;
    targetSigmaLevel: number;
    projects: ProjectEntity[];
    members: TeamMember[];
    channels: ChatChannel[];
    knowledgeDocs: KnowledgeDocument[];
  }) => {
    const firstProj = payload.projects[0] || INITIAL_WORKSPACE_STATE.projects[0];
    const firstMember = payload.members[0] || INITIAL_WORKSPACE_STATE.members[0];

    const nextState: WorkspaceState = {
      ...workspace,
      isSetupComplete: true,
      organizationName: payload.organizationName,
      organizationDomain: payload.organizationDomain,
      targetSigmaLevel: payload.targetSigmaLevel,
      projects: payload.projects,
      activeProjectId: firstProj.id,
      projectName: firstProj.name,
      projectCode: firstProj.code,
      industrySector: firstProj.industrySector,
      members: payload.members,
      currentUserId: firstMember.id,
      channels: payload.channels,
      knowledgeDocs: [
        ...payload.knowledgeDocs,
        ...workspace.knowledgeDocs.filter(
          (d) => !payload.knowledgeDocs.some((nd) => nd.code === d.code)
        ),
      ],
    };

    setActiveRole(firstMember.role);
    setInstallerModalOpen(false);
    pushOrQueueUpdate(
      nextState,
      'SWITCH_PROJECT',
      `Completed enterprise system setup for ${payload.organizationName} (${payload.projects.length} project(s))`
    );
    setStatusBanner(
      `System installation complete: ${payload.organizationName} · ${payload.projects.length} project(s) · ${payload.members.length} RBAC user(s).`
    );
  };

  const handleSelectProject = (projectId: string) => {
    const target = workspace.projects.find((p) => p.id === projectId);
    if (!target) return;
    const nextState: WorkspaceState = {
      ...workspace,
      activeProjectId: target.id,
      projectName: target.name,
      projectCode: target.code,
      industrySector: target.industrySector,
    };
    pushOrQueueUpdate(
      nextState,
      'SWITCH_PROJECT',
      `Switched active project to ${target.code}: ${target.name}`
    );
    setStatusBanner(`Switched active project to ${target.code} (${target.name}).`);
  };

  const handleCreateProject = (projInput: Omit<ProjectEntity, 'id' | 'createdAt'>) => {
    const created: ProjectEntity = {
      ...projInput,
      id: `prj-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const nextState: WorkspaceState = {
      ...workspace,
      projects: [...workspace.projects, created],
      activeProjectId: created.id,
      projectName: created.name,
      projectCode: created.code,
      industrySector: created.industrySector,
    };
    pushOrQueueUpdate(
      nextState,
      'SWITCH_PROJECT',
      `Created & activated project ${created.code}: ${created.name}`
    );
    setStatusBanner(
      `Created & switched to project ${created.code}: ${created.name} (${created.industrySector}).`
    );
  };

  const handleUpdateWorkspaceMeta = (meta: {
    projectName?: string;
    projectCode?: string;
    industrySector?: IndustrySector;
  }) => {
    const updatedProjects = workspace.projects.map((p) =>
      p.id === activeProject.id
        ? {
            ...p,
            name: meta.projectName ?? p.name,
            code: meta.projectCode ?? p.code,
            industrySector: meta.industrySector ?? p.industrySector,
          }
        : p
    );
    const nextState: WorkspaceState = {
      ...workspace,
      ...meta,
      projects: updatedProjects,
    };
    pushOrQueueUpdate(nextState, 'UPDATE_TASK', 'Updated active project metadata');
  };

  const handleSyncCloudNow = async () => {
    const nowIso = new Date().toISOString();
    const syncedNote: NotificationItem = {
      id: `ntf-sync-${Date.now()}`,
      projectId: activeProject.id,
      title: 'Cloud Synchronization Complete',
      message:
        offlineQueue.length > 0
          ? `Reconciled ${offlineQueue.length} queued offline mutations across all devices.`
          : 'Workspace state verified with primary cloud storage.',
      severity: 'success',
      category: 'Sync',
      timestamp: nowIso,
      read: false,
    };

    const nextWorkspace: WorkspaceState = {
      ...workspace,
      lastSyncedAt: nowIso,
      notifications: [syncedNote, ...workspace.notifications],
    };

    setWorkspace(nextWorkspace);
    setOfflineQueue([]);
    setIsOffline(false);
    setStatusBanner('Cloud synchronization complete — all offline changes reconciled.');

    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextWorkspace),
      });
    } catch {
      // ignore
    }
  };

  const handleCreateTask = (
    newTaskInput: Omit<Task, 'id' | 'code' | 'loggedHours' | 'updatedAt' | 'priorityIndex'>
  ) => {
    const nextNum = 101 + workspace.tasks.length;
    const nowIso = new Date().toISOString();
    const nextPriorityIndex = activeProjectTasks.length;
    const created: Task = {
      ...newTaskInput,
      id: `tsk-${Date.now()}-${nextNum}`,
      projectId: activeProject.id,
      code: `KRN-${nextNum}`,
      priorityIndex: nextPriorityIndex,
      loggedHours: 0,
      updatedAt: nowIso,
    };

    const autoRes = evaluateAutomationRules(
      created,
      null,
      workspace.automations,
      nowIso
    );

    const otherProjectTasks = workspace.tasks.filter(
      (t) => t.projectId && t.projectId !== activeProject.id
    );
    const updatedActiveTasks = [...activeProjectTasks, autoRes.updatedTask].map(
      (t, idx) => ({
        ...t,
        priorityIndex: idx,
      })
    );

    const nextState: WorkspaceState = {
      ...workspace,
      tasks: [...otherProjectTasks, ...updatedActiveTasks],
      notifications: [
        {
          id: `ntf-create-${Date.now()}`,
          projectId: activeProject.id,
          title: `Deliverable Created: ${created.code}`,
          message: `${created.title} (${created.dmaicPhase} phase · priorityIndex #${nextPriorityIndex}).`,
          severity: 'info',
          category: 'Milestone',
          timestamp: nowIso,
          read: false,
          relatedTaskId: created.id,
        },
        ...autoRes.notifications,
        ...workspace.notifications,
      ],
    };

    if (!activeTimerTaskId) {
      setActiveTimerTaskId(created.id);
    }

    pushOrQueueUpdate(
      nextState,
      'CREATE_TASK',
      `Created ${created.code}: ${created.title} (priorityIndex: ${nextPriorityIndex})`
    );
  };

  const handleCreateMilestone = (
    newMilestoneInput: Omit<Milestone, 'id' | 'code' | 'position3D'>
  ) => {
    const idx = activeProjectMilestones.length + 1;
    const created: Milestone = {
      ...newMilestoneInput,
      id: `ms-${Date.now()}`,
      projectId: activeProject.id,
      code: `MS-0${idx}`,
    };

    const nextState: WorkspaceState = {
      ...workspace,
      milestones: [...workspace.milestones, created],
    };

    pushOrQueueUpdate(
      nextState,
      'UPDATE_TASK',
      `Created milestone ${created.code}: ${created.title}`
    );
  };

  const handleReorderTasks = (sourceTaskId: string, targetTaskId: string) => {
    const reorderedActive = reorderTasksByPriorityIndex(
      activeProjectTasks,
      sourceTaskId,
      targetTaskId
    );
    const otherTasks = workspace.tasks.filter(
      (t) => t.projectId && t.projectId !== activeProject.id
    );
    const movedTask = reorderedActive.find((t) => t.id === sourceTaskId);
    const nextState: WorkspaceState = {
      ...workspace,
      tasks: [...otherTasks, ...reorderedActive],
    };
    pushOrQueueUpdate(
      nextState,
      'REORDER_TASKS',
      `Reordered task priority: ${movedTask?.code ?? sourceTaskId} -> priorityIndex ${
        movedTask?.priorityIndex ?? 0
      }`
    );
    if (movedTask) {
      setStatusBanner(
        `Updated priority order: ${movedTask.code} moved to priorityIndex ${movedTask.priorityIndex} (#${
          movedTask.priorityIndex + 1
        }).`
      );
    }
  };

  const handleMoveTaskPriority = (taskId: string, direction: -1 | 1) => {
    const reorderedActive = moveTaskPriorityStep(activeProjectTasks, taskId, direction);
    const otherTasks = workspace.tasks.filter(
      (t) => t.projectId && t.projectId !== activeProject.id
    );
    const movedTask = reorderedActive.find((t) => t.id === taskId);
    const nextState: WorkspaceState = {
      ...workspace,
      tasks: [...otherTasks, ...reorderedActive],
    };
    pushOrQueueUpdate(
      nextState,
      'REORDER_TASKS',
      `Adjusted priorityIndex for ${movedTask?.code ?? taskId} to ${
        movedTask?.priorityIndex ?? 0
      }`
    );
    if (movedTask) {
      setStatusBanner(
        `Updated priority order: ${movedTask.code} is now priorityIndex ${movedTask.priorityIndex} (#${
          movedTask.priorityIndex + 1
        }).`
      );
    }
  };

  const handleUpdateTask = (taskId: string, patch: Partial<Task>) => {
    const existing = workspace.tasks.find((t) => t.id === taskId);
    if (!existing) return;

    const nowIso = new Date().toISOString();
    const candidate: Task = {
      ...existing,
      ...patch,
      updatedAt: nowIso,
    };

    const autoRes = evaluateAutomationRules(
      candidate,
      existing,
      workspace.automations,
      nowIso
    );

    const triggeredMap = new Map(autoRes.triggeredRules.map((r) => [r.id, r]));
    const nextAutomations = workspace.automations.map(
      (r) => triggeredMap.get(r.id) ?? r
    );

    const nextTasks = workspace.tasks.map((t) =>
      t.id === taskId ? autoRes.updatedTask : t
    );

    const nextState: WorkspaceState = {
      ...workspace,
      tasks: nextTasks,
      automations: nextAutomations,
      notifications: [...autoRes.notifications, ...workspace.notifications],
    };

    pushOrQueueUpdate(
      nextState,
      'UPDATE_TASK',
      `Updated ${existing.code} (${patch.status ?? 'attributes'})`
    );
  };

  const handleDeleteTask = (taskId: string) => {
    const target = workspace.tasks.find((t) => t.id === taskId);
    if (!target) return;
    const otherTasks = workspace.tasks.filter(
      (t) => t.projectId && t.projectId !== activeProject.id
    );
    const nextActiveTasks = activeProjectTasks
      .filter((t) => t.id !== taskId)
      .sort((a, b) => a.priorityIndex - b.priorityIndex)
      .map((t, idx) => ({
        ...t,
        priorityIndex: idx,
        dependencies: t.dependencies.filter((d) => d !== taskId),
      }));

    const nextState: WorkspaceState = {
      ...workspace,
      tasks: [...otherTasks, ...nextActiveTasks],
    };
    pushOrQueueUpdate(nextState, 'DELETE_TASK', `Deleted task ${target.code}`);
  };

  // Collaboration & RAG Handlers
  const handleSendMessage = (
    channelId: string,
    content: string,
    threadParentId?: string,
    ragData?: { isRagResponse: boolean; citations: string[] }
  ) => {
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      channelId,
      projectId: activeProject.id,
      senderId: currentUser.id,
      senderName: ragData?.isRagResponse ? 'KronoSphere RAG Copilot' : currentUser.name,
      senderRole: currentUser.role,
      content,
      timestamp: new Date().toISOString(),
      threadParentId,
      reactions: {},
      isRagResponse: ragData?.isRagResponse,
      citations: ragData?.citations,
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'message:create', payload: msg }));
    }

    const nextState: WorkspaceState = {
      ...workspace,
      messages: [...workspace.messages, msg],
    };
    pushOrQueueUpdate(nextState, 'SEND_MESSAGE', `Posted message in channel`);
  };

  const handleToggleReaction = (messageId: string, reactionKey: string) => {
    const nextMessages = workspace.messages.map((m) => {
      if (m.id !== messageId) return m;
      const existingUsers = m.reactions?.[reactionKey] || [];
      const hasReacted = existingUsers.includes(currentUser.id);
      const nextUsers = hasReacted
        ? existingUsers.filter((u) => u !== currentUser.id)
        : [...existingUsers, currentUser.id];
      return {
        ...m,
        reactions: {
          ...(m.reactions || {}),
          [reactionKey]: nextUsers,
        },
      };
    });
    setWorkspace((prev) => ({ ...prev, messages: nextMessages }));
  };

  const handleCreateChannel = (name: string, topic: string, isPrivate: boolean) => {
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-');
    const created: ChatChannel = {
      id: `chn-${Date.now()}`,
      projectId: activeProject.id,
      name: slug,
      topic,
      isPrivate,
      type: 'channel',
      createdAt: new Date().toISOString(),
    };
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'channel:create', payload: created }));
    }
    const nextState: WorkspaceState = {
      ...workspace,
      channels: [...workspace.channels, created],
    };
    pushOrQueueUpdate(nextState, 'SEND_MESSAGE', `Created channel #${slug}`);
  };

  const handleAddKnowledgeDoc = (
    docInput: Omit<KnowledgeDocument, 'id' | 'code' | 'updatedAt'>
  ) => {
    const idx = workspace.knowledgeDocs.length + 1;
    const created: KnowledgeDocument = {
      ...docInput,
      id: `doc-${Date.now()}`,
      code: `SOP-0${idx}`,
      updatedAt: new Date().toISOString(),
    };
    const nextState: WorkspaceState = {
      ...workspace,
      knowledgeDocs: [created, ...workspace.knowledgeDocs],
    };
    pushOrQueueUpdate(
      nextState,
      'UPDATE_TASK',
      `Indexed document ${created.code}: ${created.title} into RAG Knowledge Base`
    );
    setStatusBanner(`Indexed ${created.code} (${created.title}) into RAG Knowledge Base.`);
  };

  // RBAC User Authentication & Directory Handlers
  const handleAuthenticateUser = (user: TeamMember) => {
    setActiveRole(user.role);
    setWorkspace((prev) => ({ ...prev, currentUserId: user.id }));
    setStatusBanner(`Authenticated session switched to ${user.name} (${user.role}).`);
  };

  const handleCreateMember = (
    memberInput: Omit<TeamMember, 'id' | 'initials' | 'avatarHue'>
  ) => {
    const initials = memberInput.name
      .trim()
      .split(/\s+/)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 2);

    const created: TeamMember = {
      ...memberInput,
      id: `usr-${Date.now()}`,
      initials: initials || 'US',
      avatarHue: 0,
    };
    const nextState: WorkspaceState = {
      ...workspace,
      members: [...workspace.members, created],
    };
    pushOrQueueUpdate(
      nextState,
      'UPDATE_TASK',
      `Provisioned RBAC user ${created.name} (${created.role})`
    );
  };

  const handleUpdateMemberRole = (memberId: string, role: UserRole) => {
    const nextMembers = workspace.members.map((m) =>
      m.id === memberId ? { ...m, role } : m
    );
    if (memberId === currentUser.id) {
      setActiveRole(role);
    }
    pushOrQueueUpdate(
      { ...workspace, members: nextMembers },
      'UPDATE_TASK',
      `Updated user role to ${role}`
    );
  };

  const handleDeleteMember = (memberId: string) => {
    if (workspace.members.length <= 1) return;
    const nextMembers = workspace.members.filter((m) => m.id !== memberId);
    pushOrQueueUpdate(
      { ...workspace, members: nextMembers },
      'UPDATE_TASK',
      'Removed user from RBAC directory'
    );
  };

  const handleStartTimer = (taskId: string) => {
    if (activeTimerTaskId !== taskId) {
      setActiveTimerTaskId(taskId);
      setTimerSeconds(0);
    }
    setTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setTimerRunning(false);
  };

  const handleCommitTimerSession = () => {
    if (!activeTimerTaskId || timerSeconds <= 0) return;
    const durationMinutes = Math.max(15, Math.round(timerSeconds / 60));
    handleLogManualTime({
      projectId: activeProject.id,
      taskId: activeTimerTaskId,
      userId: currentUser.id,
      date: new Date().toISOString().slice(0, 10),
      durationMinutes,
      billable: true,
      notes: `Logged live chronometer session (${durationMinutes} mins).`,
    });
    setTimerRunning(false);
    setTimerSeconds(0);
  };

  const handleLogManualTime = (entryInput: Omit<TimeEntry, 'id'>) => {
    const newEntry: TimeEntry = {
      ...entryInput,
      projectId: activeProject.id,
      id: `tm-${Date.now()}`,
    };
    const additionalHours = Number((entryInput.durationMinutes / 60).toFixed(1));
    const targetTask = workspace.tasks.find((t) => t.id === entryInput.taskId);

    const nextTasks = workspace.tasks.map((t) =>
      t.id === entryInput.taskId
        ? {
            ...t,
            loggedHours: Number((t.loggedHours + additionalHours).toFixed(1)),
          }
        : t
    );

    const nextState: WorkspaceState = {
      ...workspace,
      tasks: nextTasks,
      timeEntries: [newEntry, ...workspace.timeEntries],
    };

    pushOrQueueUpdate(
      nextState,
      'LOG_TIME',
      `Logged ${entryInput.durationMinutes}m on ${targetTask?.code ?? entryInput.taskId}`
    );
  };

  const handleExportCsv = () => {
    const csv = generateCsvReport(
      activeProjectTasks,
      activeProjectTimeEntries,
      workspace.members
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeProject.code.toLowerCase()}-analytics-2026.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusBanner(
      `Exported CSV dataset (${activeProject.code.toLowerCase()}-analytics-2026.csv · ${activeProjectTasks.length} tasks).`
    );
  };

  const handleExportPdf = () => {
    const pdfBytes = generatePdfBinary(
      activeProject.name,
      analytics,
      activeProjectTasks,
      activeProjectMilestones
    );
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeProject.code.toLowerCase()}-executive-report-2026.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusBanner(
      `Exported PDF 1.4 Executive Report (${activeProject.code.toLowerCase()}-executive-report-2026.pdf · ${pdfBytes.byteLength} bytes).`
    );
  };

  const unreadCount = workspace.notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-950 dark:bg-black dark:text-zinc-100 font-sans">
      {/* First-Load Enterprise Installation & Multi-Project Provisioning Wizard */}
      {(!workspace.isSetupComplete || installerModalOpen) && (
        <SetupInstallerModal
          initialOrgName={workspace.organizationName}
          initialDomain={workspace.organizationDomain}
          initialProjects={workspace.projects}
          initialMembers={workspace.members}
          initialChannels={workspace.channels}
          onCompleteSetup={handleCompleteFirstLoadSetup}
        />
      )}

      {/* Strict 3-Zone Top Bar Contract — Pure Black & White Architectural Minimalism */}
      <header className="flex items-center justify-between gap-4 md:gap-8 px-4 sm:px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('dashboard');
          }}
          className="text-lg font-bold tracking-tight text-zinc-950 dark:text-white whitespace-nowrap shrink-0"
        >
          KronoSphere
        </a>

        {/* Zone 2: 5 concise single-line navigation links (3D Topology removed; Collaboration & RAG added) */}
        <nav
          aria-label="Primary Workspace Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-500 dark:text-zinc-400"
        >
          {(
            [
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'tasks', label: 'Tasks & DAG' },
              { id: 'collaboration', label: 'Collaboration & RAG' },
              { id: 'timetracking', label: 'Time & Reports' },
              { id: 'automation', label: 'Users, RBAC & Automation' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                activeTab === item.id
                  ? 'border-zinc-950 dark:border-white text-zinc-950 dark:text-white font-semibold'
                  : 'border-transparent hover:text-zinc-950 dark:hover:text-zinc-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleExportPdf}
            className="px-3.5 sm:px-4 py-2 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Export Report
          </button>
        </div>
      </header>

      {/* Mobile Navigation Strip (< 768px) */}
      <nav
        aria-label="Mobile Workspace Navigation"
        className="flex md:hidden items-center gap-2 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-x-auto"
      >
        {(
          [
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'tasks', label: 'Tasks & DAG' },
            { id: 'collaboration', label: 'Channels & RAG' },
            { id: 'timetracking', label: 'Time & Reports' },
            { id: 'automation', label: 'Users & RBAC' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
              activeTab === item.id
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-black font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Secondary Multi-Project & RBAC Session Control Bar */}
      <div className="px-6 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-zinc-600 dark:text-zinc-400">
          <span className="font-semibold text-zinc-950 dark:text-white">
            {workspace.organizationName}
          </span>
          <span aria-hidden="true">·</span>

          {/* Multi-Project Portfolio Selector */}
          <label className="inline-flex items-center gap-1.5">
            <FolderKanban className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
            <span className="sr-only">Active Project</span>
            <select
              value={activeProject.id}
              onChange={(e) => handleSelectProject(e.target.value)}
              data-testid="global-project-switcher"
              className="px-2 py-0.5 text-xs font-mono font-semibold rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white"
            >
              {workspace.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name} ({p.industrySector.split(' ')[0]})
                </option>
              ))}
            </select>
          </label>

          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setActiveTab('automation')}
            className="inline-flex items-center gap-1 hover:underline"
          >
            <Shield className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
            <span>
              User: <strong className="text-zinc-950 dark:text-white">{currentUser.name}</strong> ({activeRole})
            </span>
          </button>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            Chronometer: {Math.floor(timerSeconds / 60)}m {timerSeconds % 60}s
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Re-Open First-Load System Setup Wizard */}
          <button
            type="button"
            onClick={() => setInstallerModalOpen(true)}
            data-testid="open-setup-wizard-btn"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>System Setup</span>
          </button>

          {/* Offline Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsOffline((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium transition-colors whitespace-nowrap shrink-0 ${
              isOffline
                ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-black dark:border-white'
                : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {isOffline ? (
              <>
                <CloudOff className="w-3.5 h-3.5" />
                Offline Mode ({offlineQueue.length} queued)
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5" />
                Cloud Connected
              </>
            )}
          </button>

          {offlineQueue.length > 0 && (
            <button
              type="button"
              onClick={handleSyncCloudNow}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              Sync {offlineQueue.length} Changes
            </button>
          )}

          {/* Notifications Drawer Toggle */}
          <button
            type="button"
            onClick={() => setNotificationsOpen((prev) => !prev)}
            aria-label={`Notifications (${unreadCount} unread)`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts ({unreadCount})</span>
          </button>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={() => setIsDark((prev) => !prev)}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5" />
                Light
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5" />
                Dark
              </>
            )}
          </button>
        </div>
      </div>

      {/* Action / Export Status Banner */}
      {statusBanner && (
        <div
          role="status"
          className="px-6 py-2 bg-zinc-950 text-white dark:bg-white dark:text-black text-xs font-medium flex items-center justify-between border-b border-zinc-800 dark:border-zinc-200"
        >
          <span>{statusBanner}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            aria-label="Dismiss status message"
            className="p-0.5 hover:opacity-80"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Real-Time Notifications Slide-Down Panel */}
      {notificationsOpen && (
        <aside
          aria-label="Real-Time Milestone & Workflow Alerts"
          className="mx-6 mt-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg space-y-3"
        >
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
              Real-Time Milestone, DMAIC & Workflow Notifications
            </h2>
            <div className="flex items-center gap-3">
              {workspace.notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setWorkspace((prev) => ({
                      ...prev,
                      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
                    }))
                  }
                  className="text-xs font-medium text-zinc-950 dark:text-white underline"
                >
                  Mark All Read
                </button>
              )}
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                aria-label="Close notifications panel"
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {workspace.notifications.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center">
              No operational alerts triggered yet. Notifications appear automatically when tasks, milestones, or DMAIC automation rules execute.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto">
              {workspace.notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-lg border text-xs ${
                    n.read
                      ? 'border-zinc-200 dark:border-zinc-800 opacity-70'
                      : 'border-zinc-900 dark:border-zinc-200 bg-zinc-50 dark:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>
                      {n.category} · {n.severity.toUpperCase()}
                    </span>
                    <span className="font-mono">
                      {new Date(n.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="font-semibold text-zinc-950 dark:text-white mt-0.5">
                    {n.title}
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-400 mt-0.5">{n.message}</div>
                </div>
              ))}
            </div>
          )}
        </aside>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            projectName={activeProject.name}
            projectCode={activeProject.code}
            industrySector={activeProject.industrySector}
            projects={workspace.projects}
            activeProjectId={activeProject.id}
            analytics={analytics}
            criticalPath={criticalPath}
            milestones={activeProjectMilestones}
            tasks={activeProjectTasks}
            notifications={workspace.notifications}
            widgets={workspace.widgets}
            isOffline={isOffline}
            pendingOfflineCount={offlineQueue.length}
            lastSyncedAt={workspace.lastSyncedAt}
            encryptionFingerprint={workspace.encryptionKeyFingerprint}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            onUpdateWorkspaceMeta={handleUpdateWorkspaceMeta}
            onUpdateWidgets={(nextWidgets: DashboardWidgetConfig[]) =>
              setWorkspace((prev) => ({ ...prev, widgets: nextWidgets }))
            }
            onTriggerSync={handleSyncCloudNow}
            onExportCsv={handleExportCsv}
            onExportPdf={handleExportPdf}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksAndDependenciesView
            tasks={activeProjectTasks}
            milestones={activeProjectMilestones}
            members={workspace.members}
            criticalPath={criticalPath}
            activeRole={activeRole}
            defaultSector={activeProject.industrySector}
            canPerform={canPerform}
            activeTimerTaskId={activeTimerTaskId}
            onStartTimer={(taskId) => {
              handleStartTimer(taskId);
              setStatusBanner(
                `Started live task timer for ${
                  activeProjectTasks.find((t) => t.id === taskId)?.code ?? taskId
                }.`
              );
            }}
            onCreateTask={handleCreateTask}
            onCreateMilestone={handleCreateMilestone}
            onUpdateTask={handleUpdateTask}
            onReorderTasks={handleReorderTasks}
            onMoveTaskPriority={handleMoveTaskPriority}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeTab === 'collaboration' && (
          <CollaborationAndRagView
            workspace={workspace}
            currentUser={currentUser}
            wsConnected={wsConnected}
            onlineUserCount={onlineUserCount}
            onSendMessage={handleSendMessage}
            onToggleReaction={handleToggleReaction}
            onCreateChannel={handleCreateChannel}
            onAddKnowledgeDoc={handleAddKnowledgeDoc}
          />
        )}

        {activeTab === 'timetracking' && (
          <TimeTrackingAndReportsView
            tasks={activeProjectTasks}
            members={workspace.members}
            timeEntries={activeProjectTimeEntries}
            analytics={analytics}
            activeRole={activeRole}
            canPerform={canPerform}
            activeTimerTaskId={activeTimerTaskId}
            timerSeconds={timerSeconds}
            timerRunning={timerRunning}
            onStartTimer={handleStartTimer}
            onPauseTimer={handlePauseTimer}
            onCommitTimerSession={handleCommitTimerSession}
            onLogManualTime={handleLogManualTime}
            onExportCsv={handleExportCsv}
            onExportPdf={handleExportPdf}
          />
        )}

        {activeTab === 'automation' && (
          <AutomationAndSecurityView
            members={workspace.members}
            currentUser={currentUser}
            automations={workspace.automations}
            permissions={workspace.permissions}
            files={workspace.files}
            activeRole={activeRole}
            canPerform={canPerform}
            onChangeActiveRole={setActiveRole}
            onAuthenticateUser={handleAuthenticateUser}
            onCreateMember={handleCreateMember}
            onUpdateMemberRole={handleUpdateMemberRole}
            onDeleteMember={handleDeleteMember}
            onToggleAutomation={(ruleId) => {
              const nextRules = workspace.automations.map((r) =>
                r.id === ruleId ? { ...r, enabled: !r.enabled } : r
              );
              pushOrQueueUpdate(
                { ...workspace, automations: nextRules },
                'TOGGLE_AUTOMATION',
                `Toggled automation rule ${ruleId}`
              );
            }}
            onCreateAutomation={(newRule) => {
              const created: AutomationRule = {
                ...newRule,
                id: `auto-${Date.now()}`,
                projectId: activeProject.id,
                executionCount: 0,
              };
              pushOrQueueUpdate(
                { ...workspace, automations: [created, ...workspace.automations] },
                'TOGGLE_AUTOMATION',
                `Created automation rule "${created.name}"`
              );
            }}
            onTogglePermissionCell={(role, action) => {
              setWorkspace((prev) => ({
                ...prev,
                permissions: {
                  ...prev.permissions,
                  [role]: {
                    ...prev.permissions[role],
                    [action]: !prev.permissions[role][action],
                  },
                },
              }));
            }}
            onCreateEncryptedBackup={async (bundle: EncryptedVaultBundle) => {
              await fetch('/api/backups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bundle),
              }).catch(() => {});
            }}
            workspaceSnapshotJson={JSON.stringify(workspace)}
          />
        )}
      </main>

      {/* Clean Minimalist Monochrome Footer */}
      <footer className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          KronoSphere Multi-Project Execution, Six Sigma (DMAIC) & RAG Collaboration Suite · Apache-2.0 License
        </div>
        <div className="flex items-center gap-4">
          <span>Cross-Platform Sync: macOS · Windows · iOS · Android</span>
          <span>·</span>
          <span>End-to-End AES-GCM-256 Encrypted</span>
        </div>
      </footer>
    </div>
  );
}
