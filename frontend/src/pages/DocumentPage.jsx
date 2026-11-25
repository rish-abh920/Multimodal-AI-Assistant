import React, { useState } from 'react';
import {
  FileSearch,
  FileText,
  Sparkles,
  HelpCircle,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import CopyButton from '../components/common/CopyButton';
import FileUploader from '../components/common/FileUploader';
import Loader from '../components/common/Loader';
import { uploadDocument, summarizeDocument, askDocumentQuestion } from '../api/documentApi';

export const DocumentPage = ({ onAddActivity }) => {
  const [file, setFile] = useState(null);
  const [docMeta, setDocMeta] = useState(null);
  const [question, setQuestion] = useState('');
  const [topK, setTopK] = useState(3);
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null); // 'parse' | 'summarize' | 'ask'
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedPassages, setExpandedPassages] = useState(true);
  const [expandedPages, setExpandedPages] = useState(false);

  const handleFileSelect = async (selectedFile) => {
    setFile(selectedFile);
    setResult(null);
    setError(null);
    setDocMeta(null);

    setLoading(true);
    setActiveAction('parse');
    try {
      const data = await uploadDocument(selectedFile);
      setDocMeta(data);
      onAddActivity?.({
        title: `Parsed document: ${data.filename} (${data.total_pages}p)`,
        modality: 'document',
      });
    } catch (err) {
      setError(err.message || 'Failed to inspect document structure.');
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const handleSummarize = async () => {
    if (!file) {
      setError('Please upload a PDF or TXT file first.');
      return;
    }
    setError(null);
    setLoading(true);
    setActiveAction('summarize');

    try {
      const data = await summarizeDocument(file);
      setResult({
        type: 'summarize',
        filename: data.filename,
        totalPages: data.total_pages,
        summary: data.summary,
        keyPoints: data.key_points || [],
        model: data.model_name,
        time: data.processing_time || (data.latency_ms ? data.latency_ms / 1000 : 0),
      });
      onAddActivity?.({
        title: `Summarized document: ${file.name}`,
        modality: 'document',
      });
    } catch (err) {
      setError(err.message || 'Failed to summarize document.');
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const handleAsk = async (e) => {
    e?.preventDefault();
    if (!file) {
      setError('Please upload a PDF or TXT file first.');
      return;
    }
    if (!question.trim() || question.trim().length < 2) {
      setError('Please enter a question (at least 2 characters).');
      return;
    }

    setError(null);
    setLoading(true);
    setActiveAction('ask');

    try {
      const data = await askDocumentQuestion(file, question.trim(), topK);
      setResult({
        type: 'ask',
        question: data.question || question.trim(),
        answer: data.answer,
        confidence: data.confidence,
        supportingPages: data.supporting_pages || [],
        supportingPassages: data.supporting_passages || [],
        model: data.model_name,
        time: data.processing_time || (data.latency_ms ? data.latency_ms / 1000 : 0),
      });
      setExpandedPassages(true);
      onAddActivity?.({
        title: `RAG Q&A on ${file.name}`,
        modality: 'document',
      });
    } catch (err) {
      setError(err.message || 'Dense retrieval Q&A failed.');
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  return (
    <div className="page-wrapper animate-blur-reveal">
      <div className="page-header">
        <div>
          <Badge variant="doc" icon={FileSearch}>
            Semantic Retrieval-Augmented Generation (RAG)
          </Badge>
          <h2 className="page-header__title">Document Understanding</h2>
          <p className="page-header__desc">
            Parse PDF and TXT documents with PyMuPDF, inspect page-by-page extracts, generate executive summaries, and run SentenceTransformers RAG Q&amp;A with verifiable page citations.
          </p>
        </div>
      </div>

      <div className="workspace-grid">
        {/* Left Column: Document Upload & Controls */}
        <div className="workspace-stack">
          <Card
            title="Document Input"
            subtitle="Supported: PDF, TXT (Max 15 MB)"
            icon={FileText}
            iconColor="var(--modality-doc)"
          >
            <FileUploader
              file={file}
              onFileSelect={handleFileSelect}
              onFileRemove={() => {
                setFile(null);
                setDocMeta(null);
                setResult(null);
                setError(null);
              }}
              accept=".pdf,.txt,application/pdf,text/plain"
              maxSizeMB={15}
              label="Drop PDF or TXT document here"
              modality="doc"
            />

            {docMeta && (
              <div className="result-block animate-fade-in" style={{ marginTop: '1.15rem', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Parsed Structure ({docMeta.file_type})
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <Badge size="sm" variant="doc">
                      {docMeta.total_pages} {docMeta.total_pages === 1 ? 'Page' : 'Pages'}
                    </Badge>
                    <Badge size="sm" variant="default">
                      {docMeta.total_characters?.toLocaleString()} Chars
                    </Badge>
                  </div>
                </div>

                {docMeta.metadata?.author && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Author: {docMeta.metadata.author}
                  </p>
                )}

                {docMeta.is_scanned_pdf && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--status-warning-bg)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8rem',
                      color: '#fbbf24',
                    }}
                  >
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span>{docMeta.ocr_status}</span>
                  </div>
                )}

                {docMeta.page_contents?.length > 0 && (
                  <div style={{ marginTop: '0.85rem' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedPages(!expandedPages)}
                      className="accordion-trigger"
                      aria-expanded={expandedPages}
                    >
                      <span>Page Previews ({docMeta.page_contents.length})</span>
                      {expandedPages ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {expandedPages && (
                      <div className="segment-list animate-fade-in" style={{ marginTop: '0.5rem', maxHeight: '220px' }}>
                        {docMeta.page_contents.map((page) => (
                          <div key={page.page_number} className="result-block" style={{ padding: '0.7rem 0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <Badge size="sm" variant="doc">Page {page.page_number}</Badge>
                              <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                                {page.character_count} chars
                              </span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                              {page.text_snippet}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '1.25rem' }}>
              <Button
                variant="primary"
                icon={Sparkles}
                onClick={handleSummarize}
                disabled={!file || loading}
                loading={loading && activeAction === 'summarize'}
                fullWidth
              >
                Summarize Document
              </Button>
            </div>
          </Card>

          <Card
            title="Semantic RAG Question Answering"
            subtitle="Dense embedding retrieval via SentenceTransformers"
            icon={HelpCircle}
            iconColor="var(--brand-indigo)"
          >
            <form onSubmit={handleAsk} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                placeholder="e.g., What are the main findings or conclusions?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={!file || loading}
                aria-label="Document question"
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label htmlFor="rag-topk-select" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Passages:
                  </label>
                  <select
                    id="rag-topk-select"
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                    disabled={loading}
                    style={{ width: 'auto', padding: '0.4rem 0.7rem', fontSize: '0.85rem' }}
                  >
                    <option value={2}>Top 2</option>
                    <option value={3}>Top 3</option>
                    <option value={5}>Top 5</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  icon={BookOpen}
                  disabled={!file || !question.trim() || loading}
                  loading={loading && activeAction === 'ask'}
                >
                  Query Document
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Document Intelligence Results */}
        <Card
          title="Document Intelligence Output"
          subtitle="Cited answers, supporting passages &amp; document summaries"
          icon={Sparkles}
          iconColor="var(--modality-doc)"
        >
          {loading && (
            <Loader
              message={
                activeAction === 'parse'
                  ? 'Extracting document layout with PyMuPDF...'
                  : activeAction === 'summarize'
                  ? 'Synthesizing executive summary &amp; key points...'
                  : 'Encoding dense chunks &amp; searching vector similarity...'
              }
              subtext="SentenceTransformers all-MiniLM-L6-v2 RAG pipeline"
            />
          )}

          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 className="error-banner__title">Error Processing Document</h4>
                <p className="error-banner__desc">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && !result && (
            <div className="empty-state">
              <FileSearch size={46} className="empty-state__icon" aria-hidden="true" />
              <p style={{ fontSize: '0.94rem' }}>
                Upload a PDF or TXT file on the left to summarize or ask grounded questions with page citations.
              </p>
            </div>
          )}

          {!loading && result && (
            <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {result.model && (
                  <Badge variant="doc" size="sm">
                    {result.model}
                  </Badge>
                )}
                {result.time !== undefined && (
                  <Badge size="sm" icon={Clock}>
                    {Number(result.time).toFixed(2)}s Latency
                  </Badge>
                )}
                {result.confidence !== undefined && (
                  <Badge variant="success" size="sm" icon={CheckCircle2}>
                    Confidence: {(result.confidence * 100).toFixed(1)}%
                  </Badge>
                )}
              </div>

              {result.type === 'ask' && (
                <div className="result-block result-block--doc">
                  <div className="result-block__header">
                    <span className="result-block__label" style={{ color: 'var(--modality-doc)' }}>
                      Question: &ldquo;{result.question}&rdquo;
                    </span>
                    <CopyButton text={result.answer} />
                  </div>
                  <h3 style={{ fontSize: '1.12rem', color: '#ffffff', fontWeight: 600, lineHeight: 1.55 }}>
                    {result.answer}
                  </h3>

                  {result.supportingPages?.length > 0 && (
                    <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Supporting Pages:</span>
                      {result.supportingPages.map((page) => (
                        <Badge key={page} variant="doc" size="sm" icon={BookOpen}>
                          Page {page}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {result.supportingPassages?.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedPassages(!expandedPassages)}
                    className="accordion-trigger"
                    aria-expanded={expandedPassages}
                  >
                    <span>Supporting Retrieved Passages ({result.supportingPassages.length})</span>
                    {expandedPassages ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {expandedPassages && (
                    <div className="segment-list animate-fade-in" style={{ marginTop: '0.55rem' }}>
                      {result.supportingPassages.map((p, idx) => (
                        <div key={idx} className="result-block" style={{ padding: '0.9rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', gap: '0.5rem' }}>
                            <Badge size="sm" variant="doc">
                              Page {p.page_number} &bull; Chunk #{p.chunk_index}
                            </Badge>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-accent)', fontFamily: 'var(--font-mono)' }}>
                              Similarity: {p.similarity_score}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.87rem', lineHeight: 1.55 }}>
                            &ldquo;{p.content || p.text}&rdquo;
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {result.type === 'summarize' && result.summary && (
                <div className="result-block result-block--doc">
                  <div className="result-block__header">
                    <span className="result-block__label" style={{ color: 'var(--modality-doc)' }}>
                      Executive Document Summary ({result.totalPages} {result.totalPages === 1 ? 'Page' : 'Pages'})
                    </span>
                    <CopyButton text={result.summary} />
                  </div>
                  <p style={{ fontSize: '0.98rem', color: 'var(--text-primary)', lineHeight: 1.65 }}>
                    {result.summary}
                  </p>

                  {result.keyPoints?.length > 0 && (
                    <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <span className="result-block__label" style={{ display: 'block', marginBottom: '0.45rem' }}>
                        Key Document Points
                      </span>
                      <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {result.keyPoints.map((kp, idx) => (
                          <li key={idx} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                            {kp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DocumentPage;
