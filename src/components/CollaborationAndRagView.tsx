import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChatChannel,
  ChatMessage,
  DmaicPhase,
  KnowledgeDocument,
  TeamMember,
  WorkspaceState,
} from '../types/project';
import {
  RagChunk,
  retrieveRelevantChunks,
  synthesizeLocalRagAnswer,
} from '../utils/projectEngine';
import {
  BookOpen,
  Bot,
  Check,
  FileText,
  Hash,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  ThumbsUp,
  Users,
  X,
} from 'lucide-react';

interface CollaborationAndRagViewProps {
  workspace: WorkspaceState;
  currentUser: TeamMember;
  wsConnected: boolean;
  onlineUserCount: number;
  onSendMessage: (channelId: string, content: string, threadParentId?: string, ragData?: { isRagResponse: boolean; citations: string[] }) => void;
  onToggleReaction: (messageId: string, reactionKey: string) => void;
  onCreateChannel: (name: string, topic: string, isPrivate: boolean) => void;
  onAddKnowledgeDoc: (doc: Omit<KnowledgeDocument, 'id' | 'code' | 'updatedAt'>) => void;
}

const ALL_DMAIC_PHASES: DmaicPhase[] = ['Define', 'Measure', 'Analyze', 'Improve', 'Control'];
const DOC_CATEGORIES: KnowledgeDocument['category'][] = [
  'SOP',
  'Six Sigma Charter',
  'Engineering Spec',
  'Safety & Compliance',
  'Run of Show',
];

export const CollaborationAndRagView: React.FC<CollaborationAndRagViewProps> = ({
  workspace,
  currentUser,
  wsConnected,
  onlineUserCount,
  onSendMessage,
  onToggleReaction,
  onCreateChannel,
  onAddKnowledgeDoc,
}) => {
  const [activeChannelId, setActiveChannelId] = useState<string>(
    workspace.channels[0]?.id || 'chn-general'
  );
  const [messageInput, setMessageInput] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  // Create Channel Modal
  const [isNewChannelOpen, setIsNewChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelTopic, setNewChannelTopic] = useState('');
  const [newChannelPrivate, setNewChannelPrivate] = useState(false);

  // RAG Copilot State
  const [ragQuery, setRagQuery] = useState('');
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResult, setRagResult] = useState<{
    answer: string;
    citations: string[];
    retrievedChunks: RagChunk[];
    engine: string;
  } | null>(null);

  // Add Knowledge Document Modal
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<KnowledgeDocument['category']>('SOP');
  const [docPhase, setDocPhase] = useState<DmaicPhase>('Control');
  const [docContent, setDocContent] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      workspace.channels.length > 0 &&
      !workspace.channels.some((c) => c.id === activeChannelId)
    ) {
      setActiveChannelId(workspace.channels[0].id);
    }
  }, [workspace.channels, activeChannelId]);

  const activeChannel = useMemo(
    () =>
      workspace.channels.find((c) => c.id === activeChannelId) ||
      workspace.channels[0],
    [workspace.channels, activeChannelId]
  );

  const channelMessages = useMemo(
    () =>
      workspace.messages.filter(
        (m) => m.channelId === (activeChannel?.id || 'chn-general')
      ),
    [workspace.messages, activeChannel]
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = messageInput.trim();
    if (!trimmed || !activeChannel) return;

    onSendMessage(activeChannel.id, trimmed, replyingToId || undefined);
    setMessageInput('');
    setReplyingToId(null);

    // If message starts with /rag or mentions @rag, also post a grounded RAG answer into the channel!
    if (trimmed.toLowerCase().startsWith('/rag ') || trimmed.toLowerCase().includes('@rag')) {
      const cleanQuery = trimmed.replace(/^\/rag\s+/i, '').replace(/@rag/gi, '').trim();
      if (cleanQuery) {
        await executeRagQuery(cleanQuery, true);
      }
    }
  };

  const executeRagQuery = async (queryText: string, postToChannel = false) => {
    const clean = queryText.trim();
    if (!clean) return;

    // Immediately compute deterministic local BM25 RAG retrieval so UI is instant
    const localChunks = retrieveRelevantChunks(clean, workspace, 5);
    const localSynthesis = synthesizeLocalRagAnswer(clean, localChunks, workspace);
    setRagResult({
      answer: localSynthesis.answer,
      citations: localSynthesis.citations,
      retrievedChunks: localChunks,
      engine: 'Hybrid BM25 Local RAG Index',
    });

    setRagLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 3500);
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: clean,
          workspaceSnapshot: workspace,
        }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        setRagResult({
          answer: data.answer || localSynthesis.answer,
          citations: data.citations || localSynthesis.citations,
          retrievedChunks: data.retrievedChunks || localChunks,
          engine: data.engine || 'Hybrid BM25 + Gemini RAG',
        });
        if (postToChannel && activeChannel) {
          onSendMessage(activeChannel.id, data.answer || localSynthesis.answer, undefined, {
            isRagResponse: true,
            citations: data.citations || localSynthesis.citations,
          });
        }
        setRagLoading(false);
        return;
      }
    } catch {
      // Keep instant local BM25 RAG synthesis
    }

    if (postToChannel && activeChannel) {
      onSendMessage(activeChannel.id, localSynthesis.answer, undefined, {
        isRagResponse: true,
        citations: localSynthesis.citations,
      });
    }
    setRagLoading(false);
  };

  const handleCreateChannelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    onCreateChannel(
      newChannelName.trim(),
      newChannelTopic.trim() || `Operational coordination channel`,
      newChannelPrivate
    );
    setNewChannelName('');
    setNewChannelTopic('');
    setNewChannelPrivate(false);
    setIsNewChannelOpen(false);
  };

  const handleAddDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) return;
    onAddKnowledgeDoc({
      projectId: workspace.activeProjectId,
      title: docTitle.trim(),
      category: docCategory,
      dmaicPhase: docPhase,
      content: docContent.trim(),
      authorName: currentUser.name,
    });
    setDocTitle('');
    setDocContent('');
    setIsAddDocOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              Real-Time Collaboration & Enterprise RAG
            </span>
            <span>·</span>
            <span>
              {wsConnected ? 'WebSocket Live (/ws)' : 'Local Sync Mode'} · {onlineUserCount} Active Operator(s)
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white mt-1">
            Team Channels, Direct Messaging & RAG Knowledge Copilot
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAddDocOpen(true)}
            data-testid="add-knowledge-doc-btn"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Ingest SOP / Knowledge Doc
          </button>

          <button
            type="button"
            onClick={() => setIsNewChannelOpen(true)}
            data-testid="new-channel-btn"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Channel
          </button>
        </div>
      </div>

      {/* Create Channel Modal */}
      {isNewChannelOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
        >
          <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                Create Collaboration Channel
              </h2>
              <button
                type="button"
                onClick={() => setIsNewChannelOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateChannelSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="new-channel-name-input"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Channel Name (slug)
                </label>
                <input
                  id="new-channel-name-input"
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g., construction-safety-gates"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
              <div>
                <label
                  htmlFor="new-channel-topic-input"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Channel Purpose / DMAIC Scope
                </label>
                <input
                  id="new-channel-topic-input"
                  type="text"
                  value={newChannelTopic}
                  onChange={(e) => setNewChannelTopic(e.target.value)}
                  placeholder="Daily structural inspections and defect resolution"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={newChannelPrivate}
                  onChange={(e) => setNewChannelPrivate(e.target.checked)}
                />
                <span>Private Role-Restricted Channel</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewChannelOpen(false)}
                  className="px-3.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-black"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ingest Knowledge Doc Modal */}
      {isAddDocOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
        >
          <div className="w-full max-w-lg rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                Ingest Document into RAG Knowledge Base
              </h2>
              <button
                type="button"
                onClick={() => setIsAddDocOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddDocSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="rag-doc-title"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Document Title
                </label>
                <input
                  id="rag-doc-title"
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g., Structural Concrete Pour Quality Control SOP"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Document Category
                  </label>
                  <select
                    value={docCategory}
                    onChange={(e) =>
                      setDocCategory(e.target.value as KnowledgeDocument['category'])
                    }
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                  >
                    {DOC_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    DMAIC Lifecycle Phase
                  </label>
                  <select
                    value={docPhase}
                    onChange={(e) => setDocPhase(e.target.value as DmaicPhase)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                  >
                    {ALL_DMAIC_PHASES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label
                  htmlFor="rag-doc-content"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Specification / Standard Operating Procedure Content
                </label>
                <textarea
                  id="rag-doc-content"
                  rows={4}
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  placeholder="Enter full specification, acceptance criteria, tolerance thresholds, or run-of-show instructions..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDocOpen(false)}
                  className="px-3.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-black"
                >
                  Index Document into RAG
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3-Column Collaboration & RAG Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Channels & Direct Messages */}
        <div className="lg:col-span-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-5">
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-2">
              <span>Operational Channels</span>
              <span>{workspace.channels.length}</span>
            </div>
            <div className="space-y-1">
              {workspace.channels.map((ch) => {
                const isActive = ch.id === activeChannel?.id;
                const msgCount = workspace.messages.filter(
                  (m) => m.channelId === ch.id
                ).length;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setActiveChannelId(ch.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                      isActive
                        ? 'bg-zinc-950 text-white dark:bg-white dark:text-black font-semibold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Hash className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{ch.name}</span>
                    </span>
                    {msgCount > 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                        {msgCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct Messages / Team Members */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-2">
              <span>Authenticated Roster</span>
              <Users className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-1.5">
              {workspace.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black text-[10px] font-bold flex items-center justify-center shrink-0">
                      {m.initials}
                    </span>
                    <div className="truncate">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {m.name}
                      </div>
                      <div className="text-[10px] text-zinc-500">{m.role}</div>
                    </div>
                  </div>
                  <span
                    className="w-2 h-2 rounded-full bg-zinc-950 dark:bg-white shrink-0"
                    title="Active"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Column: Slack-Type Real-Time Channel Stream */}
        <div className="lg:col-span-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col h-[600px]">
          {/* Channel Header */}
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-950 dark:text-white">
                <Hash className="w-4 h-4" />
                <span>{activeChannel?.name || 'general'}</span>
              </div>
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                {activeChannel?.topic}
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 shrink-0">
              Posting as {currentUser.name} ({currentUser.role})
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {channelMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-2">
                <MessageSquare className="w-7 h-7 text-zinc-400" />
                <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                  No messages in #{activeChannel?.name || 'general'} yet
                </div>
                <p className="text-[11px] text-zinc-500 max-w-xs">
                  Start a real-time discussion, mention task codes (e.g. @KRN-101), or type <code className="font-mono">/rag &lt;question&gt;</code> to query the Six Sigma & project knowledge base directly in chat.
                </p>
              </div>
            ) : (
              channelMessages.map((msg) => {
                const parentMsg = msg.threadParentId
                  ? workspace.messages.find((m) => m.id === msg.threadParentId)
                  : null;
                const upCount = (msg.reactions?.['+1'] || []).length;
                const checkCount = (msg.reactions?.['check'] || []).length;

                return (
                  <div
                    key={msg.id}
                    data-testid="chat-message-item"
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      msg.isRagResponse
                        ? 'border-zinc-900 dark:border-zinc-200 bg-zinc-50 dark:bg-zinc-900'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                    }`}
                  >
                    {parentMsg && (
                      <div className="text-[10px] text-zinc-500 pl-2 border-l-2 border-zinc-400 truncate">
                        Replying to {parentMsg.senderName}: {parentMsg.content}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-950 dark:text-white">
                          {msg.senderName}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                          {msg.senderRole}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>

                    {msg.citations && msg.citations.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {msg.citations.map((cit, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                          >
                            {cit}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onToggleReaction(msg.id, '+1')}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      >
                        <ThumbsUp className="w-2.5 h-2.5" />
                        <span>{upCount}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleReaction(msg.id, 'check')}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      >
                        <Check className="w-2.5 h-2.5" />
                        <span>{checkCount}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyingToId(msg.id)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                      >
                        Reply in Thread
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2"
          >
            {replyingToId && (
              <div className="flex items-center justify-between text-[11px] text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded">
                <span>Replying to thread message</span>
                <button
                  type="button"
                  onClick={() => setReplyingToId(null)}
                  className="hover:text-zinc-900 dark:hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                data-testid="chat-message-input"
                placeholder={`Message #${activeChannel?.name || 'general'} or type /rag <query>...`}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white focus:outline-none focus:border-zinc-500"
              />
              <button
                type="submit"
                data-testid="chat-send-btn"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-black hover:opacity-90"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Enterprise RAG Knowledge Base & AI Copilot */}
        <div className="lg:col-span-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-zinc-950 dark:text-white" />
              <div>
                <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
                  RAG Knowledge Base & Copilot
                </h2>
                <p className="text-[11px] text-zinc-500">
                  Indexes all Projects, Tasks, Channels, SOPs & Six Sigma DMAIC Rules
                </p>
              </div>
            </div>
          </div>

          {/* Search / Ask RAG Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeRagQuery(ragQuery, false);
            }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                data-testid="rag-query-input"
                placeholder="Ask about DMAIC phases, defects, tasks, or SOPs..."
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white"
              />
              <button
                type="submit"
                disabled={ragLoading}
                data-testid="rag-ask-btn"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-black disabled:opacity-50 whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {ragLoading ? 'Retrieving...' : 'Ask RAG'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                'How does DMAIC map to KronoSphere?',
                'Summarize active project quality & DPMO',
                'List top priority tasks',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setRagQuery(preset);
                    executeRagQuery(preset, false);
                  }}
                  className="text-[10px] px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  {preset}
                </button>
              ))}
            </div>
          </form>

          {/* RAG Answer & Citations Output */}
          {ragResult && (
            <div
              data-testid="rag-answer-box"
              className="p-3.5 rounded-xl border border-zinc-900 dark:border-zinc-200 bg-zinc-50 dark:bg-zinc-900 space-y-2.5 text-xs"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>Engine: {ragResult.engine}</span>
                <span>{ragResult.retrievedChunks.length} chunks retrieved</span>
              </div>
              <div className="text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed">
                {ragResult.answer}
              </div>
              {ragResult.citations.length > 0 && (
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="text-[10px] font-mono uppercase text-zinc-500 mb-1">
                    Verified Grounding Citations
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ragResult.citations.map((cit, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      >
                        {cit}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Indexed Knowledge Base Documents */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Indexed SOPs & Charters ({workspace.knowledgeDocs.length})
              </span>
              <span>+{workspace.tasks.length} Tasks Indexed</span>
            </div>

            {workspace.knowledgeDocs.length === 0 ? (
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500">
                No custom SOP documents uploaded yet. The RAG engine automatically indexes all Projects, Tasks, Milestones, Channel Messages, and the 5-step DMAIC Methodology Guide. Click <strong>Ingest SOP / Knowledge Doc</strong> to add custom specifications.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {workspace.knowledgeDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span>
                        {doc.code} · {doc.category}
                      </span>
                      <span>DMAIC: {doc.dmaicPhase}</span>
                    </div>
                    <div className="font-semibold text-zinc-950 dark:text-white mt-0.5">
                      {doc.title}
                    </div>
                    <div className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">
                      {doc.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
