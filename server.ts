import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INITIAL_WORKSPACE_STATE } from './src/data/seedData.ts';
import { WorkspaceState } from './src/types/project.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '.data');
const STORE_PATH = path.join(DATA_DIR, 'workspace-clean-prod-v5.json');
const BACKUP_PATH = path.join(DATA_DIR, 'encrypted-backups-v5.json');

function loadWorkspaceStore(): WorkspaceState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(raw) as WorkspaceState;
    }
  } catch (err) {
    console.error('Failed to read workspace store, initializing clean production workspace:', err);
  }
  return structuredClone(INITIAL_WORKSPACE_STATE);
}

function saveWorkspaceStore(state: WorkspaceState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist workspace store:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  let workspaceState: WorkspaceState = loadWorkspaceStore();

  // GET /api/workspace — Retrieve full workspace state
  app.get('/api/workspace', (_req, res) => {
    res.json(workspaceState);
  });

  // POST /api/sync — Synchronize client workspace state & replay offline mutations
  app.post('/api/sync', (req, res) => {
    const incoming = req.body as Partial<WorkspaceState>;
    const nowIso = new Date().toISOString();

    if (incoming && Array.isArray(incoming.tasks)) {
      workspaceState = {
        ...workspaceState,
        ...incoming,
        lastSyncedAt: nowIso,
      };
      saveWorkspaceStore(workspaceState);
    } else {
      workspaceState.lastSyncedAt = nowIso;
      saveWorkspaceStore(workspaceState);
    }

    res.json({
      status: 'synchronized',
      lastSyncedAt: workspaceState.lastSyncedAt,
      workspace: workspaceState,
    });
  });

  // POST /api/reset — Reset workspace to clean state
  app.post('/api/reset', (_req, res) => {
    workspaceState = structuredClone(INITIAL_WORKSPACE_STATE);
    workspaceState.lastSyncedAt = new Date().toISOString();
    saveWorkspaceStore(workspaceState);
    res.json(workspaceState);
  });

  // POST /api/backups — Store E2E encrypted AES-GCM-256 cloud snapshot
  app.post('/api/backups', (req, res) => {
    try {
      const bundle = req.body;
      let backups: unknown[] = [];
      if (fs.existsSync(BACKUP_PATH)) {
        backups = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf-8'));
      }
      backups.unshift({
        id: `bkp-${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...bundle,
      });
      fs.writeFileSync(BACKUP_PATH, JSON.stringify(backups.slice(0, 20), null, 2), 'utf-8');
      res.json({ ok: true, count: backups.length });
    } catch (err) {
      console.error('Backup save error:', err);
      res.status(500).json({ error: 'Failed to store encrypted cloud backup' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KronoSphere server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
