import React, { useRef } from 'react';
import {
  Info,
  Cpu,
  Layers,
  Zap,
  BookOpen,
  Sparkles,
  GitBranch,
  ArrowRight,
  Server,
} from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import { useScrollReveal } from '../hooks/useMotion';

export const AboutPage = ({ statusData, healthData }) => {
  const containerRef = useRef(null);
  useScrollReveal(containerRef, 'about');

  const configured = statusData?.configured_models;
  const hw = healthData?.hardware;

  return (
    <div ref={containerRef} className="page-wrapper animate-blur-reveal" style={{ paddingBottom: '3rem' }}>
      <div className="page-header">
        <div>
          <Badge variant="info" icon={Info}>
            Technical Documentation &amp; Architecture
          </Badge>
          <h2 className="page-header__title">About Multimodal AI Assistant</h2>
          <p className="page-header__desc">
            A full-stack multimodal orchestration system built with FastAPI, PyTorch, Hugging Face Transformers, faster-whisper, SentenceTransformers, PyMuPDF, and React 19.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        <Card
          title="Architectural Philosophy &amp; Transparency"
          subtitle="Unified routing across specialized pretrained models"
          icon={Sparkles}
          className="reveal-item"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.94rem', lineHeight: 1.65 }}>
            <p>
              The <strong>Multimodal AI Assistant</strong> accepts images, audio recordings, raw text, and PDF/TXT documents through isolated modality workspaces or a unified gateway endpoint (<code>/api/v1/chat</code>).
            </p>
            <div className="result-block result-block--highlight">
              <strong style={{ color: '#fff' }}>Engineering Transparency:</strong>{' '}
              <span style={{ color: 'var(--text-secondary)' }}>
                Rather than claiming to be a single jointly trained foundation model, this platform is a modular <em>Multimodal AI Orchestrator</em>. It coordinates specialized pretrained models under a singleton <code>ModelManager</code>, an async <code>MultimodalRouter</code>, and an isolated <code>SessionManager</code>.
              </span>
            </div>

            {/* Architecture Flow Diagram */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.65rem',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.025)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.82rem',
              }}
            >
              <Badge variant="info" size="md">React 19 + Axios</Badge>
              <ArrowRight size={15} color="var(--text-muted)" aria-hidden="true" />
              <Badge variant="default" size="md" icon={Server}>FastAPI Gateway</Badge>
              <ArrowRight size={15} color="var(--text-muted)" aria-hidden="true" />
              <Badge variant="default" size="md">MultimodalRouter (Semaphore=2)</Badge>
              <ArrowRight size={15} color="var(--text-muted)" aria-hidden="true" />
              <Badge variant="success" size="md">4 Specialized Services + LRU Cache</Badge>
            </div>
          </div>
        </Card>

        {/* Modality Modules Grid */}
        <div className="modality-cards-grid">
          <div className="reveal-scale" style={{ '--reveal-delay': '0ms' }}>
            <Card
              title="Image Intelligence"
              subtitle={configured?.image_caption || 'Salesforce/blip-image-captioning-base'}
              icon={Layers}
              iconColor="var(--modality-image)"
              badge={<Badge variant="image" size="sm">Vision</Badge>}
              interactive
              tilt={false}
              style={{ height: '100%' }}
            >
              <p style={{ fontSize: '0.88rem', lineHeight: 1.55 }}>
                Uses Salesforce BLIP for descriptive captioning, ViLT-B32 for grounded Visual Question Answering, and Pillow statistical histograms for color &amp; lighting classification.
              </p>
            </Card>
          </div>

          <div className="reveal-scale" style={{ '--reveal-delay': '70ms' }}>
            <Card
              title="Audio Intelligence"
              subtitle={configured?.audio_whisper || 'faster-whisper-base'}
              icon={Zap}
              iconColor="var(--modality-audio)"
              badge={<Badge variant="audio" size="sm">Speech</Badge>}
              interactive
              tilt={false}
              style={{ height: '100%' }}
            >
              <p style={{ fontSize: '0.88rem', lineHeight: 1.55 }}>
                Runs faster-whisper INT8 quantization on CPU for multilingual transcription, timestamped segments, executive summaries, and transcript-grounded Q&amp;A.
              </p>
            </Card>
          </div>

          <div className="reveal-scale" style={{ '--reveal-delay': '140ms' }}>
            <Card
              title="Text Intelligence"
              subtitle="HybridNLP Summarizer &amp; Reasoner"
              icon={BookOpen}
              iconColor="var(--modality-text)"
              badge={<Badge variant="text" size="sm">NLP</Badge>}
              interactive
              tilt={false}
              style={{ height: '100%' }}
            >
              <p style={{ fontSize: '0.88rem', lineHeight: 1.55 }}>
                Provides extractive length-bounded summarization, keyword &amp; factual statement extraction, style rewriting (concise, formal, bullet), and grounded lexical Q&amp;A.
              </p>
            </Card>
          </div>

          <div className="reveal-scale" style={{ '--reveal-delay': '210ms' }}>
            <Card
              title="Document RAG"
              subtitle={configured?.text_embedding || 'all-MiniLM-L6-v2'}
              icon={GitBranch}
              iconColor="var(--modality-doc)"
              badge={<Badge variant="doc" size="sm">RAG</Badge>}
              interactive
              tilt={false}
              style={{ height: '100%' }}
            >
              <p style={{ fontSize: '0.88rem', lineHeight: 1.55 }}>
                Uses PyMuPDF for layout-aware PDF/TXT extraction and scanned-PDF detection, paired with SentenceTransformers cosine-similarity search for page-cited answers.
              </p>
            </Card>
          </div>
        </div>

        {/* Resource & Memory Safety */}
        <Card
          title="CPU &amp; Memory Safety Guarantees"
          subtitle={hw ? `Active host: ${hw.device.toUpperCase()} (${hw.cpu_cores} cores, ${hw.memory?.total_gb} GB RAM)` : 'Hardware-aware execution limits'}
          icon={Cpu}
          className="reveal-item"
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem',
            }}
          >
            <div>
              <h4 style={{ fontSize: '0.96rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                1. Centralized LRU Eviction
              </h4>
              <p style={{ fontSize: '0.86rem', lineHeight: 1.55 }}>
                Models load lazily only when requested. <code>ModelManager</code> caps resident models at 2 (<code>MAX_LOADED_MODELS=2</code>) and evicts least-recently used weights with garbage collection.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '0.96rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                2. Thread-Pool Containment
              </h4>
              <p style={{ fontSize: '0.86rem', lineHeight: 1.55 }}>
                PyTorch CPU compute is bounded to 4 threads (<code>CPU_NUM_THREADS=4</code>) so heavy inferences never starve the FastAPI event loop or host OS.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '0.96rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                3. Concurrency &amp; File Security
              </h4>
              <p style={{ fontSize: '0.86rem', lineHeight: 1.55 }}>
                Requests pass binary magic-byte validation and UUID temporary storage cleanup, while <code>asyncio.Semaphore(2)</code> caps concurrent inferences in worker threads.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AboutPage;
