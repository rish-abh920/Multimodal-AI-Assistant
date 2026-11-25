import React from 'react';
import { Sparkles } from 'lucide-react';

export const Footer = ({ onNavigate }) => {
  return (
    <footer className="app-footer">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
        <Sparkles size={16} color="var(--brand-indigo)" aria-hidden="true" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Multimodal AI Assistant • Unified Neural Orchestration
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
        {onNavigate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem' }}>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              style={{ color: 'var(--text-secondary)' }}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => onNavigate('chat')}
              style={{ color: 'var(--text-secondary)' }}
            >
              Unified Chat
            </button>
            <button
              type="button"
              onClick={() => onNavigate('about')}
              style={{ color: 'var(--text-secondary)' }}
            >
              Architecture
            </button>
          </div>
        )}
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          FastAPI • PyTorch • React 19
        </span>
      </div>
    </footer>
  );
};

export default Footer;
