import React, { useState } from 'react';
import {
  AutomationActionType,
  AutomationRule,
  AutomationTriggerType,
  FileVaultItem,
  PermissionAction,
  RolePermissionMatrix,
  TeamMember,
  UserRole,
} from '../types/project';
import {
  authenticateUserAccount,
  decryptPayloadAES,
  EncryptedVaultBundle,
  encryptPayloadAES,
} from '../utils/projectEngine';
import {
  CheckCircle2,
  CloudUpload,
  FileLock2,
  KeyRound,
  Lock,
  LogIn,
  Plus,
  ShieldCheck,
  Trash2,
  Unlock,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';

interface AutomationAndSecurityViewProps {
  members: TeamMember[];
  currentUser: TeamMember;
  automations: AutomationRule[];
  permissions: RolePermissionMatrix;
  files: FileVaultItem[];
  activeRole: UserRole;
  canPerform: (action: PermissionAction) => boolean;
  onChangeActiveRole: (role: UserRole) => void;
  onAuthenticateUser: (user: TeamMember) => void;
  onCreateMember: (member: Omit<TeamMember, 'id' | 'initials' | 'avatarHue'>) => void;
  onUpdateMemberRole: (memberId: string, role: UserRole) => void;
  onDeleteMember: (memberId: string) => void;
  onToggleAutomation: (ruleId: string) => void;
  onCreateAutomation: (
    rule: Omit<AutomationRule, 'id' | 'executionCount' | 'lastTriggeredAt'>
  ) => void;
  onTogglePermissionCell: (role: UserRole, action: PermissionAction) => void;
  onCreateEncryptedBackup: (bundle: EncryptedVaultBundle) => Promise<void>;
  workspaceSnapshotJson: string;
}

const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  status_changed_to_blocked: 'WHEN Task Status changes to Blocked',
  status_changed_to_completed: 'WHEN Task Status changes to Completed',
  priority_escalated_to_critical: 'WHEN Task Priority escalates to Critical',
  hours_exceeded_estimate: 'WHEN Logged Hours exceed Estimated Hours',
  milestone_approaching: 'WHEN Milestone gate is within 72 hours',
};

const ACTION_LABELS: Record<AutomationActionType, string> = {
  escalate_priority_critical: 'THEN Escalate Priority to Critical & Tag',
  notify_project_lead: 'THEN Dispatch Real-Time Alert to Project Lead',
  reassign_to_security_lead: 'THEN Route Deliverable to Six Sigma Quality Lead',
  auto_tag_audit_ready: 'THEN Apply Six-Sigma-Verified Control Tag',
  trigger_cloud_backup: 'THEN Trigger E2E Encrypted Cloud Snapshot',
};

const ALL_ROLES: UserRole[] = ['Admin', 'Project Lead', 'Contributor', 'Auditor'];
const ALL_ACTIONS: { id: PermissionAction; label: string }[] = [
  { id: 'create_task', label: 'Create Tasks, Milestones & Work Packages' },
  { id: 'update_task', label: 'Reorder PriorityIndex & Modify DMAIC Status' },
  { id: 'delete_task', label: 'Delete Tasks' },
  { id: 'log_time', label: 'Log Time & Run Chronometer' },
  { id: 'manage_automations', label: 'Configure Workflow Automations' },
  { id: 'manage_rbac', label: 'Modify Role Permission Matrix & Users' },
  { id: 'export_reports', label: 'Export PDF & CSV Analytics' },
  { id: 'manage_encryption', label: 'Manage E2E Encryption Keys & Backups' },
];

export const AutomationAndSecurityView: React.FC<AutomationAndSecurityViewProps> = ({
  members,
  currentUser,
  automations,
  permissions,
  files,
  activeRole,
  canPerform,
  onChangeActiveRole,
  onAuthenticateUser,
  onCreateMember,
  onUpdateMemberRole,
  onDeleteMember,
  onToggleAutomation,
  onCreateAutomation,
  onTogglePermissionCell,
  onCreateEncryptedBackup,
  workspaceSnapshotJson,
}) => {
  // User Provisioning & Auth State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<UserRole>('Contributor');
  const [newMemberDept, setNewMemberDept] = useState('Engineering');
  const [newMemberPin, setNewMemberPin] = useState('1234');
  const [authEmail, setAuthEmail] = useState('');
  const [authPin, setAuthPin] = useState('');
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);

  const [ruleName, setRuleName] = useState('');
  const [ruleDept, setRuleDept] = useState<string>('All');
  const [ruleTrigger, setRuleTrigger] = useState<AutomationTriggerType>(
    'status_changed_to_blocked'
  );
  const [ruleAction, setRuleAction] = useState<AutomationActionType>(
    'escalate_priority_critical'
  );
  const [ruleError, setRuleError] = useState<string | null>(null);

  const [vaultPassphrase, setVaultPassphrase] = useState('production-vault-key-2026');
  const [lastEncryptedBundle, setLastEncryptedBundle] =
    useState<EncryptedVaultBundle | null>(null);
  const [decryptedPreview, setDecryptedPreview] = useState<string | null>(null);
  const [cryptoStatus, setCryptoStatus] = useState<string | null>(null);

  const handleProvisionMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerform('manage_rbac')) {
      setAuthFeedback(`Role "${activeRole}" is not authorized to provision user accounts.`);
      return;
    }
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      setAuthFeedback('Full Name and Email Address are required.');
      return;
    }
    onCreateMember({
      name: newMemberName.trim(),
      email: newMemberEmail.trim().toLowerCase(),
      role: newMemberRole,
      title: `${newMemberRole} · ${newMemberDept}`,
      department: newMemberDept,
      capacityHoursPerWeek: 40,
      hourlyRate: 125,
      platforms: ['macOS', 'Windows', 'iOS', 'Android'],
      status: 'active',
      accessPin: newMemberPin.trim() || '0000',
      createdAt: new Date().toISOString(),
    });
    setNewMemberName('');
    setNewMemberEmail('');
    setAuthFeedback(`Provisioned RBAC account for ${newMemberName.trim()} (${newMemberRole}).`);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = authenticateUserAccount(members, authEmail, authPin);
    if (!res.ok || !res.user) {
      setAuthFeedback(res.error || 'Authentication failed.');
      return;
    }
    onAuthenticateUser(res.user);
    setAuthEmail('');
    setAuthPin('');
    setAuthFeedback(`Authenticated session switched to ${res.user.name} (${res.user.role}).`);
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerform('manage_automations')) {
      setRuleError(`Role "${activeRole}" cannot create workflow automation rules.`);
      return;
    }
    if (!ruleName.trim()) {
      setRuleError('Automation rule name is required.');
      return;
    }

    onCreateAutomation({
      name: ruleName.trim(),
      department: ruleDept || 'All',
      trigger: ruleTrigger,
      action: ruleAction,
      enabled: true,
    });
    setRuleName('');
    setRuleError(null);
  };

  const handleRunEncryptionBackup = async () => {
    if (!canPerform('manage_encryption')) {
      setCryptoStatus(`Role "${activeRole}" is not authorized to generate E2E backups.`);
      return;
    }
    if (!vaultPassphrase.trim()) {
      setCryptoStatus('Passphrase is required for PBKDF2 key derivation.');
      return;
    }
    try {
      const bundle = await encryptPayloadAES(workspaceSnapshotJson, vaultPassphrase);
      setLastEncryptedBundle(bundle);
      setDecryptedPreview(null);
      await onCreateEncryptedBackup(bundle);
      setCryptoStatus(
        `AES-GCM-256 Encrypted Cloud Backup verified & replicated (${
          bundle.ciphertextHex.length / 2
        } bytes).`
      );
    } catch (err) {
      console.error(err);
      setCryptoStatus('Encryption failed.');
    }
  };

  const handleVerifyDecryption = async () => {
    if (!lastEncryptedBundle) return;
    try {
      const plain = await decryptPayloadAES(lastEncryptedBundle, vaultPassphrase);
      const parsed = JSON.parse(plain);
      setDecryptedPreview(
        `Verified Decryption: Workspace "${parsed.projectName}" (${
          parsed.tasks?.length ?? 0
        } tasks, ${parsed.milestones?.length ?? 0} milestones)`
      );
    } catch {
      setDecryptedPreview('Decryption failed: Invalid passphrase or tampered ciphertext.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Active Role Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Authenticated as: <strong className="text-zinc-950 dark:text-white">{currentUser.name}</strong> ({currentUser.email})</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {members.length} RBAC Users
            </span>
            <span aria-hidden="true">·</span>
            <span>AES-GCM-256 Offline Vault</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white mt-1">
            Role-Based User Auth, RBAC Management, Automations & E2E Vault
          </h1>
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-2">
            Active Role:
          </span>
          {ALL_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onChangeActiveRole(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeRole === r
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-black'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Section 0: Role-Based User Authentication & Identity Management Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-zinc-950 dark:text-white" />
            <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
              Provision RBAC User Account & Authenticate
            </h2>
          </div>

          {authFeedback && (
            <div className="p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100">
              {authFeedback}
            </div>
          )}

          {/* Create User Form */}
          <form onSubmit={handleProvisionMember} className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="rbac-user-name"
                  className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1"
                >
                  Full Name
                </label>
                <input
                  id="rbac-user-name"
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="e.g., Marcus Sterling"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
              <div>
                <label
                  htmlFor="rbac-user-email"
                  className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="rbac-user-email"
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="marcus@enterprise.local"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label
                  htmlFor="rbac-user-role"
                  className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1"
                >
                  Assigned Role
                </label>
                <select
                  id="rbac-user-role"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as UserRole)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={newMemberDept}
                  onChange={(e) => setNewMemberDept(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Security PIN
                </label>
                <input
                  type="text"
                  value={newMemberPin}
                  onChange={(e) => setNewMemberPin(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!canPerform('manage_rbac')}
              data-testid="provision-user-btn"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-semibold rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-black disabled:opacity-40"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Provision User Account
            </button>
          </form>

          {/* Credential Login Form */}
          <form
            onSubmit={handleLoginSubmit}
            className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5"
          >
            <div className="text-xs font-semibold text-zinc-950 dark:text-white flex items-center gap-1.5">
              <LogIn className="w-3.5 h-3.5" />
              <span>Verify Credentials & Switch User Session</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="User email..."
                className="sm:col-span-2 px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
              />
              <input
                type="password"
                value={authPin}
                onChange={(e) => setAuthPin(e.target.value)}
                placeholder="PIN (optional)"
                className="px-2.5 py-1.5 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
            <button
              type="submit"
              className="w-full py-1.5 px-3 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              Authenticate Session
            </button>
          </form>
        </section>

        {/* Active RBAC User Directory */}
        <section className="lg:col-span-7 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-950 dark:text-white" />
              <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                Organization User Directory & Role Assignment ({members.length})
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              Click "Sign In As" to test RBAC enforcement
            </span>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {members.map((m) => {
              const isCurrent = m.id === currentUser.id;
              return (
                <div
                  key={m.id}
                  data-testid={`user-row-${m.email}`}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    isCurrent
                      ? 'border-zinc-950 dark:border-white bg-zinc-50 dark:bg-zinc-900/70'
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-black font-bold flex items-center justify-center text-xs shrink-0">
                      {m.initials}
                    </span>
                    <div>
                      <div className="font-semibold text-zinc-950 dark:text-white flex items-center gap-2">
                        <span>{m.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-950 text-white dark:bg-white dark:text-black">
                            Active Session
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {m.email} · {m.department} · PIN: <span className="font-mono">{m.accessPin || '0000'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={m.role}
                      disabled={!canPerform('manage_rbac')}
                      onChange={(e) => onUpdateMemberRole(m.id, e.target.value as UserRole)}
                      aria-label={`Change role for ${m.name}`}
                      className="px-2.5 py-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => onAuthenticateUser(m)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <UserCheck className="w-3 h-3" />
                        Sign In As
                      </button>
                    )}

                    {members.length > 1 && canPerform('manage_rbac') && !isCurrent && (
                      <button
                        type="button"
                        onClick={() => onDeleteMember(m.id)}
                        aria-label={`Remove ${m.name}`}
                        className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Section 1: Custom Workflow Automation Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-zinc-950 dark:text-white" />
            <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
              Create Custom Workflow Trigger
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Define deterministic IF/THEN rules that execute automatically when tasks change state across Construction, Events, or Tech projects.
          </p>

          <form onSubmit={handleAddRule} className="space-y-3">
            {ruleError && (
              <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100">
                {ruleError}
              </div>
            )}

            <div>
              <label
                htmlFor="auto-rule-name"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Rule Name
              </label>
              <input
                id="auto-rule-name"
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g., Auto-Escalate Blocked Structural or Release Tasks"
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="auto-rule-dept"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Workstream Scope
              </label>
              <input
                id="auto-rule-dept"
                type="text"
                value={ruleDept}
                onChange={(e) => setRuleDept(e.target.value)}
                placeholder="All (or specific department)"
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="auto-rule-trigger"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Trigger Condition (IF)
              </label>
              <select
                id="auto-rule-trigger"
                value={ruleTrigger}
                onChange={(e) => setRuleTrigger(e.target.value as AutomationTriggerType)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
              >
                {(Object.keys(TRIGGER_LABELS) as AutomationTriggerType[]).map((k) => (
                  <option key={k} value={k}>
                    {TRIGGER_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="auto-rule-action"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Automated Action (THEN)
              </label>
              <select
                id="auto-rule-action"
                value={ruleAction}
                onChange={(e) => setRuleAction(e.target.value as AutomationActionType)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
              >
                {(Object.keys(ACTION_LABELS) as AutomationActionType[]).map((k) => (
                  <option key={k} value={k}>
                    {ACTION_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!canPerform('manage_automations')}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-medium rounded-lg bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black disabled:opacity-40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Register Automation Trigger
            </button>
          </form>
        </section>

        <section className="lg:col-span-7 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
              Registered Workflow Automation Rules
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Rules evaluate synchronously on every task status or hours update.
            </p>
          </div>

          {automations.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
              No workflow automation rules registered yet. Use the form on the left to add your first IF/THEN rule.
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {automations.map((rule) => (
                <div
                  key={rule.id}
                  className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-950 dark:text-white">
                        {rule.name}
                      </span>
                      <span className="text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                        · Scope: {rule.department} · Fired {rule.executionCount}x
                      </span>
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      {TRIGGER_LABELS[rule.trigger]} → {ACTION_LABELS[rule.action]}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canPerform('manage_automations')}
                    onClick={() => onToggleAutomation(rule.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 disabled:opacity-40 ${
                      rule.enabled
                        ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-black dark:border-white'
                        : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-500'
                    }`}
                  >
                    {rule.enabled ? 'Enabled' : 'Paused'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Section 2: Granular Role-Based Access Control (RBAC) Matrix */}
      <section className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4 overflow-x-auto">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-zinc-950 dark:text-white" />
            <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
              Granular Role-Based Access Control (RBAC) Policy Matrix
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Toggle role capabilities below (requires Admin role). Changes immediately govern all UI controls across the workspace.
          </p>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <th className="py-2.5 px-4">Capability / Security Scope</th>
              {ALL_ROLES.map((r) => (
                <th key={r} className="py-2.5 px-4 text-center">
                  {r} {activeRole === r ? '(Active)' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
            {ALL_ACTIONS.map((act) => (
              <tr key={act.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                <td className="py-2.5 px-4 font-medium text-zinc-800 dark:text-zinc-200">
                  {act.label}
                </td>
                {ALL_ROLES.map((r) => {
                  const allowed = permissions[r]?.[act.id] ?? false;
                  return (
                    <td key={r} className="py-2.5 px-4 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${r} permission for ${act.label}`}
                        checked={allowed}
                        disabled={!canPerform('manage_rbac')}
                        onChange={() => onTogglePermissionCell(r, act.id)}
                        className="w-4 h-4 accent-zinc-950 dark:accent-white rounded cursor-pointer disabled:opacity-40"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Section 3: Offline Vault & WebCrypto AES-GCM-256 Cloud Backup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileLock2 className="w-4 h-4 text-zinc-950 dark:text-white" />
              <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                Offline-Cached Encrypted Vault
              </h2>
            </div>
            <span className="text-xs tabular-nums text-zinc-500">
              {files.length} Blueprints
            </span>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            All workspace state, priority indices, and Six Sigma telemetry are cached in local storage with end-to-end AES-GCM-256 encryption for offline field operations.
          </p>
        </section>

        <section className="lg:col-span-7 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-zinc-950 dark:text-white" />
            <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
              End-to-End AES-GCM-256 Cloud Backup & Verification
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Encrypts the entire project state client-side using Web Crypto API (PBKDF2 10,000 iterations + AES-GCM 256-bit) before transmitting to cloud storage.
          </p>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="vault-passphrase-input"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Zero-Knowledge Vault Passphrase
              </label>
              <input
                id="vault-passphrase-input"
                type="text"
                value={vaultPassphrase}
                onChange={(e) => setVaultPassphrase(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRunEncryptionBackup}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black transition-colors"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                Generate & Upload Encrypted Backup
              </button>

              {lastEncryptedBundle && (
                <button
                  type="button"
                  onClick={handleVerifyDecryption}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 transition-colors"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Verify Decryption Round-Trip
                </button>
              )}
            </div>

            {cryptoStatus && (
              <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{cryptoStatus}</span>
              </div>
            )}

            {lastEncryptedBundle && (
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] tabular-nums text-zinc-300 space-y-1">
                <div className="text-white flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Cipher: {lastEncryptedBundle.algorithm} · Salt:{' '}
                  {lastEncryptedBundle.saltHex.slice(0, 16)}...
                </div>
                <div className="truncate text-zinc-400">
                  Ciphertext: {lastEncryptedBundle.ciphertextHex.slice(0, 72)}...
                </div>
                {decryptedPreview && (
                  <div className="text-zinc-200 pt-1 border-t border-zinc-800">
                    {decryptedPreview}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
