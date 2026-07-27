import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AppProvider, useApp } from './AppContext';
import Login from './components/Login';
import Register from './components/Register';
import SidebarNav from './components/SidebarNav';
import FiltersSidebar from './components/FiltersSidebar';
import ConversationList from './components/ConversationList';
import ChatWindow from './components/ChatWindow';
import ContactPanel from './components/ContactPanel';
import GlobalSearch from './components/GlobalSearch';
import ChatbotView from './components/ChatbotView';
import SuperAdminView from './components/SuperAdminView';
import StatusPagePublic from './components/StatusPagePublic';
import DashboardView from './components/DashboardView';
import ProfileView from './components/ProfileView';
import CsatView from './components/CsatView';

import ContactsView from './components/ContactsView';
import CampaignsView from './components/CampaignsView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';

function AppContent() {
  const { 
    currentAgent, 
    loading, 
    activeView, 
    activeConversation,
    filtersCollapsed,
    setFiltersCollapsed,
    contactCollapsed,
    setContactCollapsed
  } = useApp();

  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [impersonatingCompanyId, setImpersonatingCompanyId] = useState(() => localStorage.getItem('SUPERADMIN_ORIGINAL_COMPANY_ID'));

  // ── Offline/Reconnect detection ─────────────────────────────────
  const [offlineStatus, setOfflineStatus] = useState(null); // null | 'offline' | 'reconnected'
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    const handleOffline = () => {
      clearTimeout(reconnectTimerRef.current);
      setOfflineStatus('offline');
    };
    const handleOnline = () => {
      setOfflineStatus('reconnected');
      reconnectTimerRef.current = setTimeout(() => setOfflineStatus(null), 3500);
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    // Check initial state
    if (!navigator.onLine) setOfflineStatus('offline');
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  const handleExitImpersonation = useCallback(async () => {
    const originalCompanyId = localStorage.getItem('SUPERADMIN_ORIGINAL_COMPANY_ID');
    if (!originalCompanyId || !currentAgent) return;
    
    // Import getAdminSupabase to ignore RLS since we need to unset company_id
    const { getAdminSupabase } = await import('./supabase');
    const supabase = getAdminSupabase();
    
    try {
      const matchField = currentAgent.id ? 'id' : 'user_id';
      const matchValue = currentAgent.id || currentAgent.user_id;
      const targetCompany = originalCompanyId === '' ? null : originalCompanyId;

      const { error } = await supabase.from('agents').update({ company_id: targetCompany }).eq(matchField, matchValue);
      if (error) throw error;
      
      localStorage.removeItem('SUPERADMIN_ORIGINAL_COMPANY_ID');
      window.location.href = '/admin';
    } catch (err) {
      console.error('Erro ao sair do modo espião:', err);
      alert('Erro ao sair: ' + err.message);
    }
  }, [currentAgent]);

  // Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const [activeAnnouncements, setActiveAnnouncements] = useState([]);
  
  useEffect(() => {
    if (!currentAgent) return;
    const fetchAnnsAndTheme = async () => {
      const { getSupabase } = await import('./supabase');
      const supabase = getSupabase();
      if (!supabase) return;
      try {
        const { data, error } = await supabase.from('system_announcements').select('*').eq('is_active', true);
        if (!error && data) {
          setActiveAnnouncements(data);
        }
        
        // Fetch company theme
        if (currentAgent.company_id) {
          const { data: cData } = await supabase.from('companies').select('theme_color').eq('id', currentAgent.company_id).maybeSingle();
          if (cData && cData.theme_color) {
            document.documentElement.style.setProperty('--accent', cData.theme_color);
            // Derive a hover color by adding transparency or manipulating the hex
            document.documentElement.style.setProperty('--accent-hover', cData.theme_color + 'cc');
          } else {
            // Revert to default if no theme
            document.documentElement.style.removeProperty('--accent');
            document.documentElement.style.removeProperty('--accent-hover');
          }
        }
      } catch (err) {
        console.error('Failed to load announcements/theme', err);
      }
    };
    fetchAnnsAndTheme();
  }, [currentAgent]);

  const [isRegistering, setIsRegistering] = useState(false);

  // 1. Fullscreen Loading Shimmer
  if (loading) {
    return (
      <div id="loading-overlay" style={{ display: 'flex' }}>
        <div className="shimmer-card">
          <div className="logo-area" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '42px', height: '42px', background: 'var(--border)', borderRadius: '12px', animation: 'shimmer-pulse 1.5s infinite ease-in-out' }}></div>
            <div style={{ width: '120px', height: '24px', background: 'var(--border)', borderRadius: '6px', animation: 'shimmer-pulse 1.5s infinite ease-in-out' }}></div>
          </div>
          <div style={{ width: '320px', height: '16px', background: 'var(--border)', borderRadius: '4px', marginBottom: '12px', animation: 'shimmer-pulse 1.5s infinite ease-in-out' }}></div>
          <div style={{ width: '240px', height: '16px', background: 'var(--border)', borderRadius: '4px', animation: 'shimmer-pulse 1.5s infinite ease-in-out' }}></div>
        </div>
      </div>
    );
  }

  // Status Page pública — acessível sem autenticação
  if (window.location.pathname === '/status') {
    return <StatusPagePublic />;
  }

  // 2. Unauthenticated Login/Register Screen
  if (!currentAgent) {
    if (isRegistering) {
      return <Register onBackToLogin={() => setIsRegistering(false)} onRegisterSuccess={() => window.location.reload()} />;
    }
    return <Login onGoToRegister={() => setIsRegistering(true)} />;
  }

  // Intercept the /admin route for a standalone superadmin panel
  if (window.location.pathname === '/admin') {
    return (
      <div id="app-shell" style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <main id="view-container" style={{ flexGrow: 1, height: '100%', overflow: 'hidden', position: 'relative' }}>
          <SuperAdminView isStandalone={true} />
        </main>
      </div>
    );
  }

  // 3. Authenticated Application Shell Layout
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}>

      {/* Offline / Reconnect Banner */}
      {offlineStatus && (
        <div className={`offline-banner ${offlineStatus === 'reconnected' ? 'reconnected' : ''}`}>
          <div className="reconnect-dot" />
          {offlineStatus === 'offline'
            ? '⚠ Você está offline. Mensagens podem não ser entregues em tempo real.'
            : '✓ Conexão restabelecida!'}
        </div>
      )}

      {/* Global Top Banner for Announcements */}
      {impersonatingCompanyId && (
        <div style={{ background: 'var(--danger)', color: 'white', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: '13px', zIndex: 9999 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ animation: 'shimmer-pulse 2s infinite' }}>🔴</span>
            MODO ESPIÃO: Você está visualizando a conta de um cliente. Qualquer alteração feita aqui afetará a empresa em tempo real.
          </div>
          <button 
            onClick={handleExitImpersonation}
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
          >
            Sair e Voltar ao Admin
          </button>
        </div>
      )}

      {/* AVISOS GLOBAIS (BROADCAST) */}
      {activeAnnouncements.map(ann => {
        const bgColors = {
          info: '#3b82f6',
          warning: '#f59e0b',
          danger: '#ef4444',
          success: '#10b981'
        };
        const bg = bgColors[ann.type] || bgColors.info;
        return (
          <div key={ann.id} style={{ background: bg, color: 'white', padding: '10px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 600, fontSize: '13.5px', zIndex: 9998, textAlign: 'center' }}>
            {ann.message}
          </div>
        );
      })}

      <div id="app-shell" style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        
        {/* Col 1: Vertical Sidebar Navigation */}
      {(activeView !== 'superadmin' && !activeView?.startsWith('sa_')) && <SidebarNav onOpenSearch={() => setGlobalSearchOpen(true)} />}

      {/* Content Router Node */}
      <main id="view-container" style={{ flexGrow: 1, height: '100%', overflow: 'hidden', position: 'relative' }}>
        
        {activeView === 'conversations' ? (
          <div id="chat-layout" className={`layout-wrapper active ${activeConversation ? 'has-active-conv' : ''}`} style={{ display: 'flex', height: '100%', width: '100%' }}>
            {!filtersCollapsed && (
              <div className="mobile-backdrop" onClick={() => setFiltersCollapsed(true)} />
            )}
            {!contactCollapsed && (
              <div className="mobile-backdrop" onClick={() => setContactCollapsed(true)} />
            )}

            {/* Col Filters: Collapsible Filters Sidebar */}
            <FiltersSidebar />

            {/* Col 2: Conversations List Sidebar */}
            <ConversationList />

            {/* Col 3: Central Chat Window Area */}
            <ChatWindow />

            {/* Col 4: Contact Properties Drawer Panel */}
            <ContactPanel />
          </div>
        ) : (activeView === 'superadmin' || activeView?.startsWith('sa_')) ? (
          <div id="superadmin-layout" className="layout-wrapper active" style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
            <SuperAdminView />
          </div>
        ) : (
          <div id="generic-layout" className="layout-wrapper active" style={{ display: 'block', height: '100%', width: '100%', overflow: 'hidden' }}>
            <div id="generic-content" className="generic-view-panel" style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
              {activeView === 'dashboard' && <DashboardView />}
              {activeView === 'contacts' && <ContactsView />}
              {activeView === 'campaigns' && <CampaignsView />}
              {activeView === 'reports' && <ReportsView />}
              {activeView === 'settings' && <SettingsView />}
              {activeView === 'chatbot' && <ChatbotView />}
              {activeView === 'profile' && <ProfileView />}
              {activeView === 'csat' && <CsatView />}
            </div>
          </div>
        )}

      </main>

      {/* Global Search Modal (Ctrl+K) */}
      {globalSearchOpen && (
        <GlobalSearch onClose={() => setGlobalSearchOpen(false)} />
      )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
