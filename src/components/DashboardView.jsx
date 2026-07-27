import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { getSupabase } from '../supabase';
import {
  MessageSquare, Users, Clock, CheckCircle, TrendingUp,
  TrendingDown, AlertTriangle, Zap, Activity, ArrowUpRight,
  Circle, Wifi, WifiOff, BarChart3, Timer, Star
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, trend, color = 'var(--accent)', loading }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '20px',
      display: 'flex', flexDirection: 'column', gap: '12px',
      transition: 'all var(--transition)',
      cursor: 'default',
      position: 'relative', overflow: 'hidden'
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.25)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Top glow line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: 0.6 }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ background: `${color}18`, borderRadius: '10px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: trend >= 0 ? 'var(--success)' : 'var(--danger)', background: trend >= 0 ? 'var(--success-soft)' : 'var(--danger-soft)', padding: '3px 8px', borderRadius: '20px' }}>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      
      {loading ? (
        <div style={{ height: '32px', background: 'var(--border)', borderRadius: '6px', animation: 'shimmer-pulse 1.5s infinite' }} />
      ) : (
        <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>
          {value}
        </div>
      )}
      
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
      </div>
    </div>
  );
}

function AgentStatusRow({ agent }) {
  const statusColor = { online: 'var(--success)', away: 'var(--warning)', offline: 'var(--status-offline)' }[agent.status] || 'var(--status-offline)';
  const avatarUrl = agent.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(agent.name || 'agent')}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <img src={avatarUrl} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border)' }} alt="" />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '8px', height: '8px', borderRadius: '50%', background: statusColor, border: '1.5px solid var(--bg-secondary)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.name}</div>
        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{agent.status}</div>
      </div>
      <div style={{ fontSize: '10px', fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{agent.status}</div>
    </div>
  );
}

export default function DashboardView() {
  const { agents, conversations, currentAgent } = useApp();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    const supabase = getSupabase();
    if (!supabase) { setLoading(false); return; }

    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const [convRes, resolvedRes, pendingRes, msgRes] = await Promise.all([
        supabase.from('conversations').select('id, status, assigned_agent_id, created_at', { count: 'exact' }).eq('status', 'open'),
        supabase.from('conversations').select('id', { count: 'exact' }).eq('status', 'resolved').gte('updated_at', todayStart),
        supabase.from('conversations').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('messages').select('id', { count: 'exact' }).gte('created_at', todayStart).eq('sender_type', 'agent'),
      ]);

      const openConvs = convRes.count || 0;
      const unassigned = (convRes.data || []).filter(c => !c.assigned_agent_id).length;

      setMetrics({
        open: openConvs,
        resolved: resolvedRes.count || 0,
        pending: pendingRes.count || 0,
        unassigned,
        msgSent: msgRes.count || 0,
        onlineAgents: agents.filter(a => a.status === 'online').length,
        totalAgents: agents.length,
      });

      // Recent activity
      const { data: recent } = await supabase
        .from('conversations')
        .select('id, status, created_at, contact:contacts(name, phone), agent:agents(name)')
        .order('updated_at', { ascending: false })
        .limit(6);
      setRecentActivity(recent || []);
    } catch (err) {
      console.error('Dashboard metrics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onlineAgents = agents.filter(a => a.status === 'online');
  const awayAgents = agents.filter(a => a.status === 'away');
  const offlineAgents = agents.filter(a => a.status === 'offline');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div style={{ padding: '28px 32px', height: '100%', overflowY: 'auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px rgba(34,211,160,0.6)', animation: 'glowPulse 2s infinite' }} />
          <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Ao vivo</span>
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '4px' }}>
          {greeting}, {currentAgent?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>
          Visão geral do atendimento em tempo real — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={MessageSquare} label="Conversas Abertas" value={metrics?.open ?? '—'} sub="em atendimento agora" trend={undefined} color="var(--accent)" loading={loading} />
        <StatCard icon={AlertTriangle} label="Não Atribuídas" value={metrics?.unassigned ?? '—'} sub="aguardando agente" color="var(--warning)" loading={loading} />
        <StatCard icon={Clock} label="Pendentes" value={metrics?.pending ?? '—'} sub="aguardando resposta" color="var(--info)" loading={loading} />
        <StatCard icon={CheckCircle} label="Resolvidas Hoje" value={metrics?.resolved ?? '—'} sub="nas últimas 24h" trend={8} color="var(--success)" loading={loading} />
        <StatCard icon={Zap} label="Msgs Enviadas Hoje" value={metrics?.msgSent ?? '—'} sub="por agentes" color="var(--purple)" loading={loading} />
        <StatCard icon={Users} label="Agentes Online" value={`${metrics?.onlineAgents ?? 0}/${metrics?.totalAgents ?? 0}`} sub="disponíveis agora" color="var(--success)" loading={loading} />
      </div>

      {/* Bottom Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>

        {/* Recent Activity */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Atividade Recente</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {recentActivity.length === 0 && !loading ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px', fontSize: '13px' }}>
                Nenhuma atividade recente
              </div>
            ) : (
              recentActivity.map((conv, i) => (
                <div key={conv.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', borderBottom: i < recentActivity.length - 1 ? '1px solid var(--border-light)' : 'none', transition: 'background 140ms' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                    {(conv.contact?.name || conv.contact?.phone || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conv.contact?.name || conv.contact?.phone || 'Desconhecido'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {conv.agent ? `Atribuída a ${conv.agent.name}` : 'Não atribuída'}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <span style={{
                      fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                      padding: '3px 8px', borderRadius: '10px',
                      background: conv.status === 'open' ? 'var(--success-soft)' : conv.status === 'pending' ? 'var(--warning-soft)' : 'var(--accent-soft)',
                      color: conv.status === 'open' ? 'var(--success)' : conv.status === 'pending' ? 'var(--warning)' : 'var(--accent)',
                    }}>
                      {conv.status === 'open' ? 'Aberta' : conv.status === 'pending' ? 'Pendente' : conv.status === 'resolved' ? 'Resolvida' : conv.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Agent Status Panel */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Agentes</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--success)', background: 'var(--success-soft)', padding: '2px 7px', borderRadius: '10px' }}>{onlineAgents.length} online</span>
            </div>
          </div>
          <div style={{ padding: '12px 20px', maxHeight: '360px', overflowY: 'auto' }}>
            {onlineAgents.length > 0 && (
              <>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>Online</div>
                {onlineAgents.map(a => <AgentStatusRow key={a.id} agent={a} />)}
              </>
            )}
            {awayAgents.length > 0 && (
              <>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '12px', marginBottom: '4px' }}>Ocupado</div>
                {awayAgents.map(a => <AgentStatusRow key={a.id} agent={a} />)}
              </>
            )}
            {offlineAgents.length > 0 && (
              <>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '12px', marginBottom: '4px' }}>Offline</div>
                {offlineAgents.slice(0, 5).map(a => <AgentStatusRow key={a.id} agent={a} />)}
              </>
            )}
            {agents.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '12.5px' }}>Nenhum agente cadastrado</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
