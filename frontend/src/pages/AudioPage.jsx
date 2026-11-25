import React, { useState, useRef } from 'react';
import {
  Mic,
  Square,
  Sparkles,
  HelpCircle,
  FileText,
  Clock,
  Globe,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import CopyButton from '../components/common/CopyButton';
import FileUploader from '../components/common/FileUploader';
import Loader from '../components/common/Loader';
import { transcribeAudio, summarizeAudio, askAudioQuestion } from '../api/audioApi';
import { convertBlobToWavFile } from '../utils/audioWavEncoder';

export const AudioPage = ({ onAddActivity }) => {
  const [file, setFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const [language, setLanguage] = useState('');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null); // 'transcribe' | 'summarize' | 'ask'
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Live microphone capture encoded to 16-bit PCM WAV for FastAPI compatibility
  const startRecording = async () => {
    try {
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Microphone recording is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        try {
          const rawBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const wavFile = await convertBlobToWavFile(rawBlob);
          setFile(wavFile);
          setResult(null);
        } catch (convErr) {
          setError(convErr.message || 'Could not encode recorded microphone audio.');
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleTranscribe = async () => {
    if (!file) {
      setError('Please upload or record an audio file first.');
      return;
    }
    setError(null);
    setLoading(true);
    setActiveAction('transcribe');

    try {
      const data = await transcribeAudio(file, language || null);
      setResult({
        type: 'transcribe',
        transcript: data.transcript,
        language: data.detected_language,
        duration: data.duration_seconds,
        segments: data.segments || [],
        model: data.model_name || data.model_used,
        time: data.processing_time || (data.latency_ms ? data.latency_ms / 1000 : 0),
      });
      onAddActivity?.({
        title: `Transcribed audio (${file.name})`,
        modality: 'audio',
      });
    } catch (err) {
      setError(err.message || 'Speech transcription failed.');
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const handleSummarize = async () => {
    if (!file) {
      setError('Please upload or record an audio file first.');
      return;
    }
    setError(null);
    setLoading(true);
    setActiveAction('summarize');

    try {
      const data = await summarizeAudio(file);
      setResult({
        type: 'summarize',
        transcript: data.transcript,
        summary: data.summary,
        keyPoints: data.key_points || [],
        language: data.detected_language,
        duration: data.duration_seconds,
        model: data.model_name,
        time: data.processing_time,
      });
      onAddActivity?.({
        title: `Summarized audio (${file.name})`,
        modality: 'audio',
      });
    } catch (err) {
      setError(err.message || 'Audio summarization failed.');
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const handleAsk = async (e) => {
    e?.preventDefault();
    if (!file) {
      setError('Please upload or record an audio file first.');
      return;
    }
    if (!question.trim()) {
      setError('Please enter a question to ask about the recording.');
      return;
    }

    setError(null);
    setLoading(true);
    setActiveAction('ask');

    try {
      const data = await askAudioQuestion(file, question.trim());
      setResult({
        type: 'ask',
        question: data.question || question.trim(),
        answer: data.answer,
        confidence: data.confidence,
        relevantSegment: data.relevant_segment,
        transcript: data.transcript,
        language: data.detected_language,
        model: data.model_name,
        time: data.processing_time,
      });
      onAddActivity?.({
        title: `Speech Q&A on ${file.name}`,
        modality: 'audio',
      });
    } catch (err) {
      setError(err.message || 'Failed to answer question on audio.');
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  return (
    <div className="page-wrapper animate-blur-reveal">
      <div className="page-header">
        <div>
          <Badge variant="audio" icon={Mic}>
            Automatic Speech Recognition Studio
          </Badge>
          <h2 className="page-header__title">Audio Understanding</h2>
          <p className="page-header__desc">
            Upload audio files or record directly via microphone to transcribe speech with faster-whisper INT8, inspect timestamped segments, extract key points, and ask transcript-grounded questions.
          </p>
        </div>
      </div>

      <div className="workspace-grid">
        {/* Left Column: Audio Input & Actions */}
        <div className="workspace-stack">
          <Card
            title="Audio Input"
            subtitle="Supported: WAV, MP3, M4A, FLAC, OGG"
            icon={Mic}
            iconColor="var(--modality-audio)"
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
              accept="audio/wav,audio/mpeg,audio/mp3,audio/m4a,audio/flac,audio/ogg"
              maxSizeMB={25}
              label="Drop audio file or capture voice below"
              modality="audio"
            />

            <div style={{ marginTop: '1rem' }}>
              {!recording ? (
                <Button
                  variant="outline"
                  icon={Mic}
                  onClick={startRecording}
                  disabled={loading}
                  fullWidth
                >
                  Record from Microphone (WAV)
                </Button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div
                    className="result-block result-block--audio"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '1rem',
                      padding: '0.75rem',
                    }}
                  >
                    <div className="waveform-bars" style={{ height: 28 }} aria-hidden="true">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className="waveform-bar"
                          style={{ height: 24, animationDelay: `${i * 0.14}s` }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--modality-audio)', fontWeight: 500 }}>
                      Capturing live audio...
                    </span>
                  </div>
                  <Button variant="danger" icon={Square} onClick={stopRecording} fullWidth>
                    Stop Recording
                  </Button>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label
                  htmlFor="audio-lang-select"
                  style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}
                >
                  Transcription Language
                </label>
                <select
                  id="audio-lang-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Auto-Detect Language</option>
                  <option value="en">English (en)</option>
                  <option value="hi">Hindi (hi)</option>
                  <option value="es">Spanish (es)</option>
                  <option value="fr">French (fr)</option>
                  <option value="de">German (de)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                <Button
                  variant="primary"
                  icon={FileText}
                  onClick={handleTranscribe}
                  disabled={!file || loading || recording}
                  loading={loading && activeAction === 'transcribe'}
                >
                  Transcribe
                </Button>
                <Button
                  variant="secondary"
                  icon={Sparkles}
                  onClick={handleSummarize}
                  disabled={!file || loading || recording}
                  loading={loading && activeAction === 'summarize'}
                >
                  Summarize
                </Button>
              </div>
            </div>
          </Card>

          <Card
            title="Question Answering on Transcript"
            subtitle="Query the spoken recording directly"
            icon={HelpCircle}
            iconColor="var(--brand-indigo)"
          >
            <form onSubmit={handleAsk} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                placeholder="e.g., What did the speaker say about the timeline?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={!file || loading || recording}
                aria-label="Audio transcript question"
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  icon={HelpCircle}
                  disabled={!file || !question.trim() || loading || recording}
                  loading={loading && activeAction === 'ask'}
                >
                  Query Recording
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Speech Output */}
        <Card
          title="Speech Intelligence Output"
          subtitle="Transcripts, timestamp alignment, summaries & key points"
          icon={Sparkles}
          iconColor="var(--modality-audio)"
        >
          {loading && (
            <Loader
              type="wave"
              message={
                activeAction === 'transcribe'
                  ? 'Transcribing speech with faster-whisper INT8...'
                  : activeAction === 'summarize'
                  ? 'Generating transcript summary and key points...'
                  : 'Matching question against transcript segments...'
              }
              subtext="Quantized INT8 CPU inference with timestamp alignment"
            />
          )}

          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 className="error-banner__title">Error Processing Audio</h4>
                <p className="error-banner__desc">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && !result && (
            <div className="empty-state">
              <Mic size={46} className="empty-state__icon" aria-hidden="true" />
              <p style={{ fontSize: '0.94rem' }}>
                Upload an audio file or record via microphone to view transcripts, timestamps, and summaries.
              </p>
            </div>
          )}

          {!loading && result && (
            <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {result.language && (
                  <Badge variant="audio" size="sm" icon={Globe}>
                    Language: {result.language.toUpperCase()}
                  </Badge>
                )}
                {result.duration !== undefined && (
                  <Badge size="sm" icon={Clock}>
                    Duration: {Number(result.duration).toFixed(1)}s
                  </Badge>
                )}
                {result.time !== undefined && (
                  <Badge size="sm">
                    {Number(result.time).toFixed(2)}s Latency
                  </Badge>
                )}
                {result.confidence !== undefined && result.confidence !== null && (
                  <Badge variant="success" size="sm" icon={CheckCircle2}>
                    Confidence: {(result.confidence * 100).toFixed(1)}%
                  </Badge>
                )}
                {result.model && (
                  <Badge variant="default" size="sm">
                    {result.model}
                  </Badge>
                )}
              </div>

              {result.type === 'ask' && (
                <div className="result-block result-block--audio">
                  <div className="result-block__header">
                    <span className="result-block__label" style={{ color: 'var(--modality-audio)' }}>
                      Question: &ldquo;{result.question}&rdquo;
                    </span>
                    <CopyButton text={result.answer} />
                  </div>
                  <h3 style={{ fontSize: '1.12rem', color: '#ffffff', fontWeight: 600, lineHeight: 1.5 }}>
                    {result.answer}
                  </h3>
                  {result.relevantSegment && (
                    <p
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        marginTop: '0.55rem',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      Source Segment: {result.relevantSegment}
                    </p>
                  )}
                </div>
              )}

              {result.summary && (
                <div className="result-block result-block--audio">
                  <div className="result-block__header">
                    <span className="result-block__label" style={{ color: 'var(--modality-audio)' }}>
                      Executive Audio Summary
                    </span>
                    <CopyButton text={result.summary} />
                  </div>
                  <p style={{ fontSize: '0.98rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                    {result.summary}
                  </p>

                  {result.keyPoints?.length > 0 && (
                    <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <span className="result-block__label" style={{ display: 'block', marginBottom: '0.45rem' }}>
                        Extracted Key Points
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

              {result.transcript && (
                <div className="result-block">
                  <div className="result-block__header">
                    <span className="result-block__label">Full Speech Transcript</span>
                    <CopyButton text={result.transcript} />
                  </div>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.65 }}>
                    &ldquo;{result.transcript}&rdquo;
                  </p>
                </div>
              )}

              {result.segments?.length > 0 && (
                <div>
                  <span className="result-block__label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Timestamped Segments ({result.segments.length})
                  </span>
                  <div className="segment-list">
                    {result.segments.map((seg, idx) => (
                      <div key={idx} className="segment-item">
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--modality-audio)',
                            fontSize: '0.76rem',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          [{seg.start?.toFixed(1)}s &ndash; {seg.end?.toFixed(1)}s]
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{seg.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AudioPage;
