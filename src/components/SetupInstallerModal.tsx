import React, { useState } from 'react';
import {
  ChatChannel,
  IndustrySector,
  KnowledgeDocument,
  ProjectEntity,
  TeamMember,
  UserRole,
} from '../types/project';
import {
  Check,
  FolderKanban,
  Hash,
  Layers,
  Lock,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  UserPlus,
} from 'lucide-react';

interface SetupInstallerModalProps {
  initialOrgName: string;
  initialDomain: string;
  initialProjects: ProjectEntity[];
  initialMembers: TeamMember[];
  initialChannels: ChatChannel[];
  onCompleteSetup: (payload: {
    organizationName: string;
    organizationDomain: string;
    targetSigmaLevel: number;
    projects: ProjectEntity[];
    members: TeamMember[];
    channels: ChatChannel[];
    knowledgeDocs: KnowledgeDocument[];
  }) => void;
}

const SECTORS: IndustrySector[] = [
  'Construction & Civil',
  'Event Production',
  'Tech Development',
  'Manufacturing & Ops',
];

const ROLES: UserRole[] = ['Admin', 'Project Lead', 'Contributor', 'Auditor'];

export const SetupInstallerModal: React.FC<SetupInstallerModalProps> = ({
  initialOrgName,
  initialDomain,
  initialProjects,
  initialMembers,
  initialChannels,
  onCompleteSetup,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [orgName, setOrgName] = useState(initialOrgName || 'KronoSphere Enterprise');
  const [orgDomain, setOrgDomain] = useState(initialDomain || 'enterprise.local');
  const [targetSigma, setTargetSigma] = useState<number>(6.0);

  // Step 2: Users & RBAC Accounts
  const [members, setMembers] = useState<TeamMember[]>(
    initialMembers.length > 0
      ? initialMembers
      : [
          {
            id: 'usr-admin-1',
            name: 'System Administrator',
            role: 'Admin',
            title: 'Master Black Belt & Principal Architect',
            department: 'Quality & Six Sigma',
            email: 'admin@enterprise.local',
            initials: 'SA',
            avatarHue: 0,
            capacityHoursPerWeek: 40,
            hourlyRate: 150,
            platforms: ['macOS', 'Windows', 'iOS', 'Android'],
            status: 'active',
            accessPin: '0000',
            createdAt: new Date().toISOString(),
          },
        ]
  );
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Project Lead');
  const [newUserDept, setNewUserDept] = useState('Engineering');
  const [newUserPin, setNewUserPin] = useState('1234');

  // Step 3: Multi-Project Portfolio
  const [projects, setProjects] = useState<ProjectEntity[]>(
    initialProjects.length > 0
      ? initialProjects
      : [
          {
            id: 'prj-default-1',
            name: 'Production Program Alpha',
            code: 'PRJ-001',
            industrySector: 'Tech Development',
            description: 'Primary operational program governed by Six Sigma DMAIC gates.',
            targetSigmaLevel: 6.0,
            leadName: 'System Administrator',
            createdAt: new Date().toISOString(),
          },
        ]
  );
  const [newProjName, setNewProjName] = useState('');
  const [newProjCode, setNewProjCode] = useState('PRJ-002');
  const [newProjSector, setNewProjSector] = useState<IndustrySector>('Construction & Civil');
  const [newProjDesc, setNewProjDesc] = useState('');

  // Step 4: Channels & RAG Initial SOP
  const [channels, setChannels] = useState<ChatChannel[]>(initialChannels);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelTopic, setNewChannelTopic] = useState('');
  const [includeDmaicCharterDoc, setIncludeDmaicCharterDoc] = useState(true);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    const initials = newUserName
      .trim()
      .split(/\s+/)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 2);

    const added: TeamMember = {
      id: `usr-${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim().toLowerCase(),
      role: newUserRole,
      title: `${newUserRole} · ${newUserDept}`,
      department: newUserDept,
      initials: initials || 'US',
      avatarHue: 0,
      capacityHoursPerWeek: 40,
      hourlyRate: 120,
      platforms: ['macOS', 'Windows', 'iOS', 'Android'],
      status: 'active',
      accessPin: newUserPin.trim() || '0000',
      createdAt: new Date().toISOString(),
    };
    setMembers((prev) => [...prev, added]);
    setNewUserName('');
    setNewUserEmail('');
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || !newProjCode.trim()) return;
    const nextIdx = projects.length + 2;
    const added: ProjectEntity = {
      id: `prj-${Date.now()}`,
      name: newProjName.trim(),
      code: newProjCode.trim().toUpperCase(),
      industrySector: newProjSector,
      description:
        newProjDesc.trim() ||
        `${newProjSector} execution program managed under Six Sigma DMAIC control.`,
      targetSigmaLevel: targetSigma,
      leadName: members[0]?.name || 'System Administrator',
      createdAt: new Date().toISOString(),
    };
    setProjects((prev) => [...prev, added]);
    setNewProjName('');
    setNewProjCode(`PRJ-00${nextIdx}`);
    setNewProjDesc('');
  };

  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    const slug = newChannelName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-');
    const added: ChatChannel = {
      id: `chn-${Date.now()}`,
      name: slug,
      topic: newChannelTopic.trim() || `Operational coordination channel for #${slug}`,
      isPrivate: false,
      type: 'channel',
      createdAt: new Date().toISOString(),
    };
    setChannels((prev) => [...prev, added]);
    setNewChannelName('');
    setNewChannelTopic('');
  };

  const handleFinalizeSetup = () => {
    const initialDocs: KnowledgeDocument[] = includeDmaicCharterDoc
      ? [
          {
            id: 'doc-charter-01',
            code: 'SOP-DMAIC-01',
            title: `${orgName} Six Sigma DMAIC & Multi-Project Execution Charter`,
            category: 'Six Sigma Charter',
            dmaicPhase: 'Define',
            content: `All deliverables in ${orgName} follow the 5-step Six Sigma DMAIC lifecycle (Define, Measure, Analyze, Improve, Control) targeting ${targetSigma}σ process capability. Tasks are ranked by priorityIndex via drag-and-drop and validated against DAG critical-path constraints.`,
            authorName: members[0]?.name || 'System Administrator',
            updatedAt: new Date().toISOString(),
          },
        ]
      : [];

    onCompleteSetup({
      organizationName: orgName.trim() || 'KronoSphere Enterprise',
      organizationDomain: orgDomain.trim() || 'enterprise.local',
      targetSigmaLevel: targetSigma,
      projects,
      members,
      channels,
      knowledgeDocs: initialDocs,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-installer-title"
      data-testid="setup-installer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto"
    >
      <div className="w-full max-w-4xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-100 shadow-2xl overflow-hidden my-6">
        {/* Top Installer Header */}
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-900/50">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-mono text-zinc-500">
              First-Load Enterprise Deployment & Multi-Project Setup System
            </div>
            <h1
              id="setup-installer-title"
              className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white mt-0.5"
            >
              KronoSphere System Installation & Multi-Project Provisioning
            </h1>
          </div>

          <button
            type="button"
            onClick={handleFinalizeSetup}
            data-testid="complete-setup-button"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Check className="w-4 h-4" />
            Complete Setup & Launch Workspace
          </button>
        </div>

        {/* 4-Step Progress Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          {(
            [
              { num: 1, label: '01. Organization & Vault', icon: Lock },
              { num: 2, label: '02. RBAC User Auth', icon: Shield },
              { num: 3, label: '03. Multi-Project Setup', icon: FolderKanban },
              { num: 4, label: '04. Channels & RAG Index', icon: Sparkles },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = step === item.num;
            return (
              <button
                key={item.num}
                type="button"
                onClick={() => setStep(item.num)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors text-left ${
                  active
                    ? 'border-zinc-950 dark:border-white text-zinc-950 dark:text-white bg-zinc-100/70 dark:bg-zinc-900'
                    : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Step Body */}
        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                  Step 1: Organization Identity, Security Vault & Six Sigma Standard
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Configure your enterprise tenant parameters, client-side AES-GCM-256 encryption policy, and baseline Six Sigma target level.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="setup-org-name"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Organization / Enterprise Name
                  </label>
                  <input
                    id="setup-org-name"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="setup-org-domain"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Primary Authentication Domain
                  </label>
                  <input
                    id="setup-org-domain"
                    type="text"
                    value={orgDomain}
                    onChange={(e) => setOrgDomain(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="setup-target-sigma"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Target Six Sigma Benchmark
                  </label>
                  <select
                    id="setup-target-sigma"
                    value={targetSigma}
                    onChange={(e) => setTargetSigma(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
                  >
                    <option value={6.0}>6.0σ World-Class (≤ 3.4 DPMO · 99.99966% Yield)</option>
                    <option value={5.0}>5.0σ High Precision (≤ 233 DPMO · 99.977% Yield)</option>
                    <option value={4.0}>4.0σ Industry Standard (≤ 6,210 DPMO · 99.38% Yield)</option>
                    <option value={3.0}>3.0σ Baseline Control (≤ 66,807 DPMO · 93.32% Yield)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
                  <div className="text-xs font-semibold text-zinc-950 dark:text-white">
                    Multi-Project Portfolio Engine
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Isolate tasks, milestones, timesheets, and DMAIC scorecards per project while maintaining cross-project RAG search.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
                  <div className="text-xs font-semibold text-zinc-950 dark:text-white">
                    Role-Based User Auth (RBAC)
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Granular account authentication with PIN verification and 4-tier permissions (Admin, Project Lead, Contributor, Auditor).
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
                  <div className="text-xs font-semibold text-zinc-950 dark:text-white">
                    WebSocket Channels & Gemini RAG
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Slack-style real-time channels paired with hybrid BM25 + Gemini 3.8 Flash Retrieval-Augmented Generation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                  Step 2: Provision Role-Based User Accounts (RBAC Directory)
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Add administrators, project leads, contributors, and quality auditors. You can switch authenticated sessions at any time.
                </p>
              </div>

              <form
                onSubmit={handleAddMember}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
              >
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g., Elena Vance"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="elena@enterprise.local"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    RBAC Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Access PIN
                  </label>
                  <input
                    type="text"
                    value={newUserPin}
                    onChange={(e) => setNewUserPin(e.target.value)}
                    placeholder="1234"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-black"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add User
                </button>
              </form>

              <div className="space-y-2">
                {members.map((m, idx) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-md bg-zinc-950 text-white dark:bg-white dark:text-black font-bold flex items-center justify-center text-[11px]">
                        {m.initials}
                      </span>
                      <div>
                        <div className="font-semibold text-zinc-950 dark:text-white">
                          {m.name}{' '}
                          <span className="font-mono text-[11px] text-zinc-500">
                            ({m.email})
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Role: <strong>{m.role}</strong> · Dept: {m.department} · PIN: {m.accessPin || '0000'}
                        </div>
                      </div>
                    </div>
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setMembers((prev) => prev.filter((item) => item.id !== m.id))
                        }
                        className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        aria-label={`Remove ${m.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                  Step 3: Initialize Multi-Project Portfolio
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Provision one or multiple projects across Construction, Event Production, Tech Development, or Manufacturing.
                </p>
              </div>

              <form
                onSubmit={handleAddProject}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
              >
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    placeholder="e.g., Metro Tower Construction"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Project Code
                  </label>
                  <input
                    type="text"
                    value={newProjCode}
                    onChange={(e) => setNewProjCode(e.target.value)}
                    placeholder="PRJ-002"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Industry Sector
                  </label>
                  <select
                    value={newProjSector}
                    onChange={(e) => setNewProjSector(e.target.value as IndustrySector)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  >
                    {SECTORS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-black"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Project to Portfolio
                </button>
              </form>

              <div className="space-y-2">
                {projects.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <Layers className="w-4 h-4 text-zinc-500 shrink-0" />
                      <div>
                        <div className="font-semibold text-zinc-950 dark:text-white">
                          <span className="font-mono mr-2">{p.code}</span>
                          {p.name}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Sector: <strong>{p.industrySector}</strong> · Target Quality: {p.targetSigmaLevel}σ
                        </div>
                      </div>
                    </div>
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setProjects((prev) => prev.filter((item) => item.id !== p.id))
                        }
                        className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        aria-label={`Remove ${p.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                  Step 4: Slack-Style Collaboration Channels & RAG Knowledge Base
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Configure real-time WebSocket channels and seed the Retrieval-Augmented Generation (RAG) knowledge index.
                </p>
              </div>

              <form
                onSubmit={handleAddChannel}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
              >
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g., field-construction-ops"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Channel Topic
                  </label>
                  <input
                    type="text"
                    value={newChannelTopic}
                    onChange={(e) => setNewChannelTopic(e.target.value)}
                    placeholder="Daily site inspections & DMAIC escalations"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-black"
                >
                  <Hash className="w-3.5 h-3.5" />
                  Create Channel
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {channels.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                  >
                    <div className="font-mono font-semibold text-zinc-950 dark:text-white">
                      #{c.name}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">
                      {c.topic}
                    </div>
                  </div>
                ))}
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDmaicCharterDoc}
                  onChange={(e) => setIncludeDmaicCharterDoc(e.target.checked)}
                />
                <span>
                  Index standard <strong>Six Sigma DMAIC Execution Charter (SOP-DMAIC-01)</strong> into the RAG Knowledge Base
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
          <div className="text-xs text-zinc-500">
            Step {step} of 4 · {projects.length} Project(s) · {members.length} User(s) · {channels.length} Channel(s)
          </div>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
              >
                Previous Step
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-black"
              >
                Next Step →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalizeSetup}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-black"
              >
                Finish Installation & Launch
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
