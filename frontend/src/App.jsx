import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import Toast from './components/common/Toast';
import SplashLoader from './components/common/SplashLoader';

// Pages
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ImagePage from './pages/ImagePage';
import AudioPage from './pages/AudioPage';
import TextPage from './pages/TextPage';
import DocumentPage from './pages/DocumentPage';
import ChatHistoryPage from './pages/ChatHistoryPage';
import AboutPage from './pages/AboutPage';

// Telemetry APIs
import { getHealth, getStatus } from './api/healthApi';

export function App() {
  const [activePage, setActivePage] = useState('landing');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [splashLeaving, setSplashLeaving] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const toastSeqRef = useRef(0);
  const [recentActivities, setRecentActivities] = useState([
    { title: 'Initialized Multimodal Assistant UI', modality: 'system' },
  ]);

  // Brief startup splash reveal that fades out immediately once mounted
  useEffect(() => {
    const leaveTimer = window.setTimeout(() => setSplashLeaving(true), 420);
    const doneTimer = window.setTimeout(() => setSplashDone(true), 860);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  // Poll live backend /health and /api/v1/status telemetry
  useEffect(() => {
    let isMounted = true;

    const checkTelemetry = async () => {
      try {
        const [health, status] = await Promise.all([
          getHealth(),
          getStatus().catch(() => null),
        ]);
        if (isMounted) {
          setHealthData(health);
          if (status) setStatusData(status);
        }
      } catch {
        if (isMounted) {
          setHealthData({ status: 'offline', hardware: { device: 'cpu', cpu_threads: 4 } });
        }
      }
    };

    checkTelemetry();
    const interval = window.setInterval(checkTelemetry, 20000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addToast = ({ title, message, type = 'info' }) => {
    toastSeqRef.current += 1;
    const id = `toast-${toastSeqRef.current}`;
    setToasts((prev) => [...prev.slice(-3), { id, title, message, type }]);
    window.setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const addActivity = ({ title, modality }) => {
    setRecentActivities((prev) => [{ title, modality }, ...prev.slice(0, 8)]);
    addToast({
      title: 'Inference Complete',
      message: title,
      type: 'success',
    });
  };

  const handleNavigate = (page) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderActivePage = () => {
    switch (activePage) {
      case 'landing':
        return <LandingPage onNavigate={handleNavigate} healthData={healthData} />;
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={handleNavigate}
            healthData={healthData}
            statusData={statusData}
            recentActivities={recentActivities}
          />
        );
      case 'image':
        return <ImagePage onAddActivity={addActivity} />;
      case 'audio':
        return <AudioPage onAddActivity={addActivity} />;
      case 'text':
        return <TextPage onAddActivity={addActivity} />;
      case 'document':
        return <DocumentPage onAddActivity={addActivity} />;
      case 'chat':
        return <ChatHistoryPage onAddActivity={addActivity} />;
      case 'about':
        return <AboutPage statusData={statusData} healthData={healthData} />;
      default:
        return (
          <DashboardPage
            onNavigate={handleNavigate}
            healthData={healthData}
            statusData={statusData}
            recentActivities={recentActivities}
          />
        );
    }
  };

  return (
    <div className="app-shell">
      {!splashDone && <SplashLoader leaving={splashLeaving} />}

      {/* Layered Grid & Noise Backdrop */}
      <div className="ambient-canvas" aria-hidden="true">
        <div className="ambient-grid" />
        <div className="ambient-noise" />
      </div>

      <Navbar
        healthData={healthData}
        statusData={statusData}
        activePage={activePage}
        onNavigate={handleNavigate}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      <div className="app-body">
        {activePage !== 'landing' && (
          <Sidebar
            activePage={activePage}
            onNavigate={handleNavigate}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
            mobileOpen={mobileMenuOpen}
            onCloseMobile={() => setMobileMenuOpen(false)}
            healthData={healthData}
            statusData={statusData}
          />
        )}

        <main className="main-content">
          <div key={activePage} className="page-transition-shell" style={{ flex: 1 }}>
            {renderActivePage()}
          </div>
          <Footer onNavigate={handleNavigate} />
        </main>
      </div>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
