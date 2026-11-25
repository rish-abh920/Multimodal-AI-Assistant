import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  File,
  Image as ImageIcon,
  Music,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Badge from './Badge';

const MediaPreview = ({ file }) => {
  const mediaRef = useRef(null);
  const isImage = file?.type?.startsWith('image/');
  const isAudio = file?.type?.startsWith('audio/');

  useEffect(() => {
    const el = mediaRef.current;
    if (!el || (!isImage && !isAudio)) return undefined;
    const url = URL.createObjectURL(file);
    el.src = url;
    return () => {
      el.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [file, isImage, isAudio]);

  if (isImage) {
    return (
      <div className="file-preview-card__image-box">
        <img ref={mediaRef} alt={`Preview of ${file.name}`} className="file-preview-card__image" />
      </div>
    );
  }

  if (isAudio) {
    return (
      <div>
        <audio ref={mediaRef} controls style={{ width: '100%', borderRadius: 'var(--radius-md)' }} />
      </div>
    );
  }

  return null;
};

export const FileUploader = ({
  file,
  onFileSelect,
  onFileRemove,
  accept = '*/*',
  maxSizeMB = 25,
  label = 'Upload file',
  helperText = 'Drag & drop or click to browse',
  modality = 'generic', // image, audio, doc, generic
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndSetFile = (selectedFile) => {
    setError(null);
    if (!selectedFile) return;

    if (selectedFile.size === 0) {
      setError('Selected file is empty (0 bytes).');
      return;
    }

    const sizeInMB = selectedFile.size / (1024 * 1024);
    if (sizeInMB > maxSizeMB) {
      setError(`File exceeds maximum size limit of ${maxSizeMB} MB.`);
      return;
    }

    onFileSelect(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileRemove();
  };

  const ModIcon =
    modality === 'image'
      ? ImageIcon
      : modality === 'audio'
      ? Music
      : modality === 'doc' || modality === 'document'
      ? FileText
      : File;

  const formattedAccept = accept
    .split(',')
    .map((item) => item.split('/').pop()?.replace('.', '').toUpperCase())
    .filter((v) => v && v !== '*')
    .join(', ');

  return (
    <div style={{ width: '100%' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
        aria-label={label}
      />

      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`dropzone ${isDragging ? 'dropzone--active' : ''}`}
        >
          <div className="dropzone__icon-wrap">
            <UploadCloud size={26} aria-hidden="true" />
          </div>

          <h4 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {label}
          </h4>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {helperText}
          </p>

          <div
            style={{
              marginTop: '1rem',
              display: 'flex',
              justifyContent: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <Badge size="sm">Max {maxSizeMB} MB</Badge>
            {formattedAccept && (
              <Badge size="sm" variant="info">
                {formattedAccept}
              </Badge>
            )}
          </div>
        </div>
      ) : (
        <div className="file-preview-card">
          <div className="file-preview-card__top">
            <div className="file-preview-card__meta">
              <div className="ui-card__icon-box">
                <ModIcon size={20} aria-hidden="true" />
              </div>
              <div style={{ minWidth: 0 }}>
                <h5 className="file-preview-card__name">{file.name}</h5>
                <p className="file-preview-card__sub">
                  {file.size >= 1024 * 1024
                    ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                    : `${Math.max(1, Math.round(file.size / 1024))} KB`}{' '}
                  • {file.type || 'Detected file'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
              <Badge variant="success" size="sm" icon={CheckCircle2}>
                Ready
              </Badge>
              <button
                type="button"
                onClick={handleRemove}
                className="icon-action-btn"
                title="Remove file"
                aria-label={`Remove ${file.name}`}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <MediaPreview file={file} />
        </div>
      )}

      {error && (
        <div
          className="error-banner"
          style={{ marginTop: '0.75rem', padding: '0.7rem 0.9rem' }}
          role="alert"
        >
          <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span style={{ fontSize: '0.84rem', color: '#fca5a5' }}>{error}</span>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
