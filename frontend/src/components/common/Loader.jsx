import React from 'react';
import { Sparkles } from 'lucide-react';

export const Loader = ({
  message = 'Processing request...',
  subtext = 'Neural inference running on host CPU',
  type = 'ring', // ring, wave
}) => {
  return (
    <div className="neural-loader" role="status" aria-live="polite">
      {type === 'wave' ? (
        <div className="waveform-bars" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span
              key={i}
              className="waveform-bar"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      ) : (
        <div className="neural-loader__orb" aria-hidden="true">
          <div className="neural-loader__ring-outer" />
          <div className="neural-loader__ring-inner" />
          <div className="neural-loader__core">
            <Sparkles size={14} />
          </div>
        </div>
      )}

      <div>
        <p style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {message}
        </p>
        {subtext && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};

export default Loader;
