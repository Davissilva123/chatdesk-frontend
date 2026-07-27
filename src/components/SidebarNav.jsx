import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { getSupabase } from '../supabase';
import { showToast } from '../utils';
import NotificationCenter from './NotificationCenter';
import { 
  MessageSquareCode, 
  MessageSquare, 
  Users, 
  PieChart, 
  Megaphone, 
  Settings, 
  Keyboard, 
  UserCog, 
  SunMoon, 
  LogOut, 
  X,
  Search,
  GitMerge,
  Crown,
  LayoutDashboard,
  Star
} from 'lucide-react';

export default function SidebarNav({ onOpenSearch }) {
  const { 
    currentAgent, 
    setCurrentAgent, 
    activeView, 
    setActiveView, 
    theme, 
    setTheme 
  } = useApp();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [autoOffline, setAutoOffline] = useState(
    localStorage.getItem('auto-offline-enabled') === 'true'
  );

  const avatarUrl = currentAgent?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentAgent?.name || 'agent')}`;
  const status = currentAgent?.status || 'offline';

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'd') { e.preventDefault(); setActiveView('dashboard'); }
        else if (key === 'c') { e.preventDefault(); setActiveView('conversations'); }
        else if (key === 'k') { e.preventDefault(); setActiveView('contacts'); }
        else if (key === 'r') { e.preventDefault(); setActiveView('reports'); }
        else if (key === 's') { e.preventDefault(); setActiveView('settings'); }
        else if (key === 'p') { e.preventDefault(); setActiveView('profile'); }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveView]);

  // Click outside listener for avatar status dropdown
  useEffect(() => {
    const closeDropdown = () => setShowDropdown(false);
    window.addEventListener('click', closeDropdown);
    return () => window.removeEventListener('click', closeDropdown);
  }, []);

  const handleStatusChange = async (nextStatus) => {
    const supabase = getSupabase();
    if (!supabase || !currentAgent) return;

    try {
      const { error } = await supabase
        .from('agents')
        .update({ status: nextStatus })
        .eq('id', currentAgent.id);

      if (error) {
        showToast('Erro ao atualizar status: ' + error.message, 'error');
      } else {
        setCurrentAgent(prev => ({ ...prev, status: nextStatus }));
        showToast(`Status alterado para ${nextStatus}!`, 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      if (currentAgent) {
        await supabase.from('agents').update({ status: 'offline' }).eq('id', currentAgent.id);
      }
      await supabase.auth.signOut();
      localStorage.removeItem('supabase.auth.token');
      window.location.href = '/login';
    } catch (err) {
      console.error('Erro ao efetuar logout:', err);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleAutoOffline = () => {
    const nextVal = !autoOffline;
    setAutoOffline(nextVal);
    localStorage.setItem('auto-offline-enabled', nextVal);
  };

  return (
    <>
      <aside id="sidebar-nav">
        {/* Top Area: Logo + Nav Items */}
        <div className="sidebar-top">
          <div className="sidebar-logo" title="ChatDesk logo" style={{ color: 'var(--accent)' }}>
            <MessageSquareCode size={24} />
          </div>

          {/* Chatdesk functions: Hidden for Super Admin */}
          {!(currentAgent?.role === 'superadmin' || currentAgent?.email === 'sdavi6790@gmail.com') && (
            <>
              <button
                onClick={() => setActiveView('dashboard')}
                className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                title="Dashboard"
              >
                <LayoutDashboard size={20} />
              </button>

              <button 
                onClick={() => setActiveView('conversations')} 
                className={`nav-item ${activeView === 'conversations' ? 'active' : ''}`} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                title="Conversas"
              >
                <MessageSquare size={20} />
              </button>

              <button 
                onClick={() => setActiveView('contacts')} 
                className={`nav-item ${activeView === 'contacts' ? 'active' : ''}`} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                title="Contatos"
              >
                <Users size={20} />
              </button>

              {['admin'].includes(currentAgent?.role) ? (
                <>
                  <button 
                    onClick={() => setActiveView('reports')} 
                    className={`nav-item ${activeView === 'reports' ? 'active' : ''}`} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                    title="Relatórios"
                  >
                    <PieChart size={20} />
                  </button>

                  <button 
                    onClick={() => setActiveView('campaigns')} 
                    className={`nav-item ${activeView === 'campaigns' ? 'active' : ''}`} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                    title="Campanhas"
                  >
                    <Megaphone size={20} />
                  </button>

                  <button 
                    onClick={() => setActiveView('chatbot')} 
                    className={`nav-item ${activeView === 'chatbot' ? 'active' : ''}`} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                    title="Chatbot / Fluxos"
                  >
                    <GitMerge size={20} />
                  </button>

                  <button
                    onClick={() => setActiveView('csat')}
                    className={`nav-item ${activeView === 'csat' ? 'active' : ''}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                    title="CSAT — Satisfação"
                  >
                    <Star size={20} />
                  </button>

                  <button 
                    onClick={() => setActiveView('settings')} 
                    className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                    title="Configurações"
                  >
                    <Settings size={20} />
                  </button>
                </>
              ) : null}
            </>
          )}

          {/* SuperAdmin: só para o dono do produto */}
          {(currentAgent?.role === 'superadmin' || currentAgent?.email === 'sdavi6790@gmail.com') && (
            <button 
              onClick={() => setActiveView('superadmin')} 
              className={`nav-item ${activeView === 'superadmin' ? 'active' : ''}`} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', position: 'relative' }}
              title="Painel SuperAdmin"
            >
              <Crown size={22} />
            </button>

          )}

          {/* Global Search Button */}
          <button
            onClick={onOpenSearch}
            className="nav-item"
            style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: 'auto' }}
            title="Busca Global (Ctrl+K)"
          >
            <Search size={20} />
          </button>

          {/* Notification Center */}
          {!(currentAgent?.role === 'superadmin' || currentAgent?.email === 'sdavi6790@gmail.com') && (
            <NotificationCenter onNavigateToConversation={(convId) => { setActiveView('conversations'); }} />
          )}
        </div>

        {/* bottom Area: Profile Avatar & Status Dropdown */}
        <div 
          className="sidebar-avatar-wrapper" 
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown(!showDropdown);
          }}
          style={{ cursor: 'pointer' }}
        >
          <img src={avatarUrl} alt="Avatar do agente" className="sidebar-avatar" />
          <div className={`sidebar-avatar-status ${status}`}></div>

          {/* Status Dropdown */}
          <div 
            className={`avatar-dropdown ${showDropdown ? 'active' : ''}`} 
            style={{ 
              width: '220px', 
              padding: '12px', 
              borderRadius: '12px', 
              bottom: '0', 
              left: '54px', 
              zIndex: 600,
              display: showDropdown ? 'block' : 'none'
            }}
          >
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 8px 8px 8px' }}>Defina como</div>
            
            <div className="avatar-dropdown-item" onClick={() => handleStatusChange('online')} style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: 'var(--status-online)', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' }}></span>
              Online
            </div>
            <div className="avatar-dropdown-item" onClick={() => handleStatusChange('away')} style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: 'var(--status-away)', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' }}></span>
              Ocupado
            </div>
            <div className="avatar-dropdown-item" onClick={() => handleStatusChange('offline')} style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: 'var(--status-offline)', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' }}></span>
              Offline
            </div>

            <hr style={{ borderColor: 'var(--border)', margin: '8px 0' }} />

            {/* Auto Offline Toggle */}
            <div 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', fontSize: '13px', color: 'var(--text-secondary)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span>Marcar offline</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>automaticamente</span>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={autoOffline} 
                  onChange={toggleAutoOffline} 
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <hr style={{ borderColor: 'var(--border)', margin: '8px 0' }} />

            <div className="avatar-dropdown-item" onClick={() => setShowShortcuts(true)} style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Keyboard size={14} />
              Atalhos do teclado
            </div>
            <div className="avatar-dropdown-item" onClick={() => setActiveView('profile')} style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCog size={14} />
              Configurações do Perfil
            </div>
            <div className="avatar-dropdown-item" onClick={toggleTheme} style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SunMoon size={14} />
              Alterar Tema
            </div>

            <hr style={{ borderColor: 'var(--border)', margin: '8px 0' }} />

            <div className="avatar-dropdown-item" onClick={handleLogout} style={{ color: 'var(--danger)', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LogOut size={14} />
              Encerra sessão
            </div>
          </div>
        </div>
      </aside>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: '400px', width: '100%' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Keyboard size={20} style={{ color: 'var(--accent)' }} />
                Atalhos do Teclado
              </h3>
              <button className="modal-close" onClick={() => setShowShortcuts(false)}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0', color: 'var(--text-primary)' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginbottom: '8px' }}>Utilize os atalhos abaixo para navegar rapidamente pela plataforma:</p>
              
              <div style={{ display: 'flex', justifyScontent: 'space-between', justifyContent: 'space-between', alignItems: 'center', borderbottom: '1px solid var(--border-light)', paddingbottom: '8px' }}>
                <span style={{ fontSize: '13px' }}>Ir para Conversas</span>
                <kbd style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600 }}>Alt + C</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderbottom: '1px solid var(--border-light)', paddingbottom: '8px' }}>
                <span style={{ fontSize: '13px' }}>Ir para Contatos</span>
                <kbd style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600 }}>Alt + K</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderbottom: '1px solid var(--border-light)', paddingbottom: '8px' }}>
                <span style={{ fontSize: '13px' }}>Ir para Relatórios</span>
                <kbd style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600 }}>Alt + R</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px' }}>Ir para Dashboard</span>
                <kbd style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600 }}>Alt + D</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px' }}>Ir para Configurações</span>
                <kbd style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600 }}>Alt + S</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px' }}>Perfil do Agente</span>
                <kbd style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600 }}>Alt + P</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px' }}>Respostas Rápidas / Prontas</span>
                <kbd style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600 }}>/</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px' }}>Busca Global</span>
                <kbd style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600 }}>Ctrl + K</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px' }}>Fechar modal / Limpar chat ativo</span>
                <kbd style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600 }}>Esc</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
