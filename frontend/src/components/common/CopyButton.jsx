import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export const CopyButton = ({ text, label = 'Copy' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API fallback ignored safely
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`copy-btn ${copied ? 'copy-btn--copied' : ''}`}
      aria-label={copied ? 'Copied to clipboard' : label}
    >
      {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
};

export default CopyButton;

