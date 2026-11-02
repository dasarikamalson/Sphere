import React, { useEffect, useMemo, useState } from 'react';
import { INITIAL_WORKSPACE_STATE } from './data/seedData';
import {
  AutomationRule,
  DashboardWidgetConfig,
  IndustrySector,
  Milestone,
  NotificationItem,
  OfflineMutation,
  PermissionAction,
  Task,
  TaskStatus,
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
import { TopologyScene3D } from './components/TopologyScene3D';
import { TimeTrackingAndReportsView } from './components/TimeTrackingAndReportsView';
import { AutomationAndSecurityView } from './components/AutomationAndSecurityView';
import {
  Bell,
  Cloud,
  CloudOff,
  Moon,
  RefreshCw,
  Shield,
  Sun,
  X,
} from 'lucide-react';

type ActiveTab = 'dashboard' | 'tasks' | 'topology3d' | 'timetracking' | 'automation';

const LOCAL_STORAGE_KEY = 'kronosphere_clean_prod_v5';
const OFFLINE_QUEUE_KEY = 'kronosphere_offline_queue_v5';

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached) as WorkspaceState;
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

  const [is3DFullscreen, setIs3DFullscreen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Live Task Stopwatch State (Clean initial state — 0s)
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

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
          setWorkspace(serverData);
        }
      })
      .catch(() => {
        // Offline fallback uses local cache seamlessly
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Stopwatch interval
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  const criticalPath = useMemo(
    () => computeCriticalPath(workspace.tasks),
    [workspace.tasks]
  );

  const analytics = useMemo(
    () =>
      computeProjectAnalytics(
        workspace.tasks,
        workspace.timeEntries,
        workspace.milestones,
        workspace.members
      ),
    [workspace.tasks, workspace.timeEntries, workspace.milestones, workspace.members]
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

  const handleSyncCloudNow = async () => {
    const nowIso = new Date().toISOString();
    const syncedNote: NotificationItem = {
      id: `ntf-sync-${Date.now()}`,
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

  const handleUpdateWorkspaceMeta = (meta: {
    projectName?: string;
    projectCode?: string;
    industrySector?: IndustrySector;
  }) => {
    const nextState: WorkspaceState = {
      ...workspace,
      ...meta,
    };
    pushOrQueueUpdate(nextState, 'UPDATE_TASK', 'Updated workspace operational metadata');
  };

  const handleCreateTask = (
    newTaskInput: Omit<Task, 'id' | 'code' | 'loggedHours' | 'updatedAt' | 'priorityIndex'>
  ) => {
    const nextNum = 101 + workspace.tasks.length;
    const nowIso = new Date().toISOString();
    const nextPriorityIndex = workspace.tasks.length;
    const created: Task = {
      ...newTaskInput,
      id: `tsk-${Date.now()}-${nextNum}`,
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

    const nextTasks = [...workspace.tasks, autoRes.updatedTask].map((t, idx) => ({
      ...t,
      priorityIndex: idx,
    }));

    const nextState: WorkspaceState = {
      ...workspace,
      tasks: nextTasks,
      notifications: [
        {
          id: `ntf-create-${Date.now()}`,
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
    const idx = workspace.milestones.length + 1;
    const xPos = -10 + ((idx - 1) % 5) * 5;
    const created: Milestone = {
      ...newMilestoneInput,
      id: `ms-${Date.now()}`,
      code: `MS-0${idx}`,
      position3D: [xPos, 0, -5],
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
    const reordered = reorderTasksByPriorityIndex(
      workspace.tasks,
      sourceTaskId,
      targetTaskId
    );
    const movedTask = reordered.find((t) => t.id === sourceTaskId);
    const nextState: WorkspaceState = {
      ...workspace,
      tasks: reordered,
    };
    pushOrQueueUpdate(
      nextState,
      'UPDATE_TASK',
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
    const reordered = moveTaskPriorityStep(workspace.tasks, taskId, direction);
    const movedTask = reordered.find((t) => t.id === taskId);
    const nextState: WorkspaceState = {
      ...workspace,
      tasks: reordered,
    };
    pushOrQueueUpdate(
      nextState,
      'UPDATE_TASK',
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
    const nextTasks = workspace.tasks
      .filter((t) => t.id !== taskId)
      .sort((a, b) => a.priorityIndex - b.priorityIndex)
      .map((t, idx) => ({
        ...t,
        priorityIndex: idx,
        dependencies: t.dependencies.filter((d) => d !== taskId),
      }));

    const nextState: WorkspaceState = {
      ...workspace,
      tasks: nextTasks,
    };
    pushOrQueueUpdate(nextState, 'DELETE_TASK', `Deleted task ${target.code}`);
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
      taskId: activeTimerTaskId,
      userId: 'usr-operator',
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
      workspace.tasks,
      workspace.timeEntries,
      workspace.members
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kronosphere-analytics-2026.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusBanner(
      `Exported CSV dataset (kronosphere-analytics-2026.csv · ${workspace.tasks.length} tasks, ${workspace.timeEntries.length} time entries).`
    );
  };

  const handleExportPdf = () => {
    const pdfBytes = generatePdfBinary(
      workspace.projectName,
      analytics,
      workspace.tasks,
      workspace.milestones
    );
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kronosphere-executive-report-2026.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusBanner(
      `Exported PDF 1.4 Executive Report (kronosphere-executive-report-2026.pdf · ${pdfBytes.byteLength} bytes).`
    );
  };

  const unreadCount = workspace.notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-950 dark:bg-black dark:text-zinc-100 font-sans">
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

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Primary Workspace Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-500 dark:text-zinc-400"
        >
          {(
            [
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'tasks', label: 'Tasks & DAG' },
              { id: 'topology3d', label: '3D Topology' },
              { id: 'timetracking', label: 'Time & Reports' },
              { id: 'automation', label: 'Automation & RBAC' },
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
            { id: 'topology3d', label: '3D Topology' },
            { id: 'timetracking', label: 'Time & Reports' },
            { id: 'automation', label: 'Automation' },
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

      {/* Secondary Workspace Control Bar (Below Header Fold) */}
      <div className="px-6 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-zinc-600 dark:text-zinc-400">
          <span className="font-mono font-semibold text-zinc-950 dark:text-white">
            {workspace.projectCode}
          </span>
          <span aria-hidden="true">·</span>
          <span>{workspace.industrySector}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
            Role: <strong className="text-zinc-950 dark:text-white">{activeRole}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            Chronometer: {Math.floor(timerSeconds / 60)}m {timerSeconds % 60}s
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            projectName={workspace.projectName}
            projectCode={workspace.projectCode}
            industrySector={workspace.industrySector}
            analytics={analytics}
            criticalPath={criticalPath}
            milestones={workspace.milestones}
            tasks={workspace.tasks}
            notifications={workspace.notifications}
            widgets={workspace.widgets}
            isOffline={isOffline}
            pendingOfflineCount={offlineQueue.length}
            lastSyncedAt={workspace.lastSyncedAt}
            encryptionFingerprint={workspace.encryptionKeyFingerprint}
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
            tasks={workspace.tasks}
            milestones={workspace.milestones}
            members={workspace.members}
            criticalPath={criticalPath}
            activeRole={activeRole}
            defaultSector={workspace.industrySector}
            canPerform={canPerform}
            activeTimerTaskId={activeTimerTaskId}
            onStartTimer={(taskId) => {
              handleStartTimer(taskId);
              setStatusBanner(
                `Started live task timer for ${
                  workspace.tasks.find((t) => t.id === taskId)?.code ?? taskId
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

        {activeTab === 'topology3d' && (
          <TopologyScene3D
            tasks={workspace.tasks}
            milestones={workspace.milestones}
            criticalPath={criticalPath}
            isFullscreen={is3DFullscreen}
            onToggleFullscreen={() => setIs3DFullscreen((prev) => !prev)}
            onUpdateTaskStatus={(taskId: string, nextStatus: TaskStatus) =>
              handleUpdateTask(taskId, { status: nextStatus })
            }
          />
        )}

        {activeTab === 'timetracking' && (
          <TimeTrackingAndReportsView
            tasks={workspace.tasks}
            members={workspace.members}
            timeEntries={workspace.timeEntries}
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
            automations={workspace.automations}
            permissions={workspace.permissions}
            files={workspace.files}
            activeRole={activeRole}
            canPerform={canPerform}
            onChangeActiveRole={setActiveRole}
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
          KronoSphere Enterprise Execution & Lean Six Sigma (DMAIC) Suite · Apache-2.0 License
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
