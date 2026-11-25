import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  RefreshCw,
  Tag,
  Clock,
  AlertCircle,
  Sliders,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import CopyButton from '../components/common/CopyButton';
import Loader from '../components/common/Loader';
import { summarizeText, analyzeText } from '../api/textApi';

export const TextPage = ({ onAddActivity }) => {
  const [text, setText] = useState('');
  const [question, setQuestion] = useState('');
  const [rewriteStyle, setRewriteStyle] = useState('concise');
  const [maxLength, setMaxLength] = useState(180);
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null); // 'summarize' | 'analyze'
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const presets = [
    {
      label: 'Deep Learning',
      content:
        'Artificial intelligence has evolved rapidly over recent years with transformer-based deep neural networks. Transformers utilize multi-head self-attention mechanisms to model relationships across distant tokens in parallel. This design replaced sequential recurrent architectures and enabled scalable pretraining on massive corpora. Modern multimodal systems now combine visual, acoustic, and text representations into coordinated semantic spaces.',
    },
    {
      label: 'Space Exploration',
      content:
        'NASA’s Apollo program marked humanity’s first landings on the lunar surface between 1969 and 1972. The Apollo 11 mission carried Commander Neil Armstrong, lunar module pilot Buzz Aldrin, and command module pilot Michael Collins to the Moon. Over the course of the six successful landings, astronauts collected hundreds of kilograms of lunar rocks, deployed scientific stations, and paved the way for modern interplanetary robotics.',
    },
    {
      label: 'Quantum Computing',
      content:
        'Quantum computers leverage the principles of quantum mechanics, including superposition and entanglement, to perform specialized computational tasks. Unlike classical bits which exist strictly as zeros or ones, quantum bits or qubits can represent linear combinations of both states simultaneously. This superposition allows quantum algorithms, such as Shor’s and Grover’s algorithms, to achieve theoretical exponential or polynomial speedups for specific mathematical problems.',
    },
  ];

  const handleSummarize = async () => {
    if (text.trim().length < 10) {
      setError('Please enter at least 10 characters of text to summarize.');
      return;
    }
    setError(null);
    setLoading(true);
    setActiveAction('summarize');

    try {
      const data = await summarizeText({
        text: text.trim(),
        max_length: maxLength,
        min_length: 25,
      });
      setResult({
        type: 'summarize',
        summary: data.summary,
        originalCharacters: data.original_characters,
        summaryCharacters: data.summary_characters,
        compressionRatio: data.compression_ratio,
        model: data.model_name || data.model_used,
        time: data.processing_time || (data.latency_ms ? data.latency_ms / 1000 : 0),
      });
      onAddActivity?.({
        title: `Summarized ${data.original_characters} chars of text`,
        modality: 'text',
      });
    } catch (err) {
      setError(err.message || 'Text summarization failed.');
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const handleAnalyze = async (e) => {
    e?.preventDefault();
    if (text.trim().length < 5) {
      setError('Please enter at least 5 characters of text to analyze.');
      return;
    }
    setError(null);
    setLoading(true);
    setActiveAction('analyze');

    try {
      const data = await analyzeText({
        text: text.trim(),
        question: question.trim() || null,
        rewrite_style: rewriteStyle,
      });
      setResult({
        type: 'analyze',
        explanation: data.explanation,
        rewrittenText: data.rewritten_text,
        styleUsed: rewriteStyle,
        keywords: data.keywords || [],
        importantInfo: data.important_info || [],
        answer: data.answer,
        wordCount: data.word_count,
        question: question.trim() || null,
        model: data.model_name,
        time: data.processing_time || (data.latency_ms ? data.latency_ms / 1000 : 0),
      });
      onAddActivity?.({
        title: `Analyzed text (${rewriteStyle} rewrite)`,
        modality: 'text',
      });
    } catch (err) {
      setError(err.message || 'Text analysis failed.');
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div className="page-wrapper animate-blur-reveal">
      <div className="page-header">
        <div>
          <Badge variant="text" icon={FileText}>
            Natural Language Processing Studio
          </Badge>
          <h2 className="page-header__title">Text Understanding</h2>
          <p className="page-header__desc">
            Summarize passages, explain complex concepts clearly, extract keywords &amp; key statements, rewrite text into target registers, or run grounded Q&amp;A.
          </p>
        </div>
      </div>

      <div className="workspace-grid">
        {/* Left Column: Input & Controls */}
        <div className="workspace-stack">
          <Card
            title="Source Text Editor"
            subtitle="Paste text or pick a sample passage"
            icon={FileText}
            iconColor="var(--modality-text)"
          >
            <div className="preset-row">
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Samples:</span>
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="preset-chip"
                  disabled={loading}
                  onClick={() => {
                    setText(p.content);
                    setResult(null);
                    setError(null);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <textarea
              placeholder="Paste or write your text passage here (minimum 10 characters to summarize)..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
              style={{ minHeight: '190px' }}
              aria-label="Source text passage"
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '0.55rem',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
              }}
            >
              <span>
                {wordCount} Words &bull; {charCount} Characters
              </span>
              {text && (
                <button
                  type="button"
                  onClick={() => {
                    setText('');
                    setResult(null);
                    setError(null);
                  }}
                  style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="result-block" style={{ marginTop: '1.15rem', padding: '0.95rem 1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label htmlFor="summary-length-range" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Target Summary Budget
                </label>
                <span style={{ fontSize: '0.8rem', color: 'var(--modality-text)', fontFamily: 'var(--font-mono)' }}>
                  {maxLength} chars max
                </span>
              </div>
              <input
                id="summary-length-range"
                type="range"
                min="60"
                max="450"
                step="30"
                value={maxLength}
                onChange={(e) => setMaxLength(Number(e.target.value))}
                disabled={loading}
              />
            </div>

            <div style={{ marginTop: '1rem' }}>
              <Button
                variant="primary"
                icon={Sparkles}
                onClick={handleSummarize}
                disabled={text.trim().length < 10 || loading}
                loading={loading && activeAction === 'summarize'}
                fullWidth
              >
                Summarize Passage
              </Button>
            </div>
          </Card>

          <Card
            title="Explain, Rewrite &amp; Analyze"
            subtitle="Configure register rewriting and optional grounded question"
            icon={Sliders}
            iconColor="var(--brand-indigo)"
          >
            <form onSubmit={handleAnalyze} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  htmlFor="rewrite-style-select"
                  style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}
                >
                  Rewrite Style
                </label>
                <select
                  id="rewrite-style-select"
                  value={rewriteStyle}
                  onChange={(e) => setRewriteStyle(e.target.value)}
                  disabled={loading}
                >
                  <option value="concise">Concise (Compact overview)</option>
                  <option value="formal">Formal (Structured academic tone)</option>
                  <option value="bullet">Bullet Points (Key takeaways)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="text-qa-input"
                  style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}
                >
                  Optional Grounded Question
                </label>
                <input
                  id="text-qa-input"
                  type="text"
                  placeholder="e.g., What algorithms or crew members are mentioned?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                variant="secondary"
                icon={RefreshCw}
                disabled={text.trim().length < 5 || loading}
                loading={loading && activeAction === 'analyze'}
              >
                Explain, Rewrite &amp; Extract Facts
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Intelligence Output */}
        <Card
          title="NLP Intelligence Output"
          subtitle="Summaries, rewrites, keywords &amp; factual extraction"
          icon={Sparkles}
          iconColor="var(--modality-text)"
        >
          {loading && (
            <Loader
              message={
                activeAction === 'summarize'
                  ? 'Scoring salient sentences for extractive summary...'
                  : 'Extracting keywords, factual statements &amp; rewriting text...'
              }
              subtext="HybridNLP pipeline running on CPU"
            />
          )}

          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 className="error-banner__title">Error Processing Text</h4>
                <p className="error-banner__desc">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && !result && (
            <div className="empty-state">
              <FileText size={46} className="empty-state__icon" aria-hidden="true" />
              <p style={{ fontSize: '0.94rem' }}>
                Enter text on the left and select Summarize or Analyze to inspect outputs.
              </p>
            </div>
          )}

          {!loading && result && (
            <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {result.model && (
                  <Badge variant="text" size="sm">
                    {result.model}
                  </Badge>
                )}
                {result.time !== undefined && (
                  <Badge size="sm" icon={Clock}>
                    {Number(result.time).toFixed(3)}s Latency
                  </Badge>
                )}
                {result.compressionRatio !== undefined && (
                  <Badge variant="info" size="sm">
                    Ratio: {result.compressionRatio} ({result.summaryCharacters}/{result.originalCharacters} chars)
                  </Badge>
                )}
                {result.wordCount !== undefined && (
                  <Badge variant="default" size="sm">
                    {result.wordCount} Words Analyzed
                  </Badge>
                )}
              </div>

              {result.type === 'summarize' && result.summary && (
                <div className="result-block result-block--text">
                  <div className="result-block__header">
                    <span className="result-block__label" style={{ color: 'var(--modality-text)' }}>
                      Extractive Summary
                    </span>
                    <CopyButton text={result.summary} />
                  </div>
                  <p style={{ fontSize: '1.03rem', color: '#ffffff', lineHeight: 1.65, fontWeight: 500 }}>
                    {result.summary}
                  </p>
                </div>
              )}

              {result.type === 'analyze' && (
                <>
                  {result.answer && (
                    <div className="result-block result-block--highlight">
                      <div className="result-block__header">
                        <span className="result-block__label" style={{ color: 'var(--brand-indigo)' }}>
                          Question: &ldquo;{result.question}&rdquo;
                        </span>
                        <CopyButton text={result.answer} />
                      </div>
                      <h4 style={{ fontSize: '1.08rem', color: '#ffffff', fontWeight: 600, lineHeight: 1.5 }}>
                        {result.answer}
                      </h4>
                    </div>
                  )}

                  {result.rewrittenText && (
                    <div className="result-block result-block--text">
                      <div className="result-block__header">
                        <span className="result-block__label" style={{ color: 'var(--modality-text)' }}>
                          Rewritten Text ({result.styleUsed?.toUpperCase()})
                        </span>
                        <CopyButton text={result.rewrittenText} />
                      </div>
                      <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                        {result.rewrittenText}
                      </p>
                    </div>
                  )}

                  {result.explanation && (
                    <div className="result-block">
                      <div className="result-block__header">
                        <span className="result-block__label">Plain-Language Explanation</span>
                        <CopyButton text={result.explanation} />
                      </div>
                      <p style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>{result.explanation}</p>
                    </div>
                  )}

                  {result.keywords?.length > 0 && (
                    <div className="result-block" style={{ padding: '1rem 1.2rem' }}>
                      <span className="result-block__label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                        Extracted Keywords
                      </span>
                      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                        {result.keywords.map((kw, idx) => (
                          <Badge key={`${kw}-${idx}`} variant="text" size="sm" icon={Tag}>
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.importantInfo?.length > 0 && (
                    <div className="result-block">
                      <span className="result-block__label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                        Important Factual Statements
                      </span>
                      <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {result.importantInfo.map((info, idx) => (
                          <li key={idx} style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                            {info}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TextPage;
