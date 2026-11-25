import React, { useRef } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Mic,
  FileText,
  FileSearch,
  MessageSquare,
  Activity,
  Cpu,
  Layers,
  ArrowRight,
  Clock,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import SkeletonLoader from '../components/common/SkeletonLoader';
import { useScrollReveal } from '../hooks/useMotion';

export const DashboardPage = ({
  onNavigate,
  healthData,
  statusData,
  recentActivities = [],
}) => {
  const containerRef = useRef(null);
  useScrollReveal(containerRef, 'dashboard');

  const isHealthy = healthData?.status === 'healthy';
  const hw = healthData?.hardware;
  const mem = hw?.memory;
  const loadedModels = statusData?.loaded_models || [];
  const maxModels = statusData?.max_concurrent_models ?? 2;
  const configured = statusData?.configured_models;

  const modalityCards = [
    {
      id: 'image',
      title: 'Image Understanding',
      subtitle: 'Captioning, VQA & Scene Analysis',
      icon: ImageIcon,
      color: 'var(--modality-image)',
      glow: 'rgba(244, 114, 182, 0.16)',
      badge: 'BLIP + ViLT',
      quickPrompt: 'Upload an image or ask: "What objects are visible?"',
      modelId: configured?.image_caption || 'Salesforce/blip-image-captioning-base',
    },
    {
      id: 'audio',
      title: 'Audio Understanding',
      subtitle: 'Speech-to-Text, Summary & Q&A',
      icon: Mic,
      color: 'var(--modality-audio)',
      glow: 'rgba(251, 191, 36, 0.16)',
      badge: 'Whisper INT8',
      quickPrompt: 'Upload audio or record mic: "Summarize this recording"',
      modelId: configured?.audio_whisper || 'faster-whisper-base',
    },
    {
      id: 'text',
      title: 'Text Intelligence',
      subtitle: 'Summarization, Rewriting & Facts',
      icon: FileText,
      color: 'var(--modality-text)',
      glow: 'rgba(52, 211, 153, 0.16)',
      badge: 'NLP Core',
      quickPrompt: 'Paste text to summarize, rewrite, or extract facts',
      modelId: configured?.text_summarization || 'HybridNLP + flan-t5-small',
    },
    {
      id: 'document',
      title: 'Document Understanding',
      subtitle: 'PyMuPDF Parsing & Semantic RAG',
      icon: FileSearch,
      color: 'var(--modality-doc)',
      glow: 'rgba(167, 139, 250, 0.16)',
      badge: 'MiniLM RAG',
      quickPrompt: 'Query PDF or TXT files with verifiable page citations',
      modelId: configured?.text_embedding || 'sentence-transformers/all-MiniLM-L6-v2',
    },
  ];

  return (
    <div ref={containerRef} className="page-wrapper">
      {/* Command Center Welcome Banner */}
      <div className="glass-panel command-hero animate-blur-reveal">
        <div style={{ maxWidth: '640px' }}>
          <Badge variant={isHealthy ? 'success' : 'info'} size="sm" dot dotOnline={isHealthy} icon={Sparkles}>
            AI Command Center
          </Badge>
          <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 1.95rem)', fontWeight: 700, letterSpacing: '-0.025em', marginTop: '0.65rem' }}>
            Multimodal AI Studio
          </h2>
          <p style={{ marginTop: '0.4rem', fontSize: '0.94rem', lineHeight: 1.55 }}>
            Launch any specialized modality workspace below, monitor live host hardware &amp; LRU model residency, or open the Omnimodal Chat Hub for multi-turn cross-modal workflows.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button icon={MessageSquare} magnetic onClick={() => onNavigate('chat')}>
            Unified Chat Hub
          </Button>
          <Button variant="secondary" onClick={() => onNavigate('about')}>
            Architecture Specs
          </Button>
        </div>
      </div>

      {/* Live System Resource Metrics */}
      {!healthData ? (
        <SkeletonLoader variant="metrics" />
      ) : (
        <div className="metrics-grid animate-fade-in-up">
          <div className="glass-panel metric-card">
            <div
              className="metric-card__icon"
              style={{
                background: isHealthy ? 'var(--status-success-bg)' : 'var(--status-warning-bg)',
                color: isHealthy ? 'var(--status-success)' : 'var(--status-warning)',
              }}
            >
              <Activity size={21} aria-hidden="true" />
            </div>
            <div>
              <p className="metric-card__label">Backend Health</p>
              <h4 className="metric-card__value">{isHealthy ? 'Healthy & Ready' : 'Offline / Retry'}</h4>
              <p className="metric-card__sub">
                {hw?.torch_version ? `PyTorch ${hw.torch_version}` : 'Checking runtime...'}
              </p>
            </div>
          </div>

          <div className="glass-panel metric-card">
            <div
              className="metric-card__icon"
              style={{ background: 'rgba(99, 102, 241, 0.14)', color: 'var(--brand-indigo)' }}
            >
              <Cpu size={21} aria-hidden="true" />
            </div>
            <div>
              <p className="metric-card__label">Compute Allocation</p>
              <h4 className="metric-card__value">
                {hw ? `${hw.device.toUpperCase()} • ${hw.cpu_threads} Threads` : 'CPU Ready'}
              </h4>
              <p className="metric-card__sub">
                {hw ? `${hw.cpu_cores} Physical Cores (${hw.cpu_percent}% load)` : 'Thread pool capped'}
              </p>
            </div>
          </div>

          <div className="glass-panel metric-card">
            <div
              className="metric-card__icon"
              style={{ background: 'rgba(56, 189, 248, 0.14)', color: 'var(--brand-sky)' }}
            >
              <HardDrive size={21} aria-hidden="true" />
            </div>
            <div>
              <p className="metric-card__label">Host Memory</p>
              <h4 className="metric-card__value">
                {mem ? `${mem.used_gb} / ${mem.total_gb} GB` : 'Inspecting...'}
              </h4>
              <p className="metric-card__sub">
                {mem ? `${mem.free_gb} GB free (${mem.percent}% used)` : 'RAM telemetry'}
              </p>
            </div>
          </div>

          <div className="glass-panel metric-card">
            <div
              className="metric-card__icon"
              style={{ background: 'rgba(167, 139, 250, 0.14)', color: 'var(--modality-doc)' }}
            >
              <Layers size={21} aria-hidden="true" />
            </div>
            <div>
              <p className="metric-card__label">LRU Model Cache</p>
              <h4 className="metric-card__value">
                {loadedModels.length} / {maxModels} Resident
              </h4>
              <p className="metric-card__sub">
                {statusData ? `${statusData.memory_footprint_mb} MB process RSS` : 'Lazy-loaded on demand'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4 Modality Studio Cards */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Specialized AI Workspaces</h3>
          <Badge size="sm" variant="default">4 Modalities Active</Badge>
        </div>

        <div className="modality-cards-grid">
          {modalityCards.map((card, idx) => (
            <div
              key={card.id}
              className="reveal-scale"
              style={{ '--reveal-delay': `${idx * 70}ms` }}
            >
              <Card
                title={card.title}
                subtitle={card.subtitle}
                icon={card.icon}
                iconColor={card.color}
                glowColor={card.glow}
                interactive
                badge={<Badge variant={card.id === 'document' ? 'doc' : card.id} size="sm">{card.badge}</Badge>}
                footer={
                  <>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '58%',
                      }}
                      title={card.modelId}
                    >
                      {card.modelId}
                    </span>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={ArrowRight}
                      iconPosition="right"
                      onClick={() => onNavigate(card.id)}
                    >
                      Open
                    </Button>
                  </>
                }
                style={{ height: '100%' }}
              >
                <div className="result-block" style={{ padding: '0.85rem 1rem' }}>
                  <p style={{ fontSize: '0.82rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                    &ldquo;{card.quickPrompt}&rdquo;
                  </p>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Row: Activity Timeline & Model Residency Inspector */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
          gap: '1.5rem',
        }}
      >
        <Card
          title="Recent Session Activity"
          subtitle="Live actions triggered in this workspace"
          icon={Clock}
          className="reveal-item"
        >
          {recentActivities.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                No modality inferences logged in this browser session yet.
              </p>
              <Button size="sm" variant="secondary" onClick={() => onNavigate('chat')}>
                Start in Unified Chat
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {recentActivities.slice(0, 5).map((act, idx) => (
                <div
                  key={`${act.title}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                    <CheckCircle2 size={15} color="var(--status-success)" style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: '0.84rem',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {act.title}
                    </span>
                  </div>
                  <Badge size="sm" variant={act.modality === 'document' ? 'doc' : act.modality || 'default'}>
                    {act.modality || 'system'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Model Residency & Configuration"
          subtitle="Real-time state from /api/v1/status"
          icon={Layers}
          className="reveal-item"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.84rem' }}>
            <div>
              <span className="result-block__label" style={{ display: 'block', marginBottom: '0.4rem' }}>
                Currently Loaded in Memory ({loadedModels.length}/{maxModels})
              </span>
              {loadedModels.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Idle — models load lazily on your first Vision, Audio, or RAG request.
                </p>
              ) : (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {loadedModels.map((m) => (
                    <Badge key={m} variant="success" size="sm">
                      {m}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {configured && (
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Captioning</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                    {configured.image_caption}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Visual Q&amp;A</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                    {configured.image_vqa}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Speech ASR</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                    {configured.audio_whisper}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Embeddings</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                    {configured.text_embedding}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
