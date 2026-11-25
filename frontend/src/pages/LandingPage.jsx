import React, { useRef, useState } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Mic,
  FileText,
  FileSearch,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  ChevronRight,
  MessageSquare,
  Workflow,
  Server,
  Lock,
  Gauge,
  BookOpen,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import {
  useFinePointerMotion,
  useScrollParallaxVar,
  useScrollReveal,
} from '../hooks/useMotion';

export const LandingPage = ({ onNavigate, healthData }) => {
  const pageRef = useRef(null);
  const canPointerParallax = useFinePointerMotion();
  const [stageTilt, setStageTilt] = useState({ rx: 0, ry: 0 });

  useScrollParallaxVar(pageRef);
  useScrollReveal(pageRef, 'landing');

  const handleHeroMouseMove = (e) => {
    if (!canPointerParallax || !pageRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setStageTilt({ rx: -ny * 7, ry: nx * 8 });
  };

  const handleHeroMouseLeave = () => {
    if (stageTilt.rx !== 0 || stageTilt.ry !== 0) {
      setStageTilt({ rx: 0, ry: 0 });
    }
  };

  const modalityCards = [
    {
      id: 'image',
      title: 'Image Intelligence',
      desc: 'Generate scene descriptions with Salesforce BLIP, answer visual questions via ViLT-B32, and inspect dominant color palettes & lighting.',
      icon: ImageIcon,
      color: 'var(--modality-image)',
      glow: 'rgba(244, 114, 182, 0.16)',
      badge: 'Vision',
      models: 'BLIP Base • ViLT-B32 VQA',
    },
    {
      id: 'audio',
      title: 'Audio Intelligence',
      desc: 'Transcribe speech from recordings or live microphone WAV capture with faster-whisper INT8, timestamp alignment, summaries, and transcript Q&A.',
      icon: Mic,
      color: 'var(--modality-audio)',
      glow: 'rgba(251, 191, 36, 0.16)',
      badge: 'Speech',
      models: 'faster-whisper INT8 (CPU)',
    },
    {
      id: 'text',
      title: 'Text Intelligence',
      desc: 'Produce extractive summaries, rewrite passages in concise, formal, or bullet registers, extract keywords & facts, and query raw text.',
      icon: FileText,
      color: 'var(--modality-text)',
      glow: 'rgba(52, 211, 153, 0.16)',
      badge: 'NLP',
      models: 'HybridNLP Engine',
    },
    {
      id: 'document',
      title: 'Document Intelligence',
      desc: 'Parse multi-page PDF and TXT documents with PyMuPDF, detect scanned PDFs, and run dense vector search with exact page citations.',
      icon: FileSearch,
      color: 'var(--modality-doc)',
      glow: 'rgba(167, 139, 250, 0.16)',
      badge: 'RAG',
      models: 'PyMuPDF • all-MiniLM-L6-v2',
    },
  ];

  const workflowSteps = [
    {
      step: '01 / INGEST',
      title: 'Binary & Format Validation',
      desc: 'Every uploaded image, audio file, or document passes magic-byte signature verification, extension checks, and bounded temp-file handling.',
      icon: Lock,
    },
    {
      step: '02 / ORCHESTRATE',
      title: 'Lazy LRU Model Dispatch',
      desc: 'The FastAPI gateway routes requests asynchronously with asyncio.Semaphore(2) throttling and an LRU ModelManager capping memory to 2 models.',
      icon: Workflow,
    },
    {
      step: '03 / GROUND',
      title: 'Cited Output & Session Context',
      desc: 'Returns structured predictions with confidence scores, timestamp segments, or page citations, while retaining isolated multi-turn session history.',
      icon: BookOpen,
    },
  ];

  const benefits = [
    {
      title: 'CPU-First Execution',
      desc: 'Explicit 4-thread PyTorch containment and INT8 speech quantization run smoothly on 8 GB RAM hardware without requiring CUDA GPUs.',
      icon: Cpu,
      color: 'var(--brand-indigo)',
    },
    {
      title: 'Memory-Safe Model Cache',
      desc: 'Lazy loading prevents cold-start bloat, and automatic LRU eviction frees RAM with garbage collection when switching modalities.',
      icon: Layers,
      color: 'var(--brand-cyan)',
    },
    {
      title: 'Grounded, Verifiable Answers',
      desc: 'RAG retrieval rejects low-similarity queries instead of fabricating answers, returning exact PDF page citations and audio timestamps.',
      icon: ShieldCheck,
      color: 'var(--status-success)',
    },
    {
      title: 'Non-Blocking FastAPI Core',
      desc: 'CPU inference executes inside worker threads via asyncio.to_thread so health telemetry and concurrent UI calls remain responsive.',
      icon: Gauge,
      color: 'var(--modality-audio)',
    },
  ];

  const techStack = [
    { group: 'Frontend Layer', items: ['React 19', 'Vite 8', 'Axios', 'Lucide React', 'CSS3 3D & Parallax'] },
    { group: 'API & Gateway', items: ['FastAPI', 'Pydantic v2', 'Uvicorn ASGI', 'Async Semaphore', 'SessionManager'] },
    { group: 'AI & Document Core', items: ['PyTorch CPU', 'BLIP & ViLT', 'faster-whisper INT8', 'all-MiniLM-L6-v2', 'PyMuPDF'] },
  ];

  const isBackendOnline = healthData?.status === 'healthy';

  return (
    <div ref={pageRef} className="landing-container">
      {/* Multi-Layer Scroll Parallax Orbs inside Landing Scope */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'hidden',
        }}
      >
        <div
          className="ambient-orb ambient-orb--violet ai-orb-bg"
          style={{
            transform: 'translate3d(0, calc(var(--scroll-y, 0) * -0.09px), 0)',
          }}
        />
        <div
          className="ambient-orb ambient-orb--cyan ai-orb-bg"
          style={{
            transform: 'translate3d(0, calc(var(--scroll-y, 0) * 0.06px), 0)',
          }}
        />
      </div>

      {/* HERO SECTION */}
      <section
        className="hero-section"
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
      >
        <div className="hero-content animate-blur-reveal">
          <Badge variant={isBackendOnline ? 'success' : 'info'} size="md" dot dotOnline={isBackendOnline} icon={Sparkles}>
            {isBackendOnline ? 'FastAPI Neural Core Connected' : 'Unified Multimodal Neural System'}
          </Badge>

          <h1 className="hero-headline">
            Unified Intelligence for{' '}
            <span className="hero-headline__gradient">Image, Audio, Text &amp; Documents</span>
          </h1>

          <p className="hero-description">
            Orchestrate specialized pretrained vision, speech, NLP, and semantic RAG models through a single responsive interface — engineered for CPU stability, lazy LRU model caching, and grounded multi-turn conversations.
          </p>

          <div className="hero-actions">
            <Button
              size="lg"
              magnetic
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => onNavigate('dashboard')}
            >
              Launch AI Dashboard
            </Button>
            <Button
              size="lg"
              variant="secondary"
              magnetic
              icon={MessageSquare}
              onClick={() => onNavigate('chat')}
            >
              Open Unified Chat
            </Button>
          </div>

          <div className="hero-specs-row">
            <div className="hero-spec-item">
              <span className="hero-spec-item__value">4 Modalities</span>
              <span className="hero-spec-item__label">Image, Audio, Text, PDF/TXT</span>
            </div>
            <div className="hero-spec-item">
              <span className="hero-spec-item__value">LRU Cache (Max 2)</span>
              <span className="hero-spec-item__label">Memory-safe model eviction</span>
            </div>
            <div className="hero-spec-item">
              <span className="hero-spec-item__value">Page &amp; Time Cited</span>
              <span className="hero-spec-item__label">Grounded outputs, zero guesswork</span>
            </div>
          </div>
        </div>

        {/* 3D Multimodal Core Visualization */}
        <div
          className="hero-visual animate-scale-in"
          style={{
            transform: 'translate3d(0, calc(var(--scroll-y, 0) * -0.05px), 0)',
          }}
        >
          <div
            className="neural-core-stage"
            style={{
              transform: `rotateX(${stageTilt.rx}deg) rotateY(${stageTilt.ry}deg)`,
            }}
          >
            {/* Synaptic Connector Lines */}
            <svg className="synapse-svg" viewBox="0 0 380 380" aria-hidden="true">
              <defs>
                <linearGradient id="synapseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="50%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>
              <line x1="95" y1="55" x2="190" y2="190" className="synapse-line" />
              <line x1="285" y1="55" x2="190" y2="190" className="synapse-line" />
              <line x1="95" y1="325" x2="190" y2="190" className="synapse-line" />
              <line x1="285" y1="325" x2="190" y2="190" className="synapse-line" />
            </svg>

            <div className="ai-core-ring ai-core-ring--one" aria-hidden="true" />
            <div className="ai-core-ring ai-core-ring--two" aria-hidden="true" />

            {/* Central Intelligence Core */}
            <div className="ai-core-hub">
              <Sparkles size={26} color="#a5b4fc" aria-hidden="true" />
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
                OMNI CORE
              </span>
              <span style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                FastAPI Router
              </span>
            </div>

            {/* 4 Connected Floating Modality Nodes */}
            <button
              type="button"
              onClick={() => onNavigate('image')}
              className="modality-node modality-node--tl"
              style={{
                '--node-color': 'var(--modality-image)',
                '--node-bg': 'var(--modality-image-bg)',
                '--node-glow': 'rgba(244, 114, 182, 0.28)',
              }}
            >
              <span className="modality-node__icon">
                <ImageIcon size={16} aria-hidden="true" />
              </span>
              <span style={{ textAlign: 'left' }}>
                <span className="modality-node__title" style={{ display: 'block' }}>Image AI</span>
                <span className="modality-node__model">BLIP + ViLT</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('audio')}
              className="modality-node modality-node--tr"
              style={{
                '--node-color': 'var(--modality-audio)',
                '--node-bg': 'var(--modality-audio-bg)',
                '--node-glow': 'rgba(251, 191, 36, 0.28)',
              }}
            >
              <span className="modality-node__icon">
                <Mic size={16} aria-hidden="true" />
              </span>
              <span style={{ textAlign: 'left' }}>
                <span className="modality-node__title" style={{ display: 'block' }}>Audio AI</span>
                <span className="modality-node__model">Whisper INT8</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('text')}
              className="modality-node modality-node--bl"
              style={{
                '--node-color': 'var(--modality-text)',
                '--node-bg': 'var(--modality-text-bg)',
                '--node-glow': 'rgba(52, 211, 153, 0.28)',
              }}
            >
              <span className="modality-node__icon">
                <FileText size={16} aria-hidden="true" />
              </span>
              <span style={{ textAlign: 'left' }}>
                <span className="modality-node__title" style={{ display: 'block' }}>Text AI</span>
                <span className="modality-node__model">Hybrid NLP</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('document')}
              className="modality-node modality-node--br"
              style={{
                '--node-color': 'var(--modality-doc)',
                '--node-bg': 'var(--modality-doc-bg)',
                '--node-glow': 'rgba(167, 139, 250, 0.28)',
              }}
            >
              <span className="modality-node__icon">
                <FileSearch size={16} aria-hidden="true" />
              </span>
              <span style={{ textAlign: 'left' }}>
                <span className="modality-node__title" style={{ display: 'block' }}>Document AI</span>
                <span className="modality-node__model">MiniLM RAG</span>
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* SPECIALIZED MODALITY CARDS */}
      <section className="landing-section">
        <div className="section-heading reveal-item">
          <Badge variant="info" size="sm">Core Capabilities</Badge>
          <h2 className="section-heading__title">Specialized Pretrained Modality Studios</h2>
          <p className="section-heading__desc">
            Select a dedicated workspace or route any file automatically through the unified chat gateway.
          </p>
        </div>

        <div className="modality-cards-grid">
          {modalityCards.map((mod, idx) => (
            <div
              key={mod.id}
              className="reveal-scale"
              style={{ '--reveal-delay': `${idx * 80}ms` }}
            >
              <Card
                title={mod.title}
                icon={mod.icon}
                iconColor={mod.color}
                glowColor={mod.glow}
                interactive
                onClick={() => onNavigate(mod.id)}
                badge={<Badge variant={mod.id === 'document' ? 'doc' : mod.id} size="sm">{mod.badge}</Badge>}
                footer={
                  <>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {mod.models}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', color: 'var(--text-accent)', fontWeight: 500 }}>
                      Open Studio <ChevronRight size={15} />
                    </span>
                  </>
                }
                style={{ height: '100%' }}
              >
                <p style={{ fontSize: '0.9rem', lineHeight: 1.55 }}>{mod.desc}</p>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="landing-section">
        <div className="section-heading reveal-item">
          <Badge variant="default" size="sm" icon={Workflow}>Pipeline Flow</Badge>
          <h2 className="section-heading__title">How Requests Move Through the System</h2>
          <p className="section-heading__desc">
            Every request runs through strict validation, concurrency control, and isolated session tracking.
          </p>
        </div>

        <div className="steps-grid">
          {workflowSteps.map((item, idx) => (
            <div
              key={item.step}
              className="reveal-item"
              style={{ '--reveal-delay': `${idx * 90}ms` }}
            >
              <Card interactive tilt={false} icon={item.icon} style={{ height: '100%' }}>
                <span className="step-number">{item.step}</span>
                <h3 style={{ fontSize: '1.08rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.88rem', lineHeight: 1.55 }}>{item.desc}</p>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* ARCHITECTURE & BENEFITS */}
      <section className="landing-section">
        <div className="architecture-band reveal-item">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <Badge variant="info" size="sm" icon={Server}>Production Engineering</Badge>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 700, marginTop: '0.6rem' }}>
                Built for Resource Safety &amp; Grounded Accuracy
              </h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate('about')}>
              Inspect Architecture Docs
            </Button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.75rem',
            }}
          >
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} style={{ display: 'flex', gap: '0.95rem', alignItems: 'flex-start' }}>
                  <div
                    className="ui-card__icon-box"
                    style={{
                      color: b.color,
                      background: `color-mix(in srgb, ${b.color} 14%, transparent)`,
                      borderColor: `color-mix(in srgb, ${b.color} 30%, transparent)`,
                    }}
                  >
                    <Icon size={19} aria-hidden="true" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{b.title}</h4>
                    <p style={{ fontSize: '0.86rem', marginTop: '4px', lineHeight: 1.55 }}>{b.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Technology Stack Row */}
          <div
            style={{
              marginTop: '2.25rem',
              paddingTop: '2rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {techStack.map((col) => (
              <div key={col.group}>
                <p style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.6rem', fontWeight: 600 }}>
                  {col.group}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {col.items.map((tech) => (
                    <Badge key={tech} size="sm" variant="default">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="landing-section">
        <div className="cta-banner reveal-scale">
          <Badge variant="info" size="sm" icon={Sparkles}>Ready to Explore</Badge>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)', fontWeight: 700, marginTop: '0.85rem' }}>
            Start Analyzing Images, Audio, Text &amp; Documents
          </h2>
          <p style={{ maxWidth: '580px', margin: '0.75rem auto 2rem', fontSize: '0.98rem' }}>
            Jump straight into the AI Command Center dashboard or test multi-turn multimodal workflows in the unified chat hub.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Button
              size="lg"
              magnetic
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => onNavigate('dashboard')}
            >
              Launch Command Center
            </Button>
            <Button size="lg" variant="secondary" icon={MessageSquare} onClick={() => onNavigate('chat')}>
              Try Unified Chat Hub
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
