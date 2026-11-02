import React, { useState } from 'react';
import {
  DmaicPhase,
  IndustrySector,
  Milestone,
  PermissionAction,
  Task,
  TaskPriority,
  TaskStatus,
  TeamMember,
  UserRole,
} from '../types/project';
import { CriticalPathAnalysis, hasDependencyCycle } from '../utils/projectEngine';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  Flag,
  GitBranch,
  GripVertical,
  Kanban,
  Play,
  Plus,
  Search,
  Table2,
  Trash2,
  X,
} from 'lucide-react';

interface TasksAndDependenciesViewProps {
  tasks: Task[];
  milestones: Milestone[];
  members: TeamMember[];
  criticalPath: CriticalPathAnalysis;
  activeRole: UserRole;
  defaultSector: IndustrySector;
  canPerform: (action: PermissionAction) => boolean;
  activeTimerTaskId: string | null;
  onStartTimer: (taskId: string) => void;
  onCreateTask: (
    newTask: Omit<Task, 'id' | 'code' | 'loggedHours' | 'updatedAt' | 'priorityIndex'>
  ) => void;
  onCreateMilestone: (
    newMilestone: Omit<Milestone, 'id' | 'code' | 'position3D'>
  ) => void;
  onUpdateTask: (taskId: string, patch: Partial<Task>) => void;
  onReorderTasks: (sourceTaskId: string, targetTaskId: string) => void;
  onMoveTaskPriority: (taskId: string, direction: -1 | 1) => void;
  onDeleteTask: (taskId: string) => void;
}

const ALL_STATUSES: TaskStatus[] = ['Backlog', 'In Progress', 'In Review', 'Blocked', 'Completed'];
const ALL_PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];
const ALL_DMAIC_PHASES: DmaicPhase[] = ['Define', 'Measure', 'Analyze', 'Improve', 'Control'];
const ALL_SECTORS: IndustrySector[] = [
  'Construction & Civil',
  'Event Production',
  'Tech Development',
  'Manufacturing & Ops',
];

const SECTOR_DEPARTMENTS: Record<IndustrySector, string[]> = {
  'Construction & Civil': [
    'Site & Foundation',
    'Structural Engineering',
    'MEP & Utilities',
    'Safety & Six Sigma QC',
  ],
  'Event Production': [
    'Venue & Permitting',
    'Stage, Audio & Rigging',
    'Vendor & Logistics',
    'Live Run-of-Show QC',
  ],
  'Tech Development': [
    'Systems Architecture',
    'Core Backend & API',
    'Frontend & UX',
    'QA & Release Control',
  ],
  'Manufacturing & Ops': [
    'Process Engineering',
    'Supply Chain',
    'Six Sigma Quality Lab',
    'Plant Operations',
  ],
};

export const TasksAndDependenciesView: React.FC<TasksAndDependenciesViewProps> = ({
  tasks,
  milestones,
  members,
  criticalPath,
  activeRole,
  defaultSector,
  canPerform,
  activeTimerTaskId,
  onStartTimer,
  onCreateTask,
  onCreateMilestone,
  onUpdateTask,
  onReorderTasks,
  onMoveTaskPriority,
  onDeleteTask,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'dag'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
  const [dmaicFilter, setDmaicFilter] = useState<DmaicPhase | 'All'>('All');

  // Drag-and-Drop Priority Reordering state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  // Create Task Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [industrySector, setIndustrySector] = useState<IndustrySector>(defaultSector);
  const [dmaicPhase, setDmaicPhase] = useState<DmaicPhase>('Define');
  const [department, setDepartment] = useState<string>(
    SECTOR_DEPARTMENTS[defaultSector][0]
  );
  const [priority, setPriority] = useState<TaskPriority>('High');
  const [status, setStatus] = useState<TaskStatus>('In Progress');
  const [assigneeId, setAssigneeId] = useState<string>(members[0]?.id ?? 'Unassigned');
  const [milestoneId, setMilestoneId] = useState<string>(milestones[0]?.id ?? '');
  const [estimatedHours, setEstimatedHours] = useState<string>('16');
  const [opportunitiesCount, setOpportunitiesCount] = useState<string>('100');
  const [defectsCount, setDefectsCount] = useState<string>('0');
  const [dueDate, setDueDate] = useState<string>('2026-11-30');
  const [selectedDeps, setSelectedDeps] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Create Milestone Modal State
  const [isMilestoneOpen, setIsMilestoneOpen] = useState(false);
  const [msTitle, setMsTitle] = useState('');
  const [msDept, setMsDept] = useState('Operations');
  const [msDate, setMsDate] = useState('2026-12-15');
  const [msCritical, setMsCritical] = useState(true);
  const [msDesc, setMsDesc] = useState('');

  // Dependency Linker State
  const [linkingTaskId, setLinkingTaskId] = useState<string>(tasks[1]?.id ?? tasks[0]?.id ?? '');
  const [candidateDepId, setCandidateDepId] = useState<string>(tasks[0]?.id ?? '');
  const [depFeedback, setDepFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  const memberMap = new Map(members.map((m) => [m.id, m]));

  // Always sort tasks by priorityIndex ascending
  const orderedTasks = [...tasks].sort((a, b) => a.priorityIndex - b.priorityIndex);

  const filteredTasks = orderedTasks.filter((t) => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (dmaicFilter !== 'All' && t.dmaicPhase !== dmaicFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.department.toLowerCase().includes(q) ||
        t.industrySector.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSectorChange = (nextSector: IndustrySector) => {
    setIndustrySector(nextSector);
    setDepartment(SECTOR_DEPARTMENTS[nextSector][0]);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerform('create_task')) {
      setFormError(`Role "${activeRole}" does not have permission to create tasks.`);
      return;
    }
    if (!title.trim()) {
      setFormError('Task title is required.');
      return;
    }
    const parsedHours = Number(estimatedHours);
    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      setFormError('Estimated hours must be a positive number.');
      return;
    }

    const parsedOpps = Math.max(1, Number(opportunitiesCount) || 100);
    const parsedDefects = Math.max(0, Math.min(parsedOpps, Number(defectsCount) || 0));

    onCreateTask({
      title: title.trim(),
      description: description.trim() || `${industrySector} work package (${dmaicPhase} phase).`,
      industrySector,
      dmaicPhase,
      department: department.trim() || 'Operations',
      priority,
      status,
      assigneeId: assigneeId || 'Unassigned',
      milestoneId: milestoneId || '',
      estimatedHours: parsedHours,
      opportunitiesCount: parsedOpps,
      defectsCount: parsedDefects,
      dueDate,
      dependencies: selectedDeps,
      tags: [dmaicPhase.toLowerCase(), industrySector.split(' ')[0].toLowerCase()],
    });

    setTitle('');
    setDescription('');
    setSelectedDeps([]);
    setDefectsCount('0');
    setFormError(null);
    setIsCreateOpen(false);
  };

  const handleMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msTitle.trim()) return;
    onCreateMilestone({
      title: msTitle.trim(),
      department: msDept.trim() || 'Operations',
      targetDate: msDate,
      progress: 0,
      isCritical: msCritical,
      description: msDesc.trim() || 'Operational milestone gate',
    });
    setMsTitle('');
    setMsDesc('');
    setIsMilestoneOpen(false);
  };

  const handleAddDependencyLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerform('update_task')) {
      setDepFeedback({
        type: 'error',
        text: `Role "${activeRole}" cannot modify task dependencies.`,
      });
      return;
    }
    const sourceTask = tasks.find((t) => t.id === linkingTaskId);
    const targetTask = tasks.find((t) => t.id === candidateDepId);
    if (!sourceTask || !targetTask) return;

    if (sourceTask.dependencies.includes(candidateDepId)) {
      setDepFeedback({
        type: 'error',
        text: `${sourceTask.code} already depends on ${targetTask.code}.`,
      });
      return;
    }

    if (hasDependencyCycle(tasks, linkingTaskId, candidateDepId)) {
      setDepFeedback({
        type: 'error',
        text: `Cycle Detected: Linking ${sourceTask.code} → ${targetTask.code} would create a circular dependency.`,
      });
      return;
    }

    onUpdateTask(linkingTaskId, {
      dependencies: [...sourceTask.dependencies, candidateDepId],
    });
    setDepFeedback({
      type: 'success',
      text: `Linked dependency: ${sourceTask.code} now requires ${targetTask.code}.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & View Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Priority Queue & Six Sigma DMAIC Execution</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {filteredTasks.length} of {tasks.length} work packages
            </span>
            <span aria-hidden="true">·</span>
            <span>Drag rows to reorder priorityIndex</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white mt-1">
            Tasks, Priority Queue & Dependency Graph
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              Priority Matrix
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              DMAIC / Status Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode('dag')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'dag'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              Dependency Linker
            </button>
          </div>

          <button
            type="button"
            disabled={!canPerform('create_task')}
            onClick={() => setIsMilestoneOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <Flag className="w-3.5 h-3.5" />
            New Milestone
          </button>

          <button
            type="button"
            disabled={!canPerform('create_task')}
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            New Task
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code, title, industry, or department..."
            aria-label="Search tasks"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by DMAIC Phase"
            value={dmaicFilter}
            onChange={(e) => setDmaicFilter(e.target.value as DmaicPhase | 'All')}
            className="px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          >
            <option value="All">All Six Sigma DMAIC Phases</option>
            {ALL_DMAIC_PHASES.map((ph) => (
              <option key={ph} value={ph}>
                DMAIC: {ph}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'All')}
            className="px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          >
            <option value="All">All Statuses</option>
            {ALL_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Create Milestone Modal */}
      {isMilestoneOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-milestone-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
        >
          <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h2
                id="create-milestone-dialog-title"
                className="text-base font-semibold text-zinc-950 dark:text-white"
              >
                Create Project Milestone Gate
              </h2>
              <button
                type="button"
                onClick={() => setIsMilestoneOpen(false)}
                aria-label="Close milestone modal"
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMilestoneSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="ms-title-input"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Milestone Title
                </label>
                <input
                  id="ms-title-input"
                  type="text"
                  required
                  value={msTitle}
                  onChange={(e) => setMsTitle(e.target.value)}
                  placeholder="e.g., Phase 1 Structural Steel Sign-Off / Main Stage Rigging Gate"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="ms-dept-input"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Department / Unit
                  </label>
                  <input
                    id="ms-dept-input"
                    type="text"
                    value={msDept}
                    onChange={(e) => setMsDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ms-date-input"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Target Gate Date
                  </label>
                  <input
                    id="ms-date-input"
                    type="date"
                    value={msDate}
                    onChange={(e) => setMsDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs tabular-nums rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="ms-desc-input"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Gate Acceptance Criteria
                </label>
                <input
                  id="ms-desc-input"
                  type="text"
                  value={msDesc}
                  onChange={(e) => setMsDesc(e.target.value)}
                  placeholder="Zero critical defects, full safety or QA sign-off"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={msCritical}
                  onChange={(e) => setMsCritical(e.target.checked)}
                />
                <span>Critical Path Gate</span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsMilestoneOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-950 dark:bg-white text-white dark:text-black"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-task-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
        >
          <div className="w-full max-w-xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h2
                id="create-task-dialog-title"
                className="text-base font-semibold text-zinc-950 dark:text-white"
              >
                Create Work Package & Six Sigma Specification
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                aria-label="Close modal"
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-600 text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="new-task-title"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Task / Work Package Title
                </label>
                <input
                  id="new-task-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Pour Sector B Concrete Foundation / Main Stage Rigging Load Test / API Gateway Release"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="new-task-sector"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Industry Sector
                  </label>
                  <select
                    id="new-task-sector"
                    value={industrySector}
                    onChange={(e) => handleSectorChange(e.target.value as IndustrySector)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                  >
                    {ALL_SECTORS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="new-task-dmaic"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Six Sigma DMAIC Phase
                  </label>
                  <select
                    id="new-task-dmaic"
                    value={dmaicPhase}
                    onChange={(e) => setDmaicPhase(e.target.value as DmaicPhase)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                  >
                    {ALL_DMAIC_PHASES.map((ph) => (
                      <option key={ph} value={ph}>
                        {ph}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="new-task-dept"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Workstream / Department
                  </label>
                  <input
                    id="new-task-dept"
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label
                    htmlFor="new-task-priority"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Priority Level
                  </label>
                  <select
                    id="new-task-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                  >
                    {ALL_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="new-task-hours"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Estimated Hours
                  </label>
                  <input
                    id="new-task-hours"
                    type="number"
                    min={1}
                    max={2000}
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs tabular-nums rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-task-opps"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    QC Opportunities
                  </label>
                  <input
                    id="new-task-opps"
                    type="number"
                    min={1}
                    value={opportunitiesCount}
                    onChange={(e) => setOpportunitiesCount(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs tabular-nums rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-task-defects"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Recorded Defects
                  </label>
                  <input
                    id="new-task-defects"
                    type="number"
                    min={0}
                    value={defectsCount}
                    onChange={(e) => setDefectsCount(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs tabular-nums rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="new-task-status"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Initial Status
                  </label>
                  <select
                    id="new-task-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                  >
                    {ALL_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="new-task-assignee"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Owner / Lead
                  </label>
                  <input
                    id="new-task-assignee"
                    type="text"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    placeholder="e.g., Site Lead / QA Lead"
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-task-due"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Target Completion
                  </label>
                  <input
                    id="new-task-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs tabular-nums rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              {tasks.length > 0 && (
                <div>
                  <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Predecessor Dependencies (Optional)
                  </span>
                  <div className="max-h-28 overflow-y-auto p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {orderedTasks.map((t) => {
                      const checked = selectedDeps.includes(t.id);
                      return (
                        <label
                          key={t.id}
                          className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedDeps((prev) =>
                                checked ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                              )
                            }
                            className="rounded border-zinc-400"
                          />
                          <span className="tabular-nums text-[11px] font-medium">{t.code}</span>
                          <span className="truncate">{t.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 1: Drag-and-Drop Priority Matrix Table */}
      {viewMode === 'table' && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-x-auto">
          {filteredTasks.length === 0 ? (
            <div className="py-16 px-6 text-center space-y-3">
              <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                No Tasks in Workspace Queue
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                Your production workspace starts completely clean without dummy data. Add your first work package for Construction, Event Production, or Tech Application Development, then drag and drop rows to reorder priorityIndex.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create First Task
                </button>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/60">
                  <th className="py-3 px-4">Priority Order (Drag)</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Work Package & Sector</th>
                  <th className="py-3 px-4">DMAIC Phase</th>
                  <th className="py-3 px-4">Six Sigma QC (Defects/Opps)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4 text-right">Hours</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-xs">
                {filteredTasks.map((task, idx) => {
                  const member = memberMap.get(task.assigneeId);
                  const isCrit = criticalPath.criticalTaskIds.includes(task.id);
                  const isTiming = activeTimerTaskId === task.id;
                  const isDragOver = dragOverTaskId === task.id;

                  return (
                    <tr
                      key={task.id}
                      draggable={canPerform('update_task')}
                      onDragStart={(e) => {
                        setDraggedTaskId(task.id);
                        if (e.dataTransfer) {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', task.id);
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer) {
                          e.dataTransfer.dropEffect = 'move';
                        }
                        if (dragOverTaskId !== task.id) {
                          setDragOverTaskId(task.id);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverTaskId === task.id) {
                          setDragOverTaskId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverTaskId(null);
                        const sourceId =
                          draggedTaskId || e.dataTransfer?.getData('text/plain');
                        if (sourceId && sourceId !== task.id) {
                          onReorderTasks(sourceId, task.id);
                        }
                        setDraggedTaskId(null);
                      }}
                      data-testid={`task-row-${task.code}`}
                      className={`transition-colors ${
                        isDragOver
                          ? 'bg-zinc-100 dark:bg-zinc-800/90'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                      }`}
                    >
                      <td
                        className="py-3 px-4 whitespace-nowrap cursor-grab active:cursor-grabbing"
                        data-testid={`drag-handle-${task.code}`}
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical
                            className="w-4 h-4 text-zinc-400 shrink-0"
                            aria-hidden="true"
                          />
                          <span
                            className="font-semibold tabular-nums text-zinc-950 dark:text-white"
                            data-testid={`priority-index-${task.code}`}
                          >
                            #{task.priorityIndex + 1}{' '}
                            <span className="text-[11px] font-normal text-zinc-500">
                              (priorityIndex: {task.priorityIndex})
                            </span>
                          </span>
                          <div className="flex items-center gap-0.5 ml-1">
                            <button
                              type="button"
                              disabled={idx === 0 || !canPerform('update_task')}
                              onClick={() => onMoveTaskPriority(task.id, -1)}
                              aria-label={`Move ${task.code} up in priority`}
                              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-25 text-zinc-600 dark:text-zinc-400"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={
                                idx === filteredTasks.length - 1 || !canPerform('update_task')
                              }
                              onClick={() => onMoveTaskPriority(task.id, 1)}
                              aria-label={`Move ${task.code} down in priority`}
                              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-25 text-zinc-600 dark:text-zinc-400"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-semibold tabular-nums text-zinc-950 dark:text-white whitespace-nowrap">
                        <div>{task.code}</div>
                        {isCrit && (
                          <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                            Critical Path
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 max-w-md">
                        <div className="font-medium text-zinc-950 dark:text-white">
                          {task.title}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {task.industrySector} · {task.department} · Owner:{' '}
                          {member?.name ?? task.assigneeId} · Due {task.dueDate}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <select
                          aria-label={`DMAIC Phase for ${task.code}`}
                          disabled={!canPerform('update_task')}
                          value={task.dmaicPhase}
                          onChange={(e) =>
                            onUpdateTask(task.id, {
                              dmaicPhase: e.target.value as DmaicPhase,
                            })
                          }
                          className="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                        >
                          {ALL_DMAIC_PHASES.map((ph) => (
                            <option key={ph} value={ph}>
                              {ph}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-800 dark:text-zinc-200">
                            {task.defectsCount} / {task.opportunitiesCount}
                          </span>
                          {canPerform('update_task') && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateTask(task.id, {
                                  defectsCount: (task.defectsCount || 0) + 1,
                                })
                              }
                              aria-label={`Log defect on ${task.code}`}
                              className="px-1.5 py-0.5 text-[10px] rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            >
                              +Defect
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <select
                          aria-label={`Status for ${task.code}`}
                          disabled={!canPerform('update_task')}
                          value={task.status}
                          onChange={(e) =>
                            onUpdateTask(task.id, { status: e.target.value as TaskStatus })
                          }
                          className="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                        >
                          {ALL_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-medium ${
                            task.priority === 'Critical'
                              ? 'text-zinc-950 dark:text-white underline decoration-zinc-500 underline-offset-4 font-semibold'
                              : 'text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                        <span className="font-semibold text-zinc-950 dark:text-white">
                          {task.loggedHours}h
                        </span>{' '}
                        <span className="text-zinc-400">/ {task.estimatedHours}h</span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={!canPerform('log_time')}
                            onClick={() => onStartTimer(task.id)}
                            aria-label={`Start timer for ${task.code}`}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                              isTiming
                                ? 'bg-zinc-950 text-white dark:bg-white dark:text-black'
                                : 'bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                            }`}
                          >
                            <Play className="w-3 h-3" />
                            {isTiming ? 'Timing' : 'Track'}
                          </button>

                          {canPerform('delete_task') && (
                            <button
                              type="button"
                              onClick={() => onDeleteTask(task.id)}
                              aria-label={`Delete ${task.code}`}
                              className="p-1.5 rounded text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* VIEW 2: Kanban Workflow Board */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {ALL_STATUSES.map((colStatus) => {
            const colTasks = filteredTasks.filter((t) => t.status === colStatus);
            return (
              <div
                key={colStatus}
                className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <h2 className="text-xs font-semibold text-zinc-950 dark:text-white">
                    {colStatus}
                  </h2>
                  <span className="text-xs tabular-nums text-zinc-500">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {colTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px] tabular-nums text-zinc-500">
                        <span>
                          #{t.priorityIndex + 1} · {t.code}
                        </span>
                        <span>{t.dmaicPhase}</span>
                      </div>
                      <div className="text-xs font-semibold text-zinc-950 dark:text-white">
                        {t.title}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {t.industrySector} · {t.loggedHours}h / {t.estimatedHours}h
                      </div>
                      {canPerform('update_task') && colStatus !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() => onUpdateTask(t.id, { status: 'Completed' })}
                          className="w-full mt-1 py-1 text-[11px] font-medium rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-950 hover:text-white dark:hover:bg-white dark:hover:text-black text-zinc-800 dark:text-zinc-200 transition-colors flex items-center justify-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Complete Gate
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: Dependency DAG Linker & Cycle Guard */}
      {viewMode === 'dag' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                Link Task Dependencies (Cycle-Safe)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Enforce predecessor sequencing across Construction, Event, and Tech work packages. Circular dependencies are automatically rejected.
              </p>
            </div>

            {tasks.length < 2 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 py-4">
                Create at least 2 tasks to configure predecessor dependencies.
              </p>
            ) : (
              <form onSubmit={handleAddDependencyLink} className="space-y-3">
                <div>
                  <label
                    htmlFor="dag-source-task"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Dependent Work Package (Successor)
                  </label>
                  <select
                    id="dag-source-task"
                    value={linkingTaskId}
                    onChange={(e) => setLinkingTaskId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                  >
                    {orderedTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} · {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="dag-target-dep"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Required Predecessor Package
                  </label>
                  <select
                    id="dag-target-dep"
                    value={candidateDepId}
                    onChange={(e) => setCandidateDepId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                  >
                    {orderedTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} · {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                {depFeedback && (
                  <div className="p-3 rounded-lg text-xs border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                    {depFeedback.text}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 px-4 text-xs font-medium rounded-lg bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black transition-colors"
                >
                  Validate & Link Dependency
                </button>
              </form>
            )}
          </div>

          <div className="lg:col-span-7 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                Critical Path & Topological Sequence
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Critical path duration: {criticalPath.totalCriticalHours}h across{' '}
                {criticalPath.criticalTaskIds.length} critical packages.
              </p>
            </div>

            {orderedTasks.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 py-4">
                No tasks registered yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {orderedTasks.map((t) => {
                  const isCrit = criticalPath.criticalTaskIds.includes(t.id);
                  const depth = criticalPath.taskDepthMap[t.id] ?? 0;
                  return (
                    <div
                      key={t.id}
                      className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isCrit
                          ? 'border-zinc-900 dark:border-zinc-200 bg-zinc-50 dark:bg-zinc-900'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 text-xs tabular-nums">
                          <span className="font-bold text-zinc-950 dark:text-white">
                            #{t.priorityIndex + 1} · Tier {depth + 1} · {t.code}
                          </span>
                          <span className="text-zinc-400">·</span>
                          <span className="text-zinc-600 dark:text-zinc-300">
                            {t.dmaicPhase} ({t.status})
                          </span>
                        </div>
                        <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                          {t.title}
                        </div>
                      </div>

                      <div className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400 shrink-0">
                        Predecessors:{' '}
                        {t.dependencies.length === 0
                          ? 'Root Package'
                          : t.dependencies
                              .map((d) => tasks.find((x) => x.id === d)?.code ?? d)
                              .join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
