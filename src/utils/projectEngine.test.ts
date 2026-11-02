import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reorderTasksByPriorityIndex,
  moveTaskPriorityStep,
  computeSixSigmaMetrics,
  hasDependencyCycle,
  computeCriticalPath,
  canRolePerform,
  evaluateAutomationRules,
  computeProjectAnalytics,
  generateCsvReport,
  generatePdfBinary,
  encryptPayloadAES,
  decryptPayloadAES,
  DMAIC_METHODOLOGY_GUIDE,
  retrieveRelevantChunks,
  synthesizeLocalRagAnswer,
  authenticateUserAccount,
} from './projectEngine';
import { INITIAL_WORKSPACE_STATE } from '../data/seedData';
import { Task, AutomationRule, WorkspaceState } from '../types/project';

const TEST_TASKS: Task[] = [
  {
    id: 't1',
    code: 'PRJ-101',
    title: 'Define Structural Foundation Load Specs',
    description: 'Structural load engineering specification',
    status: 'Completed',
    priority: 'Critical',
    priorityIndex: 0,
    dmaicPhase: 'Define',
    industrySector: 'Construction & Civil',
    defectsCount: 0,
    opportunitiesCount: 500,
    department: 'Field Operations',
    assigneeId: 'u1',
    milestoneId: 'm1',
    estimatedHours: 20,
    loggedHours: 19,
    dueDate: '2026-11-10',
    dependencies: [],
    tags: ['construction'],
    updatedAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 't2',
    code: 'PRJ-102',
    title: 'Measure Concrete Pour Compression Yield',
    description: 'Core sample PSI testing across 400 batch opportunities',
    status: 'In Progress',
    priority: 'High',
    priorityIndex: 1,
    dmaicPhase: 'Measure',
    industrySector: 'Construction & Civil',
    defectsCount: 2,
    opportunitiesCount: 500,
    department: 'Quality & Six Sigma',
    assigneeId: 'u1',
    milestoneId: 'm1',
    estimatedHours: 35,
    loggedHours: 12,
    dueDate: '2026-11-15',
    dependencies: ['t1'],
    tags: ['six-sigma'],
    updatedAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 't3',
    code: 'PRJ-103',
    title: 'Control Stage Rigging Safety Tolerance',
    description: 'Final load verification before live event gate',
    status: 'Blocked',
    priority: 'Medium',
    priorityIndex: 2,
    dmaicPhase: 'Control',
    industrySector: 'Event Production',
    defectsCount: 1,
    opportunitiesCount: 1000,
    department: 'Logistics & Venue',
    assigneeId: 'u1',
    milestoneId: 'm1',
    estimatedHours: 15,
    loggedHours: 5,
    dueDate: '2026-11-20',
    dependencies: ['t2'],
    tags: ['events'],
    updatedAt: '2026-11-01T00:00:00Z',
  },
];

test('INITIAL_WORKSPACE_STATE starts completely clean with zero demo tasks and multi-project schema', () => {
  assert.equal(INITIAL_WORKSPACE_STATE.tasks.length, 0);
  assert.equal(INITIAL_WORKSPACE_STATE.milestones.length, 0);
  assert.equal(INITIAL_WORKSPACE_STATE.timeEntries.length, 0);
  assert.equal(INITIAL_WORKSPACE_STATE.messages.length, 0);
  assert.equal(INITIAL_WORKSPACE_STATE.knowledgeDocs.length, 0);
  assert.ok(Array.isArray(INITIAL_WORKSPACE_STATE.projects));
  assert.ok(INITIAL_WORKSPACE_STATE.projects.length >= 1);
});

test('DMAIC_METHODOLOGY_GUIDE maps all 5 Six Sigma DMAIC phases to tool workflows', () => {
  assert.equal(DMAIC_METHODOLOGY_GUIDE.length, 5);
  assert.deepEqual(
    DMAIC_METHODOLOGY_GUIDE.map((s) => s.phase),
    ['Define', 'Measure', 'Analyze', 'Improve', 'Control']
  );
  for (const step of DMAIC_METHODOLOGY_GUIDE) {
    assert.ok(step.plainLanguageExplanation.length > 20);
    assert.ok(step.kronosphereToolMapping.length > 20);
    assert.ok(step.keyOutputs.length >= 2);
  }
});

test('reorderTasksByPriorityIndex reorders tasks and updates priorityIndex sequentially', () => {
  const reordered = reorderTasksByPriorityIndex(TEST_TASKS, 't3', 't1');
  assert.equal(reordered[0].id, 't3');
  assert.equal(reordered[0].priorityIndex, 0);
  assert.equal(reordered[1].id, 't1');
  assert.equal(reordered[1].priorityIndex, 1);
  assert.equal(reordered[2].id, 't2');
  assert.equal(reordered[2].priorityIndex, 2);

  const stepped = moveTaskPriorityStep(reordered, 't1', -1);
  assert.equal(stepped[0].id, 't1');
  assert.equal(stepped[0].priorityIndex, 0);
  assert.equal(stepped[1].id, 't3');
  assert.equal(stepped[1].priorityIndex, 1);
});

test('computeSixSigmaMetrics calculates accurate DPMO, Yield %, Sigma Level, and DMAIC breakdown', () => {
  const sigma = computeSixSigmaMetrics(TEST_TASKS);
  assert.equal(sigma.totalOpportunities, 2000);
  assert.equal(sigma.totalDefects, 3);
  assert.equal(sigma.dpmo, 1500);
  assert.equal(sigma.yieldPct, 99.85);
  assert.ok(sigma.sigmaLevel >= 4.0 && sigma.sigmaLevel <= 5.0);
  assert.equal(sigma.dmaicBreakdown.length, 5);
});

test('hasDependencyCycle detects direct and transitive cycles accurately', () => {
  assert.equal(hasDependencyCycle(TEST_TASKS, 't1', 't1'), true);
  assert.equal(hasDependencyCycle(TEST_TASKS, 't1', 't3'), true);
  assert.equal(hasDependencyCycle(TEST_TASKS, 't3', 't1'), false);
});

test('computeCriticalPath calculates longest duration chain and blocked tasks', () => {
  const analysis = computeCriticalPath(TEST_TASKS);
  assert.deepEqual(analysis.criticalTaskIds, ['t1', 't2', 't3']);
  assert.equal(analysis.totalCriticalHours, 70);
  assert.ok(analysis.blockedTaskIds.includes('t3'));
});

test('canRolePerform and authenticateUserAccount enforce RBAC and account status', () => {
  const matrix = INITIAL_WORKSPACE_STATE.permissions;
  assert.equal(canRolePerform('Admin', 'manage_rbac', matrix), true);
  assert.equal(canRolePerform('Project Lead', 'create_task', matrix), true);
  assert.equal(canRolePerform('Project Lead', 'manage_rbac', matrix), false);
  assert.equal(canRolePerform('Contributor', 'log_time', matrix), true);
  assert.equal(canRolePerform('Contributor', 'delete_task', matrix), false);
  assert.equal(canRolePerform('Auditor', 'export_reports', matrix), true);
  assert.equal(canRolePerform('Auditor', 'create_task', matrix), false);

  const authSuccess = authenticateUserAccount(
    INITIAL_WORKSPACE_STATE.members,
    'admin@enterprise.local',
    '0000'
  );
  assert.equal(authSuccess.ok, true);
  assert.equal(authSuccess.user?.role, 'Admin');

  const authBadPin = authenticateUserAccount(
    INITIAL_WORKSPACE_STATE.members,
    'admin@enterprise.local',
    '9999'
  );
  assert.equal(authBadPin.ok, false);
});

test('retrieveRelevantChunks and synthesizeLocalRagAnswer rank multi-project tasks, docs, and channels', () => {
  const sampleWorkspace: WorkspaceState = {
    ...INITIAL_WORKSPACE_STATE,
    tasks: TEST_TASKS,
    knowledgeDocs: [
      {
        id: 'doc-1',
        code: 'SOP-101',
        title: 'Concrete Compression & Rebar Inspection Protocol',
        category: 'SOP',
        dmaicPhase: 'Measure',
        content: 'All structural pours must pass 4500 PSI compression tests with zero rebar voids.',
        authorName: 'System Administrator',
        updatedAt: '2026-11-01T00:00:00Z',
      },
    ],
  };

  const chunks = retrieveRelevantChunks('concrete compression PRJ-102 SOP-101', sampleWorkspace, 4);
  assert.ok(chunks.length >= 2);
  assert.ok(chunks.some((c) => c.sourceCode === 'PRJ-102' || c.sourceCode === 'SOP-101'));

  const synthesis = synthesizeLocalRagAnswer('concrete compression', chunks, sampleWorkspace);
  assert.ok(synthesis.answer.includes('Grounded RAG Analysis'));
  assert.ok(synthesis.citations.length >= 2);
});

test('evaluateAutomationRules triggers priority escalation when task is blocked', () => {
  const rules: AutomationRule[] = [
    {
      id: 'r1',
      name: 'Escalate Blocked Tasks',
      department: 'All',
      trigger: 'status_changed_to_blocked',
      action: 'escalate_priority_critical',
      enabled: true,
      executionCount: 0,
    },
  ];
  const prevTask = { ...TEST_TASKS[2], status: 'In Progress' as const, priority: 'Medium' as const };
  const blockedTask = { ...TEST_TASKS[2], status: 'Blocked' as const, priority: 'Medium' as const };
  const result = evaluateAutomationRules(blockedTask, prevTask, rules);

  assert.equal(result.updatedTask.priority, 'Critical');
  assert.equal(result.triggeredRules.length, 1);
  assert.equal(result.notifications.length, 1);
});

test('generateCsvReport and generatePdfBinary include priorityIndex and Six Sigma metrics', () => {
  const summary = computeProjectAnalytics(TEST_TASKS, [], [], []);
  const csv = generateCsvReport(TEST_TASKS, [], []);
  assert.ok(csv.includes('PriorityIndex,Code,Title,IndustrySector,DMAIC_Phase'));
  assert.ok(csv.includes('PRJ-101'));

  const pdfBytes = generatePdfBinary('Production Test', summary, TEST_TASKS, []);
  const header = new TextDecoder().decode(pdfBytes.slice(0, 8));
  assert.equal(header, '%PDF-1.4');
});

test('encryptPayloadAES and decryptPayloadAES round-trip with Web Crypto AES-GCM-256', async () => {
  const secretPayload = JSON.stringify({ project: 'CleanProd', tasks: 0 });
  const passphrase = 'production-passphrase-2026';
  const bundle = await encryptPayloadAES(secretPayload, passphrase);
  assert.equal(bundle.algorithm, 'AES-GCM-256');
  const decrypted = await decryptPayloadAES(bundle, passphrase);
  assert.equal(decrypted, secretPayload);
});
