import React from 'react';
import { Sparkles } from 'lucide-react';

export const SplashLoader = ({ leaving }) => {
  return (
    <div className={`app-splash ${leaving ? 'app-splash--leaving' : ''}`} aria-hidden={leaving}>
      <div className="neural-loader__orb">
        <div className="neural-loader__ring-outer" />
        <div className="neural-loader__ring-inner" />
        <div className="neural-loader__core">
          <Sparkles size={15} />
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Multimodal <span className="navbar__title-accent">AI Assistant</span>
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Initializing Neural Orchestration Workspace
        </p>
      </div>

      <div className="app-splash__bar" />
    </div>
  );
};

export default SplashLoader;

