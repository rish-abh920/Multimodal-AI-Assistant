import React from 'react';
import { Sparkles, Cpu, Menu, X, Layers, LayoutDashboard, MessageSquare } from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';

export const Navbar = ({
  healthData,
  statusData,
  activePage,
  onNavigate,
  mobileMenuOpen,
  onToggleMobileMenu,
}) => {
  const isHealthy = healthData?.status === 'healthy';
  const cpuThreads = healthData?.hardware?.cpu_threads;
  const loadedModels = statusData?.loaded_models || [];
  const maxModels = statusData?.max_concurrent_models ?? 2;

  return (
    <header className="navbar">
      <div className="navbar__left">
        {activePage !== 'landing' && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="mobile-toggle-btn"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="navbar__brand"
          aria-label="Go to Landing Page"
        >
          <div className="navbar__logo-mark">
            <Sparkles size={17} aria-hidden="true" />
          </div>
          <span className="navbar__title">
            Multimodal <span className="navbar__title-accent">AI Assistant</span>
          </span>
        </button>
      </div>

      <div className="navbar__right">
        {activePage === 'landing' && (
          <div className="navbar__nav-quick">
            <Button
              variant="ghost"
              size="sm"
              icon={LayoutDashboard}
              onClick={() => onNavigate('dashboard')}
            >
              Dashboard
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={MessageSquare}
              onClick={() => onNavigate('chat')}
            >
              Unified Chat
            </Button>
          </div>
        )}

        <div className="navbar__status-pills">
          <Badge variant={isHealthy ? 'success' : 'warning'} size="sm" dot dotOnline={isHealthy}>
            {isHealthy ? 'API Online' : 'Connecting...'}
          </Badge>

          {cpuThreads !== undefined && (
            <Badge variant="default" size="sm" icon={Cpu} className="pill-hide-tablet">
              {healthData?.hardware?.device?.toUpperCase() || 'CPU'} • {cpuThreads} Threads
            </Badge>
          )}

          {statusData && (
            <Badge variant="info" size="sm" icon={Layers} className="pill-hide-tablet">
              {loadedModels.length}/{maxModels} Models
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
