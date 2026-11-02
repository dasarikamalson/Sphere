import React, { useState } from 'react';
import {
  PermissionAction,
  Task,
  TeamMember,
  TimeEntry,
  UserRole,
} from '../types/project';
import { ProjectAnalyticsSummary } from '../utils/projectEngine';
import {
  Clock,
  Download,
  FileSpreadsheet,
  Pause,
  Play,
  Plus,
  Square,
} from 'lucide-react';

interface TimeTrackingAndReportsViewProps {
  tasks: Task[];
  members: TeamMember[];
  timeEntries: TimeEntry[];
  analytics: ProjectAnalyticsSummary;
  activeRole: UserRole;
  canPerform: (action: PermissionAction) => boolean;
  activeTimerTaskId: string | null;
  timerSeconds: number;
  timerRunning: boolean;
  onStartTimer: (taskId: string) => void;
  onPauseTimer: () => void;
  onCommitTimerSession: () => void;
  onLogManualTime: (entry: Omit<TimeEntry, 'id'>) => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
}

function formatDurationClock(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(
    secs
  ).padStart(2, '0')}`;
}

export const TimeTrackingAndReportsView: React.FC<TimeTrackingAndReportsViewProps> = ({
  tasks,
  members,
  timeEntries,
  analytics,
  activeRole,
  canPerform,
  activeTimerTaskId,
  timerSeconds,
  timerRunning,
  onStartTimer,
  onPauseTimer,
  onCommitTimerSession,
  onLogManualTime,
  onExportCsv,
  onExportPdf,
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    activeTimerTaskId ?? tasks[0]?.id ?? ''
  );
  const [manualUserId, setManualUserId] = useState<string>('Project Engineer');
  const [manualTaskId, setManualTaskId] = useState<string>(tasks[0]?.id ?? '');
  const [manualMinutes, setManualMinutes] = useState<string>('60');
  const [manualBillable, setManualBillable] = useState<boolean>(true);
  const [manualNotes, setManualNotes] = useState<string>('');
  const [manualError, setManualError] = useState<string | null>(null);

  const memberMap = new Map(members.map((m) => [m.id, m]));
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerform('log_time')) {
      setManualError(`Role "${activeRole}" does not have permission to log time entries.`);
      return;
    }
    const targetTask = manualTaskId || tasks[0]?.id || '';
    if (!targetTask) {
      setManualError('Create at least one task before logging time entries.');
      return;
    }
    const mins = Number(manualMinutes);
    if (!Number.isFinite(mins) || mins <= 0) {
      setManualError('Duration must be a positive number of minutes.');
      return;
    }
    if (!manualNotes.trim()) {
      setManualError('Please enter a work-log audit note.');
      return;
    }

    onLogManualTime({
      taskId: targetTask,
      userId: manualUserId.trim() || 'Project Engineer',
      date: new Date().toISOString().slice(0, 10),
      durationMinutes: Math.round(mins),
      billable: manualBillable,
      notes: manualNotes.trim(),
    });

    setManualNotes('');
    setManualError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Report Export Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Integrated Time Intelligence & Reporting</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {timeEntries.length} Verified Logs ({analytics.totalLoggedHours}h Total)
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white mt-1">
            Precision Time Tracking & Automated Reports
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={!canPerform('export_reports')}
            onClick={onExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Timesheet CSV
          </button>

          <button
            type="button"
            disabled={!canPerform('export_reports')}
            onClick={onExportPdf}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF Executive Brief
          </button>
        </div>
      </div>

      {/* Top Split: Active Stopwatch + Manual Work-Log Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <section className="lg:col-span-5 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5" />
                Live Task Session Chronometer
              </span>
              <span className="tabular-nums">
                {timerRunning ? 'ACTIVE SESSION' : 'STANDBY'}
              </span>
            </div>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
              Real-Time Work Package Timer
            </h2>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 text-center space-y-2">
            <div
              className="text-4xl font-bold tracking-wider tabular-nums text-white"
              data-testid="live-stopwatch-display"
            >
              {formatDurationClock(timerSeconds)}
            </div>
            <div className="text-xs text-zinc-400 truncate">
              {activeTimerTaskId && taskMap.get(activeTimerTaskId)
                ? `Active: ${taskMap.get(activeTimerTaskId)?.code} — ${
                    taskMap.get(activeTimerTaskId)?.title
                  }`
                : 'Select a work package below to begin tracking'}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="stopwatch-task-select"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Target Work Package
              </label>
              <select
                id="stopwatch-task-select"
                value={activeTimerTaskId ?? selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
              >
                {tasks.length === 0 ? (
                  <option value="">No tasks available — create a task first</option>
                ) : (
                  tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} · {t.title} ({t.loggedHours}h logged)
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {!timerRunning ? (
                <button
                  type="button"
                  disabled={!canPerform('log_time') || tasks.length === 0}
                  onClick={() =>
                    onStartTimer(activeTimerTaskId || selectedTaskId || tasks[0]?.id)
                  }
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-medium rounded-lg bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black disabled:opacity-40 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  Start Timer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onPauseTimer}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white transition-colors"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pause Timer
                </button>
              )}

              <button
                type="button"
                disabled={timerSeconds === 0 || !canPerform('log_time')}
                onClick={onCommitTimerSession}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white disabled:opacity-40 transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                Commit Log
              </button>
            </div>
          </div>
        </section>

        {/* Manual Work-Log Entry Form */}
        <section className="lg:col-span-7 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
              Record Manual Operational Time Entry
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Log field engineering, event production, or software sprint hours with billable classification.
            </p>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-3.5">
            {manualError && (
              <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100">
                {manualError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="manual-task-select"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Work Package
                </label>
                <select
                  id="manual-task-select"
                  value={manualTaskId || tasks[0]?.id || ''}
                  onChange={(e) => setManualTaskId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                >
                  {tasks.length === 0 ? (
                    <option value="">No tasks created yet</option>
                  ) : (
                    tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} · {t.title.slice(0, 26)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="manual-member-select"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Personnel / Operator
                </label>
                <input
                  id="manual-member-select"
                  type="text"
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                  placeholder="Operator or Lead Name"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="manual-duration-input"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Duration (Minutes)
                </label>
                <input
                  id="manual-duration-input"
                  type="number"
                  min={5}
                  max={1440}
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  className="w-full px-3 py-2 text-xs tabular-nums rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="manual-notes-input"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Work-Log Audit Notes
              </label>
              <input
                id="manual-notes-input"
                type="text"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="e.g., Completed Six Sigma Measure phase core sampling / Rigging verification"
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualBillable}
                  onChange={(e) => setManualBillable(e.target.checked)}
                  className="rounded border-zinc-400"
                />
                <span>Classify as Billable Program Allocation</span>
              </label>

              <button
                type="submit"
                disabled={!canPerform('log_time')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black disabled:opacity-40 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Log Time Entry
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Verified Time Ledger Table */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-x-auto">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
            Audited Time & Cost Ledger
          </h2>
          <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            Billable: {analytics.billableHours}h ({analytics.billableRatioPct}%) · Total Cost: $
            {analytics.totalBudgetCostUsd.toLocaleString()}
          </span>
        </div>

        {timeEntries.length === 0 ? (
          <div className="py-12 px-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            No time entries recorded yet. Start the live task timer or record a manual entry above.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/60">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Task</th>
                <th className="py-2.5 px-4">Operator</th>
                <th className="py-2.5 px-4">Audit Notes</th>
                <th className="py-2.5 px-4">Classification</th>
                <th className="py-2.5 px-4 text-right">Duration</th>
                <th className="py-2.5 px-4 text-right">Cost (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
              {timeEntries.map((entry) => {
                const member = memberMap.get(entry.userId);
                const task = taskMap.get(entry.taskId);
                const hours = (entry.durationMinutes / 60).toFixed(1);
                const cost = Math.round(
                  (entry.durationMinutes / 60) * (member?.hourlyRate ?? 125)
                );

                return (
                  <tr
                    key={entry.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    <td className="py-2.5 px-4 tabular-nums text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {entry.date}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-zinc-950 dark:text-white">
                        {task?.code ?? entry.taskId}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap text-zinc-800 dark:text-zinc-200">
                      {member?.name ?? entry.userId}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-300 max-w-md">
                      {entry.notes}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                      {entry.billable ? 'Billable' : 'Internal Ops'}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-medium text-zinc-950 dark:text-white whitespace-nowrap">
                      {hours}h ({entry.durationMinutes}m)
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      ${cost.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};
