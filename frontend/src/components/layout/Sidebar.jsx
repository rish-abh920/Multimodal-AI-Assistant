import React from 'react';
import {
  LayoutDashboard,
  Image as ImageIcon,
  Mic,
  FileText,
  FileSearch,
  MessageSquare,
  Info,
  ChevronLeft,
  ChevronRight,
  Cpu,
} from 'lucide-react';

export const Sidebar = ({
  activePage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  healthData,
  statusData,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      color: 'var(--brand-indigo)',
      tag: null,
    },
    {
      id: 'image',
      label: 'Image AI',
      icon: ImageIcon,
      color: 'var(--modality-image)',
      tag: 'BLIP',
    },
    {
      id: 'audio',
      label: 'Audio AI',
      icon: Mic,
      color: 'var(--modality-audio)',
      tag: 'Whisper',
    },
    {
      id: 'text',
      label: 'Text AI',
      icon: FileText,
      color: 'var(--modality-text)',
      tag: 'NLP',
    },
    {
      id: 'document',
      label: 'Document AI',
      icon: FileSearch,
      color: 'var(--modality-doc)',
      tag: 'RAG',
    },
    {
      id: 'chat',
      label: 'Chat History',
      icon: MessageSquare,
      color: 'var(--brand-cyan)',
      tag: 'Omni',
    },
    {
      id: 'about',
      label: 'About Project',
      icon: Info,
      color: 'var(--text-secondary)',
      tag: null,
    },
  ];

  const deviceName = healthData?.hardware?.device?.toUpperCase() || 'CPU';
  const cpuCores = healthData?.hardware?.cpu_cores;
  const totalGb = healthData?.hardware?.memory?.total_gb;
  const footprintMb = statusData?.memory_footprint_mb;

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="mobile-backdrop"
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${
          mobileOpen ? 'sidebar--mobile-open' : ''
        }`}
        aria-label="Primary Workspace Navigation"
      >
        <div className="sidebar__top">
          <div className="sidebar__header">
            {!collapsed && <span className="sidebar__section-label">Workspaces</span>}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="sidebar__collapse-btn"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          <nav className="sidebar__nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile();
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`nav-item ${isActive ? 'nav-item--active' : ''}`}
                  style={{ '--item-accent': item.color }}
                >
                  {isActive && <span className="nav-item__indicator" aria-hidden="true" />}

                  <span className="nav-item__icon">
                    <Icon size={19} aria-hidden="true" />
                  </span>

                  {!collapsed ? (
                    <span className="nav-item__content">
                      <span className="nav-item__label">{item.label}</span>
                      {item.tag && <span className="nav-item__tag">{item.tag}</span>}
                    </span>
                  ) : (
                    <span className="nav-item__tooltip" role="tooltip">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {!collapsed && (
          <div className="sidebar__footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
              <Cpu size={14} color="var(--brand-indigo)" aria-hidden="true" />
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Runtime Telemetry
              </span>
            </div>
            <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              {deviceName} Mode
              {cpuCores ? ` • ${cpuCores} Cores` : ''}
              {totalGb ? ` • ${totalGb} GB RAM` : ''}
            </p>
            {footprintMb !== undefined && (
              <p
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-accent)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: '3px',
                }}
              >
                Process: {footprintMb.toFixed(1)} MB
              </p>
            )}
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
