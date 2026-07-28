import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { getSupabase } from '../supabase';
import { Bell, X, Check, CheckCheck, MessageSquare, UserPlus, AlertTriangle, Clock, Zap } from 'lucide-react';

const NOTIF_ICONS = {
  new_conv: { icon: MessageSquare, color: 'var(--accent)' },
  assigned: { icon: UserPlus, color: 'var(--success)' },
  sla_breach: { icon: AlertTriangle, color: 'var(--danger)' },
  mention: { icon: Zap, color: 'var(--warning)' },
};

function NotifItem({ notif, onMarkRead, onClick }) {
  const cfg = NOTIF_ICONS[notif.type] || { icon: Bell, color: 'var(--accent)' };
  const Icon = cfg.icon;
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'agora';
    if (m < 60) return `${m}min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  return (
    <div
      onClick={() => { onClick(notif); onMarkRead(notif.id); }}
      style={{
        display: 'flex', gap: '11px', padding: '12px 16px',
        background: notif.read ? 'transparent' : 'rgba(124,111,247,0.04)',
        borderBottom: '1px solid var(--border-light)',
        cursor: 'pointer', transition: 'background 140ms',
        borderLeft: notif.read ? 'none' : '2px solid var(--accent)',
        paddingLeft: notif.read ? '16px' : '14px',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(124,111,247,0.04)'}
    >
      <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: `${cfg.color}15`, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12.5px', fontWeight: notif.read ? 500 : 600, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {notif.message}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          {timeAgo(notif.created_at)}
        </div>
      </div>
      {!notif.read && (
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: '4px', boxShadow: '0 0 6px var(--accent-glow)', animation: 'glowPulse 2s infinite' }} />
      )}
    </div>
  );
}

export default function NotificationCenter({ onNavigateToConversation }) {
  const { currentAgent, notifications, setNotifications } = useApp();
  const [open, setOpen] = useState(false);
  const [localNotifs, setLocalNotifs] = useState([]);
  const panelRef = useRef(null);

  const unreadCount = localNotifs.filter(n => !n.read).length;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Subscribe to Supabase realtime notifications
  useEffect(() => {
    if (!currentAgent?.id) return;
    const supabase = getSupabase();
    if (!supabase) return;

    // Load existing notifications
    supabase.from('notifications')
      .select('*')
      .eq('agent_id', currentAgent.id)
      .order('created_at', { ascending: false })
      .limit(40)
      .then(({ data }) => setLocalNotifs(data || []));

    // Realtime
    const channel = supabase
      .channel('notifications-' + currentAgent.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `agent_id=eq.${currentAgent.id}` },
        (payload) => {
          setLocalNotifs(prev => [payload.new, ...prev]);
        })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentAgent?.id]);

  // Also listen to local notifications injected by app context
  useEffect(() => {
    if (notifications?.length) {
      setLocalNotifs(prev => {
        const ids = new Set(prev.map(n => n.id));
        const newOnes = notifications.filter(n => !ids.has(n.id));
        return newOnes.length ? [...newOnes, ...prev] : prev;
      });
    }
  }, [notifications]);

  const markRead = async (id) => {
    setLocalNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const supabase = getSupabase();
    if (supabase && id && typeof id === 'number') {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    }
  };

  const markAllRead = async () => {
    setLocalNotifs(prev => prev.map(n => ({ ...n, read: true })));
    const supabase = getSupabase();
    if (supabase && currentAgent?.id) {
      await supabase.from('notifications').update({ read: true }).eq('agent_id', currentAgent.id);
    }
  };

  const handleNotifClick = (notif) => {
    if (notif.conversation_id && onNavigateToConversation) {
      onNavigateToConversation(notif.conversation_id);
    }
    setOpen(false);
  };

  // Inject synthetic local notifications from conversations (new assignments)
  const displayNotifs = localNotifs.length > 0 ? localNotifs : [
    // Placeholder if no DB table exists
  ];

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        title="Notificações"
        onClick={() => setOpen(o => !o)}
        className="nav-item"
        style={{ position: 'relative' }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute', top: '3px', right: '3px',
            width: '16px', height: '16px', borderRadius: '50%',
            background: 'var(--danger)', color: 'white',
            fontSize: '8px', fontWeight: 800, fontFamily: 'monospace',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid var(--bg-primary)',
            animation: unreadCount > 0 ? 'badgePulse 2s infinite' : 'none'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', left: '48px', bottom: '0',
          width: '320px', maxHeight: '480px',
          background: 'var(--bg-elevated)', backdropFilter: 'blur(40px)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', zIndex: 9999,
          animation: 'slideDown 160ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={15} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Notificações</span>
              {unreadCount > 0 && (
                <span style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '9.5px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px' }}>
                  {unreadCount} novas
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} title="Marcar todas como lidas" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                  <CheckCheck size={14} />
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {displayNotifs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                <Bell size={28} style={{ opacity: 0.2, marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                <div style={{ fontSize: '13px' }}>Nenhuma notificação</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>Você está em dia! ✅</div>
              </div>
            ) : (
              displayNotifs.map(n => (
                <NotifItem key={n.id} notif={n} onMarkRead={markRead} onClick={handleNotifClick} />
              ))
            )}
          </div>

          {/* Footer */}
          {displayNotifs.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Apenas as últimas 40 notificações</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper: push a local notification (called from anywhere in the app)
export function pushLocalNotification(setNotifications, { id, type, message, conversation_id }) {
  const notif = {
    id: id || Date.now(),
    type,
    message,
    conversation_id,
    read: false,
    created_at: new Date().toISOString(),
  };
  setNotifications(prev => [notif, ...(prev || [])]);
}
