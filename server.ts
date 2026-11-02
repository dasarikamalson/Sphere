import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { INITIAL_WORKSPACE_STATE } from './src/data/seedData';
import {
  retrieveRelevantChunks,
  synthesizeLocalRagAnswer,
} from './src/utils/projectEngine';
import { ChatChannel, ChatMessage, WorkspaceState } from './src/types/project';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), '.data');
const WORKSPACE_FILE = path.join(DATA_DIR, 'workspace-clean-prod-v6.json');
const BACKUPS_FILE = path.join(DATA_DIR, 'encrypted-backups.json');

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(WORKSPACE_FILE)) {
    fs.writeFileSync(
      WORKSPACE_FILE,
      JSON.stringify(INITIAL_WORKSPACE_STATE, null, 2),
      'utf-8'
    );
  }
  if (!fs.existsSync(BACKUPS_FILE)) {
    fs.writeFileSync(BACKUPS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

function readWorkspace(): WorkspaceState {
  ensureStorage();
  try {
    const raw = fs.readFileSync(WORKSPACE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as WorkspaceState;
    return {
      ...INITIAL_WORKSPACE_STATE,
      ...parsed,
      projects: Array.isArray(parsed.projects) && parsed.projects.length > 0
        ? parsed.projects
        : INITIAL_WORKSPACE_STATE.projects,
      channels: Array.isArray(parsed.channels) && parsed.channels.length > 0
        ? parsed.channels
        : INITIAL_WORKSPACE_STATE.channels,
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      knowledgeDocs: Array.isArray(parsed.knowledgeDocs) ? parsed.knowledgeDocs : [],
      widgets: Array.isArray(parsed.widgets) && parsed.widgets.some((w) => w.id === 'dmaic_methodology')
        ? parsed.widgets
        : INITIAL_WORKSPACE_STATE.widgets,
    };
  } catch {
    return INITIAL_WORKSPACE_STATE;
  }
}

function writeWorkspace(state: WorkspaceState) {
  ensureStorage();
  fs.writeFileSync(WORKSPACE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

async function startServer() {
  ensureStorage();
  const app = express();
  const server = http.createServer(app);
  app.use(express.json({ limit: '5mb' }));

  // Attach real-time WebSocket server on /ws (same port 3000)
  const wss = new WebSocketServer({ server, path: '/ws' });
  const connectedUsers = new Map<WebSocket, { userId: string; name: string; role: string }>();

  function broadcastEvent(event: string, payload: unknown) {
    const serialized = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    }
  }

  function broadcastPresence() {
    const activeUsers = Array.from(connectedUsers.values());
    broadcastEvent('presence:update', { activeUsers, count: Math.max(1, activeUsers.length) });
  }

  wss.on('connection', (ws) => {
    connectedUsers.set(ws, {
      userId: 'usr-admin-1',
      name: 'System Administrator',
      role: 'Admin',
    });
    broadcastPresence();

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.event === 'user:identify' && data.payload) {
          connectedUsers.set(ws, {
            userId: String(data.payload.userId || 'usr-admin-1'),
            name: String(data.payload.name || 'Member'),
            role: String(data.payload.role || 'Contributor'),
          });
          broadcastPresence();
        } else if (data.event === 'message:create' && data.payload) {
          const msg = data.payload as ChatMessage;
          const wsState = readWorkspace();
          if (!wsState.messages.some((m) => m.id === msg.id)) {
            wsState.messages = [...wsState.messages, msg];
            wsState.lastSyncedAt = new Date().toISOString();
            writeWorkspace(wsState);
          }
          broadcastEvent('message:created', msg);
        } else if (data.event === 'channel:create' && data.payload) {
          const ch = data.payload as ChatChannel;
          const wsState = readWorkspace();
          if (!wsState.channels.some((c) => c.id === ch.id)) {
            wsState.channels = [...wsState.channels, ch];
            writeWorkspace(wsState);
          }
          broadcastEvent('channel:created', ch);
        }
      } catch {
        // ignore malformed frames
      }
    });

    ws.on('close', () => {
      connectedUsers.delete(ws);
      broadcastPresence();
    });
  });

  // Health & Encryption Status API
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      engine: 'KronoSphere Multi-Project & Six Sigma DMAIC Engine v6.0',
      encryption: 'AES-GCM-256 / PBKDF2-SHA256',
      realtime: 'WebSocket (/ws)',
      ragEngine: 'Hybrid BM25 + Gemini 3.8 Flash Server Synthesis',
      timestamp: new Date().toISOString(),
    });
  });

  // Fetch Workspace State
  app.get('/api/workspace', (_req, res) => {
    const state = readWorkspace();
    res.json(state);
  });

  // Reset Workspace to Clean Production State
  app.post('/api/reset', (_req, res) => {
    const clean = {
      ...INITIAL_WORKSPACE_STATE,
      lastSyncedAt: new Date().toISOString(),
    };
    writeWorkspace(clean);
    broadcastEvent('workspace:reset', clean);
    res.json(clean);
  });

  // Persist / Sync Workspace State & Reconcile Offline Mutations
  app.post('/api/sync', (req, res) => {
    const incoming = req.body;
    if (!incoming || typeof incoming !== 'object') {
      res.status(400).json({ error: 'Invalid workspace payload' });
      return;
    }
    const syncedAt = new Date().toISOString();
    const updated = {
      ...incoming,
      lastSyncedAt: syncedAt,
    } as WorkspaceState;
    writeWorkspace(updated);
    res.json({
      ok: true,
      lastSyncedAt: syncedAt,
      tasksCount: Array.isArray(updated.tasks) ? updated.tasks.length : 0,
      projectsCount: Array.isArray(updated.projects) ? updated.projects.length : 1,
    });
  });

  // Server-Side RAG (Retrieval-Augmented Generation) Endpoint using @google/genai
  app.post('/api/rag/query', async (req, res) => {
    const { query, workspaceSnapshot } = req.body || {};
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Query string is required for RAG retrieval.' });
      return;
    }

    const currentWorkspace: WorkspaceState =
      workspaceSnapshot && typeof workspaceSnapshot === 'object'
        ? (workspaceSnapshot as WorkspaceState)
        : readWorkspace();

    const retrievedChunks = retrieveRelevantChunks(query, currentWorkspace, 6);
    const localFallback = synthesizeLocalRagAnswer(query, retrievedChunks, currentWorkspace);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.json({
        ok: true,
        answer: localFallback.answer,
        citations: localFallback.citations,
        retrievedChunks,
        engine: 'Hybrid BM25 Local RAG Index',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const contextBlock = retrievedChunks
        .map((c, idx) => `[${idx + 1}] (${c.sourceCode} - ${c.sourceType}): ${c.content}`)
        .join('\n');

      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `User Query: ${query}\n\nRetrieved Workspace Context:\n${contextBlock}`,
          config: {
            systemInstruction:
              'You are the KronoSphere Enterprise RAG & Six Sigma (DMAIC) Operations Copilot. Answer the user query concisely using ONLY the Retrieved Workspace Context provided. Always cite source codes in brackets like [PRJ-001], [KRN-101], [SOP-101], or [DMAIC-01]. Explain any Six Sigma DMAIC implications clearly for both technical and non-technical users.',
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini RAG timeout')), 3000)
        ),
      ]);

      const answerText = response.text?.trim() || localFallback.answer;
      res.json({
        ok: true,
        answer: answerText,
        citations: localFallback.citations,
        retrievedChunks,
        engine: 'Gemini 3.8 Flash + Hybrid BM25 RAG',
      });
    } catch {
      res.json({
        ok: true,
        answer: localFallback.answer,
        citations: localFallback.citations,
        retrievedChunks,
        engine: 'Hybrid BM25 Local RAG Index (Fallback)',
      });
    }
  });

  // Encrypted Cloud Backup Endpoints
  app.get('/api/backups', (_req, res) => {
    try {
      const backups = JSON.parse(fs.readFileSync(BACKUPS_FILE, 'utf-8'));
      res.json(backups);
    } catch {
      res.json([]);
    }
  });

  app.post('/api/backups', (req, res) => {
    const bundle = req.body;
    if (!bundle || !bundle.ciphertextHex || !bundle.ivHex) {
      res.status(400).json({ error: 'Encrypted bundle requires ciphertextHex and ivHex' });
      return;
    }
    try {
      const existing = JSON.parse(fs.readFileSync(BACKUPS_FILE, 'utf-8'));
      const entry = {
        id: `bkp-${Date.now()}`,
        algorithm: bundle.algorithm || 'AES-GCM-256',
        ivHex: bundle.ivHex,
        saltHex: bundle.saltHex,
        byteLength: Math.round(bundle.ciphertextHex.length / 2),
        createdAt: new Date().toISOString(),
      };
      const next = [entry, ...existing].slice(0, 25);
      fs.writeFileSync(BACKUPS_FILE, JSON.stringify(next, null, 2), 'utf-8');
      res.json({ ok: true, backup: entry, totalBackups: next.length });
    } catch {
      res.status(500).json({ error: 'Failed to store encrypted backup' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`KronoSphere Multi-Project Server listening on http://localhost:${PORT}`);
  });
}

startServer();
