import React, { useState } from 'react';
import {
  DashboardWidgetConfig,
  DmaicPhase,
  IndustrySector,
  Milestone,
  NotificationItem,
  ProjectEntity,
  Task,
  WidgetId,
} from '../types/project';
import {
  CriticalPathAnalysis,
  DMAIC_METHODOLOGY_GUIDE,
  ProjectAnalyticsSummary,
} from '../utils/projectEngine';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FolderKanban,
  GripVertical,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  X,
} from 'lucide-react';

interface DashboardViewProps {
  projectName: string;
  projectCode: string;
  industrySector: IndustrySector;
  projects: ProjectEntity[];
  activeProjectId: string;
  analytics: ProjectAnalyticsSummary;
  criticalPath: CriticalPathAnalysis;
  milestones: Milestone[];
  tasks: Task[];
  notifications: NotificationItem[];
  widgets: DashboardWidgetConfig[];
  isOffline: boolean;
  pendingOfflineCount: number;
  lastSyncedAt: string;
  encryptionFingerprint: string;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (proj: Omit<ProjectEntity, 'id' | 'createdAt'>) => void;
  onUpdateWorkspaceMeta: (meta: {
    projectName?: string;
    projectCode?: string;
    industrySector?: IndustrySector;
  }) => void;
  onUpdateWidgets: (nextWidgets: DashboardWidgetConfig[]) => void;
  onTriggerSync: () => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  onNavigateToTab: (
    tab: 'dashboard' | 'tasks' | 'collaboration' | 'timetracking' | 'automation'
  ) => void;
}

const SECTORS: IndustrySector[] = [
  'Construction & Civil',
  'Event Production',
  'Tech Development',
  'Manufacturing & Ops',
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  projectName,
  projectCode,
  industrySector,
  projects,
  activeProjectId,
  analytics,
  criticalPath,
  milestones,
  tasks,
  notifications,
  widgets,
  isOffline,
  pendingOfflineCount,
  lastSyncedAt,
  encryptionFingerprint,
  onSelectProject,
  onCreateProject,
  onUpdateWorkspaceMeta,
  onUpdateWidgets,
  onTriggerSync,
  onExportCsv,
  onExportPdf,
  onNavigateToTab,
}) => {
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [draggedWidgetId, setDraggedWidgetId] = useState<WidgetId | null>(null);
  const [chartMetric, setChartMetric] = useState<'points' | 'hours'>('points');
  const [selectedSprintIndex, setSelectedSprintIndex] = useState<number>(0);
  const [selectedMethodologyPhase, setSelectedMethodologyPhase] = useState<DmaicPhase>('Define');

  // Create New Project Modal State
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjCode, setNewProjCode] = useState(`PRJ-00${projects.length + 1}`);
  const [newProjSector, setNewProjSector] = useState<IndustrySector>(industrySector);
  const [newProjDesc, setNewProjDesc] = useState('');

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);
  const visibleWidgets = sortedWidgets.filter((w) => w.visible);

  const handleToggleWidget = (id: WidgetId) => {
    const next = widgets.map((w) =>
      w.id === id ? { ...w, visible: !w.visible } : w
    );
    onUpdateWidgets(next);
  };

  const handleMoveWidget = (id: WidgetId, direction: -1 | 1) => {
    const ordered = [...widgets].sort((a, b) => a.order - b.order);
    const idx = ordered.findIndex((w) => w.id === id);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= ordered.length) return;

    const swapped = [...ordered];
    const temp = swapped[idx];
    swapped[idx] = swapped[targetIdx];
    swapped[targetIdx] = temp;

    const reindexed = swapped.map((w, i) => ({ ...w, order: i }));
    onUpdateWidgets(reindexed);
  };

  const handleDropOnWidget = (targetId: WidgetId) => {
    if (!draggedWidgetId || draggedWidgetId === targetId) return;
    const ordered = [...widgets].sort((a, b) => a.order - b.order);
    const fromIdx = ordered.findIndex((w) => w.id === draggedWidgetId);
    const toIdx = ordered.findIndex((w) => w.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;

    const updated = [...ordered];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    onUpdateWidgets(updated.map((w, i) => ({ ...w, order: i })));
    setDraggedWidgetId(null);
  };

  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || !newProjCode.trim()) return;
    onCreateProject({
      name: newProjName.trim(),
      code: newProjCode.trim().toUpperCase(),
      industrySector: newProjSector,
      description:
        newProjDesc.trim() ||
        `${newProjSector} program governed by Six Sigma DMAIC control.`,
      targetSigmaLevel: 6.0,
      leadName: 'Project Lead',
    });
    setNewProjName('');
    setNewProjCode(`PRJ-00${projects.length + 2}`);
    setNewProjDesc('');
    setIsNewProjectOpen(false);
  };

  const selectedSprint =
    analytics.velocitySeries[selectedSprintIndex] ??
    analytics.velocitySeries[0];

  const activeMethodologyStep =
    DMAIC_METHODOLOGY_GUIDE.find((s) => s.phase === selectedMethodologyPhase) ||
    DMAIC_METHODOLOGY_GUIDE[0];

  return (
    <div className="space-y-6">
      {/* Executive Header & Action Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {projectCode}
            </span>
            <span aria-hidden="true">·</span>
            <span>{industrySector}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              Six Sigma: {analytics.sixSigma.sigmaLevel}σ ({analytics.sixSigma.dpmo} DPMO)
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              Critical Path: {criticalPath.totalCriticalHours}h ({criticalPath.criticalTaskIds.length} nodes)
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {isOffline
                ? `Offline Mode (${pendingOfflineCount} queued)`
                : `Synced ${new Date(lastSyncedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white mt-1">
            {projectName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsNewProjectOpen(true)}
            data-testid="new-project-btn"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
          >
            <FolderKanban className="w-3.5 h-3.5" />
            + New Project
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab('tasks')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Manage Tasks & Priority
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab('collaboration')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Channels & RAG Copilot
          </button>

          <button
            type="button"
            onClick={() => setCustomizeOpen((prev) => !prev)}
            aria-expanded={customizeOpen}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              customizeOpen
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-black border-zinc-950 dark:border-white'
                : 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Customize Widgets
          </button>

          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={onExportPdf}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export PDF Report
          </button>
        </div>
      </div>

      {/* Create New Project Modal */}
      {isNewProjectOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
        >
          <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                Create New Project in Portfolio
              </h2>
              <button
                type="button"
                onClick={() => setIsNewProjectOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateProjectSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="new-project-name"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Project Name
                </label>
                <input
                  id="new-project-name"
                  type="text"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g., Metro Bridge Civil Expansion / Global Keynote Production"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="new-project-code"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Project Code
                  </label>
                  <input
                    id="new-project-code"
                    type="text"
                    value={newProjCode}
                    onChange={(e) => setNewProjCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-project-sector"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Industry Sector
                  </label>
                  <select
                    id="new-project-sector"
                    value={newProjSector}
                    onChange={(e) => setNewProjSector(e.target.value as IndustrySector)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                  >
                    {SECTORS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Charter Scope Description
                </label>
                <textarea
                  rows={2}
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Brief operational charter and Six Sigma quality target..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewProjectOpen(false)}
                  className="px-3.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-black"
                >
                  Create & Switch Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Project Portfolio Switcher & Operational Sector Configurator */}
      <section className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-950 dark:text-white">
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Multi-Project Portfolio ({projects.length} Active Program{projects.length === 1 ? '' : 's'})</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {projects.map((p) => {
              const active = p.id === activeProjectId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectProject(p.id)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                    active
                      ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-black dark:border-white font-semibold'
                      : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="font-mono mr-1.5">{p.code}</span>
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label
              htmlFor="workspace-name-input"
              className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1"
            >
              Active Project Title
            </label>
            <input
              id="workspace-name-input"
              type="text"
              value={projectName}
              onChange={(e) => onUpdateWorkspaceMeta({ projectName: e.target.value })}
              placeholder="Enter project title (e.g., Apex Tower Construction / Global Summit 2026 / Core Platform v2)"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="workspace-code-input"
              className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1"
            >
              Project Code
            </label>
            <input
              id="workspace-code-input"
              type="text"
              value={projectCode}
              onChange={(e) => onUpdateWorkspaceMeta({ projectCode: e.target.value })}
              className="w-full px-3 py-1.5 text-xs tabular-nums rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white"
            />
          </div>

          <div className="md:col-span-5">
            <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Industry Operational Domain
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {SECTORS.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onUpdateWorkspaceMeta({ industrySector: sec })}
                  className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-colors truncate ${
                    industrySector === sec
                      ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-black dark:border-white'
                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  {sec.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Drag-and-Drop & Accessible Widget Customizer Drawer */}
      {customizeOpen && (
        <section
          aria-label="Dashboard Widget Customizer"
          className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
                Personalize Dashboard Layout
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Drag and drop cards below or use reorder controls to customize widget sequence and visibility.
              </p>
            </div>
            <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              {visibleWidgets.length} of {widgets.length} Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            {sortedWidgets.map((w, idx) => (
              <div
                key={w.id}
                draggable
                onDragStart={() => setDraggedWidgetId(w.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnWidget(w.id)}
                className={`p-3 rounded-lg border transition-colors cursor-move flex flex-col justify-between gap-2 ${
                  w.visible
                    ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900'
                    : 'border-dashed border-zinc-200 dark:border-zinc-800 opacity-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="text-xs font-medium text-zinc-950 dark:text-white line-clamp-1">
                      {w.title}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveWidget(w.id, -1)}
                      aria-label={`Move ${w.title} earlier`}
                      className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 text-zinc-600 dark:text-zinc-400"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === sortedWidgets.length - 1}
                      onClick={() => handleMoveWidget(w.id, 1)}
                      aria-label={`Move ${w.title} later`}
                      className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 text-zinc-600 dark:text-zinc-400"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleWidget(w.id)}
                    aria-label={w.visible ? `Hide ${w.title}` : `Show ${w.title}`}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-900 dark:text-zinc-200 hover:underline"
                  >
                    {w.visible ? (
                      <>
                        <Eye className="w-3 h-3" /> Visible
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" /> Hidden
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Full-Width 4-Column Executive & Six Sigma KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Schedule Completion Rate
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tabular-nums text-zinc-950 dark:text-white">
              {analytics.completionRatePct}%
            </span>
            <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              {analytics.completedTasks} / {analytics.totalTasks} tasks
            </span>
          </div>
          <div className="mt-3 w-full h-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-zinc-950 dark:bg-white rounded-full transition-all"
              style={{ width: `${analytics.completionRatePct}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Six Sigma Quality Level
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tabular-nums text-zinc-950 dark:text-white">
              {analytics.sixSigma.sigmaLevel}σ
            </span>
            <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              {analytics.sixSigma.dpmo.toLocaleString()} DPMO
            </span>
          </div>
          <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            Process Yield: {analytics.sixSigma.yieldPct}% · Cpk: {analytics.sixSigma.cpk}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Tracked Operational Hours
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tabular-nums text-zinc-950 dark:text-white">
              {analytics.totalLoggedHours}h
            </span>
            <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              of {analytics.totalEstimatedHours}h budgeted
            </span>
          </div>
          <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            Cost Burn: ${analytics.totalBudgetCostUsd.toLocaleString()} USD
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Active Gate Blockers
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tabular-nums text-zinc-950 dark:text-white">
              {analytics.activeBlockers}
            </span>
            <button
              type="button"
              onClick={() => onNavigateToTab('tasks')}
              className="text-xs font-medium text-zinc-900 dark:text-zinc-200 hover:underline"
            >
              Open Priority Queue →
            </button>
          </div>
          <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            {criticalPath.blockedTaskIds.length} dependent packages gated
          </div>
        </div>
      </div>

      {/* Customizable Drag-and-Drop Dashboard Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleWidgets.map((widget) => {
          if (widget.id === 'dmaic_methodology') {
            return (
              <section
                key={widget.id}
                draggable
                onDragStart={() => setDraggedWidgetId(widget.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnWidget(widget.id)}
                data-testid="dmaic-methodology-panel"
                className="lg:col-span-2 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-start gap-2.5">
                    <BookOpen className="w-4 h-4 text-zinc-950 dark:text-white mt-0.5 shrink-0" />
                    <div>
                      <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                        {widget.title}
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Plain-English Six Sigma implementation guide showing how Define, Measure, Analyze, Improve, and Control map directly to KronoSphere modules
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 shrink-0">
                    DMAIC → Tool Mapping Guide
                  </span>
                </div>

                {/* 5-Phase Interactive Selector Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {DMAIC_METHODOLOGY_GUIDE.map((stepItem) => {
                    const isSelected = stepItem.phase === selectedMethodologyPhase;
                    return (
                      <button
                        key={stepItem.phase}
                        type="button"
                        onClick={() => setSelectedMethodologyPhase(stepItem.phase)}
                        data-testid={`methodology-tab-${stepItem.phase.toLowerCase()}`}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          isSelected
                            ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-black dark:border-white'
                            : 'bg-zinc-50 dark:bg-zinc-900/60 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                        }`}
                      >
                        <div className="text-[11px] font-mono opacity-75">
                          Step {stepItem.stepNumber}
                        </div>
                        <div className="text-sm font-bold mt-0.5">
                          {stepItem.phase}
                        </div>
                        <div className="text-[11px] opacity-80 line-clamp-1 mt-0.5">
                          {stepItem.mappedFeatureLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Active DMAIC Phase Detailed Mapping Card */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-7 space-y-3">
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                        Phase {activeMethodologyStep.stepNumber} · {activeMethodologyStep.phase} — Plain-English Principle
                      </div>
                      <h3 className="text-sm font-bold text-zinc-950 dark:text-white mt-0.5">
                        {activeMethodologyStep.tagline}
                      </h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                        {activeMethodologyStep.plainLanguageExplanation}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-1.5">
                      <div className="text-[11px] font-mono uppercase text-zinc-500">
                        How KronoSphere Implements & Automates {activeMethodologyStep.phase}
                      </div>
                      <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
                        {activeMethodologyStep.kronosphereToolMapping}
                      </p>
                      <div className="pt-1.5">
                        <button
                          type="button"
                          onClick={() => onNavigateToTab(activeMethodologyStep.mappedTab)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity"
                        >
                          Open {activeMethodologyStep.mappedFeatureLabel} →
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 space-y-3">
                    <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-1.5">
                      <div className="text-[11px] font-mono uppercase text-zinc-500">
                        Tracked Outputs in {activeMethodologyStep.phase}
                      </div>
                      <ul className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                        {activeMethodologyStep.keyOutputs.map((out, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 dark:bg-white shrink-0" />
                            <span>{out}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-1.5 text-xs">
                      <div className="text-[11px] font-mono uppercase text-zinc-500">
                        Real-World Sector Playbook
                      </div>
                      <div className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                        <div>
                          <strong className="text-zinc-950 dark:text-white">Construction:</strong>{' '}
                          {activeMethodologyStep.industryExamples.construction}
                        </div>
                        <div>
                          <strong className="text-zinc-950 dark:text-white">Events:</strong>{' '}
                          {activeMethodologyStep.industryExamples.events}
                        </div>
                        <div>
                          <strong className="text-zinc-950 dark:text-white">Tech Dev:</strong>{' '}
                          {activeMethodologyStep.industryExamples.tech}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          }

          if (widget.id === 'six_sigma_dmaic') {
            return (
              <section
                key={widget.id}
                draggable
                onDragStart={() => setDraggedWidgetId(widget.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnWidget(widget.id)}
                className="lg:col-span-2 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                      {widget.title}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {widget.subtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs tabular-nums text-zinc-600 dark:text-zinc-300">
                    <span>Defects: {analytics.sixSigma.totalDefects}</span>
                    <span>·</span>
                    <span>Opportunities: {analytics.sixSigma.totalOpportunities}</span>
                    <span>·</span>
                    <span className="font-semibold text-zinc-950 dark:text-white">
                      {analytics.sixSigma.sigmaLevel} Sigma
                    </span>
                  </div>
                </div>

                {/* 5-Stage DMAIC Architecture Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {analytics.sixSigma.dmaicBreakdown.map((stage, i) => {
                    const pct =
                      stage.total > 0
                        ? Math.round((stage.completed / stage.total) * 100)
                        : 0;
                    return (
                      <div
                        key={stage.phase}
                        className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-950 dark:text-white">
                            0{i + 1}. {stage.phase}
                          </span>
                          <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                            {stage.completed}/{stage.total}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-950 dark:bg-white rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                          <span>Completion: {pct}%</span>
                          <span>Defects: {stage.defects}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          }

          if (widget.id === 'velocity_burndown') {
            return (
              <section
                key={widget.id}
                draggable
                onDragStart={() => setDraggedWidgetId(widget.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnWidget(widget.id)}
                className="lg:col-span-2 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                      {widget.title}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {widget.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setChartMetric('points')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        chartMetric === 'points'
                          ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                      }`}
                    >
                      Planned vs Delivered Hours
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMetric('hours')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        chartMetric === 'hours'
                          ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                      }`}
                    >
                      Logged Time
                    </button>
                  </div>
                </div>

                {/* Interactive SVG Data Visualization */}
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-9">
                    <svg
                      viewBox="0 0 680 210"
                      className="w-full h-52 overflow-visible"
                      role="img"
                      aria-label="DMAIC Phase Execution Trajectory Chart"
                    >
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const y = 20 + ratio * 150;
                        const labelVal = Math.round((1 - ratio) * 100);
                        return (
                          <g key={idx}>
                            <line
                              x1={44}
                              y1={y}
                              x2={650}
                              y2={y}
                              stroke="currentColor"
                              className="text-zinc-200 dark:text-zinc-800"
                              strokeDasharray={idx === 4 ? undefined : '4 4'}
                            />
                            <text
                              x={36}
                              y={y + 4}
                              textAnchor="end"
                              className="fill-zinc-400 dark:fill-zinc-500 text-[10px] tabular-nums"
                            >
                              {labelVal}h
                            </text>
                          </g>
                        );
                      })}

                      {analytics.velocitySeries.map((item, i) => {
                        const xBase = 104 + i * 124;
                        const maxVal = Math.max(
                          100,
                          ...analytics.velocitySeries.map((s) =>
                            Math.max(s.plannedPoints, s.loggedHours, 10)
                          )
                        );
                        const primaryVal =
                          chartMetric === 'points'
                            ? item.completedPoints
                            : item.loggedHours;
                        const secondaryVal = item.plannedPoints;

                        const barH = Math.min(150, (primaryVal / maxVal) * 150);
                        const planH = Math.min(150, (secondaryVal / maxVal) * 150);
                        const isSelected = i === selectedSprintIndex;

                        return (
                          <g
                            key={item.sprint}
                            className="cursor-pointer"
                            onClick={() => setSelectedSprintIndex(i)}
                          >
                            <rect
                              x={xBase - 24}
                              y={170 - planH}
                              width={20}
                              height={Math.max(2, planH)}
                              rx={2}
                              className="fill-zinc-300 dark:fill-zinc-700"
                            />
                            <rect
                              x={xBase}
                              y={170 - barH}
                              width={24}
                              height={Math.max(2, barH)}
                              rx={2}
                              className={
                                isSelected
                                  ? 'fill-zinc-950 dark:fill-white'
                                  : 'fill-zinc-600 dark:fill-zinc-400 hover:fill-zinc-950 dark:hover:fill-white'
                              }
                            />
                            <text
                              x={xBase}
                              y={192}
                              textAnchor="middle"
                              className={`text-[11px] ${
                                isSelected
                                  ? 'fill-zinc-950 dark:fill-white font-semibold'
                                  : 'fill-zinc-500 dark:fill-zinc-400'
                              }`}
                            >
                              {item.sprint}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  <div className="lg:col-span-3 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <div className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
                      DMAIC Phase Telemetry
                    </div>
                    <div className="text-base font-bold text-zinc-950 dark:text-white">
                      {selectedSprint?.sprint} Phase
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">Planned Scope:</span>
                        <span className="tabular-nums font-semibold text-zinc-950 dark:text-white">
                          {selectedSprint?.plannedPoints ?? 0}h
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">Completed Gate:</span>
                        <span className="tabular-nums font-semibold text-zinc-950 dark:text-white">
                          {selectedSprint?.completedPoints ?? 0}h
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">Logged Hours:</span>
                        <span className="tabular-nums font-semibold text-zinc-950 dark:text-white">
                          {selectedSprint?.loggedHours ?? 0}h
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          }

          if (widget.id === 'milestone_tracker') {
            return (
              <section
                key={widget.id}
                draggable
                onDragStart={() => setDraggedWidgetId(widget.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnWidget(widget.id)}
                className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                      {widget.title}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {widget.subtitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('tasks')}
                    className="text-xs font-medium text-zinc-900 dark:text-zinc-200 hover:underline"
                  >
                    + Add Gate
                  </button>
                </div>

                {milestones.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 py-6">
                    No milestones created yet. Add milestone gates in the Tasks & DAG view.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {milestones.map((ms) => (
                      <div key={ms.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {ms.code} · {ms.department} · Target {ms.targetDate}
                            </div>
                            <div className="text-sm font-semibold text-zinc-950 dark:text-white">
                              {ms.title}
                            </div>
                          </div>
                          <span className="text-sm font-bold tabular-nums text-zinc-950 dark:text-white">
                            {ms.progress}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-950 dark:bg-white rounded-full"
                            style={{ width: `${ms.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          }

          if (widget.id === 'department_workload') {
            return (
              <section
                key={widget.id}
                draggable
                onDragStart={() => setDraggedWidgetId(widget.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnWidget(widget.id)}
                className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4"
              >
                <div>
                  <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                    {widget.title}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {widget.subtitle}
                  </p>
                </div>

                {analytics.departmentMetrics.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 py-6">
                    Workstream utilization metrics appear automatically as tasks are created.
                  </p>
                ) : (
                  <div className="space-y-3.5">
                    {analytics.departmentMetrics.map((dept) => (
                      <div key={dept.department} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {dept.department}
                          </span>
                          <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                            {dept.loggedHours}h / {dept.estimatedHours}h ({dept.utilizationPct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-950 dark:bg-white rounded-full"
                            style={{ width: `${Math.min(100, dept.utilizationPct)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          }

          if (widget.id === 'critical_alerts') {
            return (
              <section
                key={widget.id}
                draggable
                onDragStart={() => setDraggedWidgetId(widget.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnWidget(widget.id)}
                className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                      {widget.title}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {widget.subtitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('tasks')}
                    className="text-xs font-medium text-zinc-900 dark:text-zinc-200 hover:underline whitespace-nowrap shrink-0"
                  >
                    Open Tasks ({tasks.length})
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 py-6">
                    No active operational alerts. Task updates and Six Sigma triggers log events here in real time.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {notifications.slice(0, 4).map((ntf) => (
                      <div key={ntf.id} className="py-2.5 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                          <span>
                            {ntf.category} · {ntf.severity.toUpperCase()}
                          </span>
                          <span className="tabular-nums">
                            {new Date(ntf.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-zinc-950 dark:text-white mt-0.5">
                          {ntf.title}
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                          {ntf.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          }

          if (widget.id === 'encryption_sync_status') {
            return (
              <section
                key={widget.id}
                draggable
                onDragStart={() => setDraggedWidgetId(widget.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnWidget(widget.id)}
                className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                      {widget.title}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {widget.subtitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onTriggerSync}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 transition-colors whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Sync Cloud Now
                  </button>
                </div>

                <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Zero-Knowledge Cipher Suite
                    </span>
                    <span className="tabular-nums font-medium text-zinc-950 dark:text-white">
                      PBKDF2 + AES-GCM-256
                    </span>
                  </div>
                  <div className="text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400 truncate">
                    Key Fingerprint: {encryptionFingerprint}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  {(['macOS', 'Windows', 'iOS', 'Android'] as const).map((plat) => (
                    <div
                      key={plat}
                      className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                    >
                      <div className="text-xs font-semibold text-zinc-950 dark:text-white">
                        {plat}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {isOffline ? 'Cached Offline' : 'Synchronized'}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};
