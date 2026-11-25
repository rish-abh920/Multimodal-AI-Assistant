import React from 'react';

export const SkeletonLoader = ({ variant = 'panel' }) => {
  if (variant === 'metrics') {
    return (
      <div className="metrics-grid" aria-busy="true" aria-label="Loading system metrics">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass-panel metric-card">
            <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton--text" style={{ width: '55%' }} />
              <div className="skeleton skeleton--text" style={{ width: '80%', marginBottom: 0 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'chat') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }} aria-busy="true">
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', maxWidth: '72%' }}>
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton--text" style={{ width: '90%' }} />
            <div className="skeleton skeleton--text" style={{ width: '65%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem 0' }} aria-busy="true" aria-label="Loading result">
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--text" style={{ width: '92%' }} />
      <div className="skeleton skeleton--text" style={{ width: '84%' }} />
      <div className="skeleton skeleton--block" style={{ marginTop: '1rem' }} />
    </div>
  );
};

export default SkeletonLoader;

