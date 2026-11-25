import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Paperclip,
  Trash2,
  Bot,
  User,
  FileText,
  BookOpen,
  AlertCircle,
  X,
  Tag,
  Sparkles,
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import CopyButton from '../components/common/CopyButton';
import Loader from '../components/common/Loader';
import { sendChatMessage, getChatHistory, clearChatSession } from '../api/chatApi';

const SESSION_STORAGE_KEY = 'multimodal_ai_session_id';

const getInitialSessionId = () => {
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing && existing.length >= 6) return existing;
    const created = `session-${Math.random().toString(36).substring(2, 9)}`;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return `session-${Math.random().toString(36).substring(2, 9)}`;
  }
};

export const ChatHistoryPage = ({ onAddActivity }) => {
  const [sessionId] = useState(getInitialSessionId);
  const [messages, setMessages] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Sync persisted backend session history on mount
  useEffect(() => {
    let active = true;
    const syncHistory = async () => {
      setHistoryLoading(true);
      try {
        const data = await getChatHistory(sessionId);
        if (!active || !data?.history?.length) return;
        const reconstructed = [];
        data.history.forEach((turn) => {
          reconstructed.push({
            id: `usr-${turn.turn_id}`,
            role: 'user',
            prompt: turn.prompt || `Uploaded ${turn.modality}`,
            timestamp: new Date(turn.timestamp * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          });
          reconstructed.push({
            id: `ast-${turn.turn_id}`,
            role: 'assistant',
            modality: turn.modality,
            result: { answer: turn.response_text },
            modelName: turn.metadata?.model,
            timestamp: new Date(turn.timestamp * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          });
        });
        setMessages(reconstructed);
      } catch {
        // Non-fatal if session has not started on backend yet
      } finally {
        if (active) setHistoryLoading(false);
      }
    };
    syncHistory();
    return () => {
      active = false;
    };
  }, [sessionId]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const starterPrompts = [
    {
      label: 'Explain neural attention mechanisms',
      text: 'Explain how transformer self-attention works in clear, simple language.',
    },
    {
      label: 'Summarize Apollo 11 milestones',
      text: 'Summarize the Apollo 11 lunar mission objectives and landing crew.',
    },
    {
      label: 'Attach an image, audio clip, or PDF to ask contextual questions',
      text: 'Summarize the attached file and list its key takeaways.',
    },
  ];

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setAttachedFile(selected);
      setFilePreviewUrl(selected.type?.startsWith('image/') ? URL.createObjectURL(selected) : null);
      setError(null);
    }
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputPrompt.trim() && !attachedFile) return;

    const currentPrompt = inputPrompt.trim();
    const currentFile = attachedFile;
    const persistentPreview = currentFile?.type?.startsWith('image/')
      ? URL.createObjectURL(currentFile)
      : null;

    setInputPrompt('');
    removeAttachedFile();
    setError(null);
    setConfirmClear(false);

    const turnTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userTurn = {
      id: `usr-${Date.now()}`,
      role: 'user',
      prompt: currentPrompt || (currentFile ? `Uploaded ${currentFile.name}` : ''),
      file: currentFile
        ? {
            name: currentFile.name,
            type: currentFile.type,
            preview: persistentPreview,
          }
        : null,
      timestamp: turnTime,
    };

    setMessages((prev) => [...prev, userTurn]);
    setLoading(true);

    try {
      const response = await sendChatMessage({
        file: currentFile,
        prompt: currentPrompt,
        sessionId,
      });

      const assistantTurn = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        modality: response.modality,
        result: response.result,
        modelName: response.model_name,
        processingTime: response.processing_time,
        turnCount: response.conversation_turn,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantTurn]);
      onAddActivity?.({
        title: `Unified Chat (${response.modality}): ${(currentPrompt || currentFile?.name || '').slice(0, 28)}`,
        modality: response.modality,
      });
    } catch (err) {
      setError(err.message || 'Failed to process multimodal request.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    try {
      await clearChatSession(sessionId);
      setMessages([]);
      setError(null);
      setConfirmClear(false);
    } catch (err) {
      setError(err.message || 'Failed to clear conversation history.');
    }
  };

  const getPrimaryCopyText = (res) =>
    res?.answer || res?.summary || res?.caption || res?.transcript || res?.explanation || '';

  return (
    <div className="page-wrapper chat-page animate-blur-reveal">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div>
          <Badge variant="info" icon={MessageSquare}>
            Unified Omnimodal Gateway
          </Badge>
          <h2 className="page-header__title" style={{ fontSize: '1.65rem' }}>
            Chat History &amp; Omnimodal Hub
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '2px' }}>
            Session <code>{sessionId}</code> &bull; Upload images, audio, PDFs, or text and ask follow-up questions in one continuous conversation.
          </p>
        </div>

        {messages.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {confirmClear ? (
              <>
                <Button variant="danger" size="sm" icon={Trash2} onClick={handleClearHistory} disabled={loading}>
                  Confirm Clear
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" icon={Trash2} onClick={handleClearHistory} disabled={loading}>
                Clear Conversation
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Chat Log Area */}
      <div className="glass-panel chat-feed" role="log" aria-live="polite">
        {historyLoading && messages.length === 0 ? (
          <Loader message="Restoring conversation session..." subtext={`Checking /api/v1/chat/history/${sessionId}`} />
        ) : messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '540px', padding: '1.5rem 1rem' }}>
            <div
              className="ui-card__icon-box"
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                margin: '0 auto 1.15rem',
              }}
            >
              <Bot size={26} aria-hidden="true" />
            </div>
            <h3 style={{ fontSize: '1.22rem', fontWeight: 600, marginBottom: '0.45rem' }}>
              Unified Multimodal Conversation
            </h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.55, marginBottom: '1.35rem' }}>
              Attach an image, audio clip, PDF, or TXT file using the paperclip button, or type directly. The router classifies the modality and retains session memory for follow-ups.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', textAlign: 'left' }}>
              {starterPrompts.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setInputPrompt(p.text)}
                  className="preset-chip"
                  style={{
                    borderRadius: 'var(--radius-md)',
                    padding: '0.7rem 0.95rem',
                    fontSize: '0.85rem',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Sparkles size={14} color="var(--brand-indigo)" style={{ flexShrink: 0 }} />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message-row ${
                msg.role === 'user' ? 'chat-message-row--user' : 'chat-message-row--assistant'
              }`}
            >
              <div
                className={`chat-avatar ${msg.role === 'user' ? 'chat-avatar--user' : 'chat-avatar--bot'}`}
                aria-hidden="true"
              >
                {msg.role === 'user' ? <User size={17} /> : <Bot size={17} />}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  minWidth: 0,
                }}
              >
                <div
                  className={`chat-bubble ${
                    msg.role === 'user' ? 'chat-bubble--user' : 'chat-bubble--assistant'
                  }`}
                >
                  {msg.file && (
                    <div style={{ marginBottom: '0.6rem' }}>
                      {msg.file.preview ? (
                        <img
                          src={msg.file.preview}
                          alt={msg.file.name}
                          style={{
                            maxHeight: '190px',
                            maxWidth: '250px',
                            borderRadius: 'var(--radius-md)',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            padding: '0.38rem 0.7rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(0, 0, 0, 0.25)',
                            fontSize: '0.8rem',
                          }}
                        >
                          <FileText size={14} />
                          <span>{msg.file.name}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.role === 'user' ? (
                    <p style={{ fontSize: '0.94rem', color: '#ffffff', whiteSpace: 'pre-wrap' }}>
                      {msg.prompt}
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {msg.result?.context_referenced && (
                        <div>
                          <Badge size="sm" variant="info">
                            Follow-up Context Referenced
                          </Badge>
                        </div>
                      )}

                      {msg.result?.answer && (
                        <h4 style={{ fontSize: '1.02rem', fontWeight: 600, color: '#ffffff', lineHeight: 1.5 }}>
                          {msg.result.answer}
                        </h4>
                      )}

                      {msg.result?.caption && (
                        <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                          <strong style={{ color: 'var(--modality-image)' }}>Caption:</strong> &ldquo;{msg.result.caption}&rdquo;
                        </p>
                      )}

                      {msg.result?.transcript && (
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          <strong style={{ color: 'var(--modality-audio)', fontStyle: 'normal' }}>Transcript:</strong> &ldquo;{msg.result.transcript}&rdquo;
                        </p>
                      )}

                      {msg.result?.summary && (
                        <p style={{ fontSize: '0.93rem', color: 'var(--text-primary)', lineHeight: 1.55 }}>
                          <strong style={{ color: 'var(--text-accent)' }}>Summary:</strong> {msg.result.summary}
                        </p>
                      )}

                      {msg.result?.explanation && !msg.result.answer && (
                        <p style={{ fontSize: '0.93rem', color: 'var(--text-primary)', lineHeight: 1.55 }}>
                          {msg.result.explanation}
                        </p>
                      )}

                      {msg.result?.key_points?.length > 0 && (
                        <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {msg.result.key_points.map((kp, i) => (
                            <li key={i}>{kp}</li>
                          ))}
                        </ul>
                      )}

                      {msg.result?.keywords?.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '2px' }}>
                          {msg.result.keywords.slice(0, 6).map((kw, i) => (
                            <Badge key={`${kw}-${i}`} size="sm" variant="default" icon={Tag}>
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {msg.result?.supporting_pages?.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Citations:</span>
                          {msg.result.supporting_pages.map((p) => (
                            <Badge key={p} size="sm" variant="doc" icon={BookOpen}>
                              Page {p}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {getPrimaryCopyText(msg.result) && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                          <CopyButton text={getPrimaryCopyText(msg.result)} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Metadata Footer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>{msg.timestamp}</span>
                  {msg.modality && (
                    <Badge size="sm" variant={msg.modality === 'document' ? 'doc' : msg.modality}>
                      {msg.modality.toUpperCase()}
                    </Badge>
                  )}
                  {msg.modelName && (
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{msg.modelName}</span>
                  )}
                  {msg.processingTime !== undefined && <span>&bull; {msg.processingTime}s</span>}
                </div>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div style={{ alignSelf: 'flex-start' }}>
            <Loader
              message="Routing multimodal request..."
              subtext="Executing model worker on host CPU"
            />
          </div>
        )}

        {error && (
          <div className="error-banner" role="alert">
            <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 className="error-banner__title">Request Error</h4>
              <p className="error-banner__desc">{error}</p>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Chat Composer */}
      <form onSubmit={handleSendMessage} className="glass-panel chat-composer">
        {attachedFile && (
          <div
            className="result-block animate-fade-in"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.45rem 0.75rem',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
              {filePreviewUrl ? (
                <img
                  src={filePreviewUrl}
                  alt="Attachment thumbnail"
                  style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }}
                />
              ) : (
                <Paperclip size={15} color="var(--brand-indigo)" />
              )}
              <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {attachedFile.name}
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                ({Math.max(1, Math.round(attachedFile.size / 1024))} KB)
              </span>
            </div>
            <button
              type="button"
              onClick={removeAttachedFile}
              className="icon-action-btn"
              aria-label="Remove attachment"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="chat-composer__bar">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,audio/*,.pdf,.txt,application/pdf,text/plain"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            aria-label="Attach file"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach Image, Audio, PDF, or TXT"
            aria-label="Attach image, audio, PDF, or text file"
            className="icon-action-btn"
            style={{
              width: 40,
              height: 40,
              color: attachedFile ? 'var(--brand-indigo)' : 'var(--text-secondary)',
              background: attachedFile ? 'rgba(99, 102, 241, 0.16)' : 'rgba(255, 255, 255, 0.04)',
              borderColor: 'var(--border-subtle)',
              flexShrink: 0,
            }}
          >
            <Paperclip size={18} />
          </button>

          <input
            type="text"
            placeholder="Ask a question, query an attached file, or send a follow-up..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={loading}
            className="chat-composer__input"
            aria-label="Chat message prompt"
          />

          <Button
            type="submit"
            icon={Send}
            disabled={loading || (!inputPrompt.trim() && !attachedFile)}
            loading={loading}
            loadingText="Sending..."
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatHistoryPage;
