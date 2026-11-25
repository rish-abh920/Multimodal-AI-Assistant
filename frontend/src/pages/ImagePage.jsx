import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  HelpCircle,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import CopyButton from '../components/common/CopyButton';
import FileUploader from '../components/common/FileUploader';
import Loader from '../components/common/Loader';
import { generateCaption, answerQuestion, analyzeImage } from '../api/imageApi';

const COLOR_SWATCH_MAP = {
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
  yellow: '#eab308',
  'brown / earth': '#92400e',
  white: '#f8fafc',
  'black / charcoal': '#18181b',
  'neutral gray': '#71717a',
  'natural multi-tone': '#a855f7',
  'warm neutral': '#d97706',
};

const getSwatchColor = (colorItem) => {
  if (typeof colorItem === 'object' && colorItem !== null) {
    return colorItem.hex || COLOR_SWATCH_MAP[(colorItem.name || '').toLowerCase()] || '#64748b';
  }
  return COLOR_SWATCH_MAP[String(colorItem).toLowerCase()] || '#64748b';
};

export const ImagePage = ({ onAddActivity }) => {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null); // 'caption' | 'ask' | 'analyze'
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCaption = async () => {
    if (!file) {
      setError('Please upload an image first.');
      return;
    }
    setError(null);
    setLoading(true);
    setActiveAction('caption');

    try {
      const data = await generateCaption(file);
      setResult({
        type: 'caption',
        caption: data.image_description,
        model: data.model_name,
        time: data.processing_time || (data.latency_ms ? data.latency_ms / 1000 : 0),
        metadata: data.image_metadata,
      });
      onAddActivity?.({
        title: `Caption generated for ${file.name}`,
        modality: 'image',
      });
    } catch (err) {
      setError(err.message || 'Failed to generate image caption.');
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const handleAsk = async (e) => {
    e?.preventDefault();
    if (!file) {
      setError('Please upload an image first.');
      return;
    }
    if (!question.trim()) {
      setError('Please enter a question to ask about the image.');
      return;
    }

    setError(null);
    setLoading(true);
    setActiveAction('ask');

    try {
      const data = await answerQuestion(file, question.trim());
      setResult({
        type: 'vqa',
        question: data.question || question.trim(),
        answer: data.answer,
        confidence: data.confidence,
        model: data.model_name || data.model_used,
        time: data.processing_time || (data.latency_ms ? data.latency_ms / 1000 : 0),
      });
      onAddActivity?.({
        title: `Visual Q&A on ${file.name}`,
        modality: 'image',
      });
    } catch (err) {
      setError(err.message || 'Failed to answer visual question.');
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please upload an image first.');
      return;
    }
    setError(null);
    setLoading(true);
    setActiveAction('analyze');

    try {
      const data = await analyzeImage(file);
      setResult({
        type: 'analysis',
        caption: data.image_description,
        sceneType: data.scene_type,
        keyElements: data.key_elements || [],
        colors: data.dominant_colors || [],
        explanation: data.explanation,
        model: data.model_name,
        time: data.processing_time,
        metadata: data.image_metadata,
      });
      onAddActivity?.({
        title: `Scene analysis for ${file.name}`,
        modality: 'image',
      });
    } catch (err) {
      setError(err.message || 'Failed to perform deep image analysis.');
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  return (
    <div className="page-wrapper animate-blur-reveal">
      <div className="page-header">
        <div>
          <Badge variant="image" icon={ImageIcon}>
            Vision Intelligence Studio
          </Badge>
          <h2 className="page-header__title">Image Understanding</h2>
          <p className="page-header__desc">
            Upload an image to generate descriptive captions with Salesforce BLIP, ask natural-language questions via ViLT-B32 VQA, or inspect scene classification &amp; color histograms.
          </p>
        </div>
      </div>

      <div className="workspace-grid">
        {/* Left Column: Image Upload & Controls */}
        <div className="workspace-stack">
          <Card
            title="Image Input"
            subtitle="Supported: JPG, JPEG, PNG, WEBP, BMP"
            icon={ImageIcon}
            iconColor="var(--modality-image)"
          >
            <FileUploader
              file={file}
              onFileSelect={(selected) => {
                setFile(selected);
                setResult(null);
                setError(null);
              }}
              onFileRemove={() => {
                setFile(null);
                setResult(null);
                setError(null);
              }}
              accept="image/png,image/jpeg,image/webp,image/bmp"
              maxSizeMB={10}
              label="Drop image here or click to browse"
              modality="image"
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '0.75rem',
                marginTop: '1.25rem',
              }}
            >
              <Button
                variant="primary"
                icon={Sparkles}
                onClick={handleCaption}
                disabled={!file || loading}
                loading={loading && activeAction === 'caption'}
              >
                Generate Caption
              </Button>
              <Button
                variant="secondary"
                icon={Eye}
                onClick={handleAnalyze}
                disabled={!file || loading}
                loading={loading && activeAction === 'analyze'}
              >
                Analyze Scene
              </Button>
            </div>
          </Card>

          <Card
            title="Visual Question Answering (VQA)"
            subtitle="Ask any visual question grounded in the uploaded image"
            icon={HelpCircle}
            iconColor="var(--brand-indigo)"
          >
            <form onSubmit={handleAsk} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                placeholder="e.g., What color is the car? Is this indoor or outdoor?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={!file || loading}
                aria-label="Visual question"
              />

              <div className="preset-row" style={{ marginBottom: 0 }}>
                {['What is the main subject?', 'Is this indoor or outdoor?', 'What colors are prominent?'].map(
                  (q) => (
                    <button
                      key={q}
                      type="button"
                      className="preset-chip"
                      disabled={!file || loading}
                      onClick={() => setQuestion(q)}
                    >
                      {q}
                    </button>
                  )
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  icon={HelpCircle}
                  disabled={!file || !question.trim() || loading}
                  loading={loading && activeAction === 'ask'}
                >
                  Ask Visual Question
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Results Display */}
        <Card
          title="Analysis Results"
          subtitle="Structured predictions from BLIP & ViLT"
          icon={Sparkles}
          iconColor="var(--modality-image)"
        >
          {loading && (
            <Loader
              message={
                activeAction === 'caption'
                  ? 'Generating neural image caption with BLIP...'
                  : activeAction === 'ask'
                  ? 'Answering visual question with ViLT-B32...'
                  : 'Extracting scene category, lighting & color palette...'
              }
              subtext="Model inference executing safely on host CPU"
            />
          )}

          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 className="error-banner__title">Error Processing Image</h4>
                <p className="error-banner__desc">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && !result && (
            <div className="empty-state">
              <ImageIcon size={46} className="empty-state__icon" aria-hidden="true" />
              <p style={{ fontSize: '0.94rem' }}>
                Upload an image and trigger Caption, Analyze Scene, or VQA to inspect visual results.
              </p>
            </div>
          )}

          {!loading && result && (
            <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Badge variant="image" size="sm">
                  {result.model}
                </Badge>
                {result.time !== undefined && (
                  <Badge size="sm" icon={Clock}>
                    {Number(result.time).toFixed(2)}s Latency
                  </Badge>
                )}
                {result.confidence !== undefined && result.confidence !== null && (
                  <Badge variant="success" size="sm" icon={CheckCircle2}>
                    Confidence: {(result.confidence * 100).toFixed(1)}%
                  </Badge>
                )}
                {result.metadata?.width && result.metadata?.height && (
                  <Badge size="sm" variant="default">
                    {result.metadata.width}×{result.metadata.height} {result.metadata.format || ''}
                  </Badge>
                )}
              </div>

              {result.caption && (
                <div className="result-block result-block--image">
                  <div className="result-block__header">
                    <span className="result-block__label" style={{ color: 'var(--modality-image)' }}>
                      Generated Caption
                    </span>
                    <CopyButton text={result.caption} />
                  </div>
                  <p style={{ fontSize: '1.08rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.5 }}>
                    &ldquo;{result.caption}&rdquo;
                  </p>
                </div>
              )}

              {result.type === 'vqa' && (
                <div className="result-block result-block--highlight">
                  <div className="result-block__header">
                    <span className="result-block__label" style={{ color: 'var(--brand-indigo)' }}>
                      Question: &ldquo;{result.question}&rdquo;
                    </span>
                    <CopyButton text={result.answer} />
                  </div>
                  <h3 style={{ fontSize: '1.28rem', color: '#ffffff', fontWeight: 700 }}>
                    {result.answer}
                  </h3>
                </div>
              )}

              {result.type === 'analysis' && (
                <>
                  {result.sceneType && (
                    <div className="result-block" style={{ padding: '1rem 1.2rem' }}>
                      <span className="result-block__label" style={{ display: 'block', marginBottom: '0.45rem' }}>
                        Scene Classification
                      </span>
                      <Badge variant="info">{result.sceneType}</Badge>
                    </div>
                  )}

                  {result.keyElements?.length > 0 && (
                    <div className="result-block" style={{ padding: '1rem 1.2rem' }}>
                      <span className="result-block__label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                        Detected Visual Elements
                      </span>
                      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                        {result.keyElements.map((el) => (
                          <Badge key={el} size="sm" variant="default" icon={Tag}>
                            {el}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.colors?.length > 0 && (
                    <div className="result-block" style={{ padding: '1rem 1.2rem' }}>
                      <span className="result-block__label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                        Dominant Colors
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {result.colors.map((c, idx) => {
                          const label = typeof c === 'object' ? c.name || c.hex : String(c);
                          return (
                            <span key={`${label}-${idx}`} className="color-chip">
                              <span
                                className="color-chip__dot"
                                style={{ backgroundColor: getSwatchColor(c) }}
                                aria-hidden="true"
                              />
                              <span>{label}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {result.explanation && (
                    <div className="result-block">
                      <div className="result-block__header">
                        <span className="result-block__label">Visual Explanation</span>
                        <CopyButton text={result.explanation} />
                      </div>
                      <p style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>{result.explanation}</p>
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

export default ImagePage;
