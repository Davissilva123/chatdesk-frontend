import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { getSupabase } from '../supabase';
import { showToast } from '../utils';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  ShieldCheck,
  Download,
  Filter
} from 'lucide-react';

export default function ReportsView() {
  const { agents, inboxes, slaPolicy } = useApp();

  const [period, setPeriod] = useState('month'); // today | week | month | 30d | custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [filterAgentId, setFilterAgentId] = useState('');
  const [filterInboxId, setFilterInboxId] = useState('');

  const [metrics, setMetrics] = useState({
    totalConversations: 0,
    avgResponseStr: '0s',
    avgResolutionStr: '0s',
    slaPercentageStr: '100%'
  });

  const [agentMetrics, setAgentMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  // References for Chart Canvas and Instances
  const volumeCanvasRef = useRef(null);
  const channelsCanvasRef = useRef(null);
  const volumeChartInstanceRef = useRef(null);
  const channelsChartInstanceRef = useRef(null);

  // Compute start/end dates for selected period
  const getDateRange = () => {
    const now = new Date();
    let start, end;
    end = new Date(now);
    end.setHours(23, 59, 59, 999);

    if (period === 'today') {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === '30d') {
      start = new Date(now);
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'custom' && customStart && customEnd) {
      start = new Date(customStart + 'T00:00:00');
      end = new Date(customEnd + 'T23:59:59');
    } else {
      // default: last 30 days
      start = new Date(now);
      start.setDate(now.getDate() - 30);
    }
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const fetchReportsData = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      showToast('Supabase não configurado.', 'warning');
      setLoading(false);
      return;
    }

    setLoading(true);
    const { start, end } = getDateRange();
    try {
      // 1. Fetch conversations with date filter
      let convQuery = supabase
        .from('conversations')
        .select('id, created_at, status, inbox_id, last_message_at, assigned_agent_id')
        .gte('created_at', start)
        .lte('created_at', end);

      if (filterAgentId) convQuery = convQuery.eq('assigned_agent_id', filterAgentId);
      if (filterInboxId) convQuery = convQuery.eq('inbox_id', filterInboxId);

      const { data: conversations, error: convError } = await convQuery;
      if (convError) throw convError;

      // 2. Fetch inboxes
      const { data: inboxesData, error: inboxesError } = await supabase
        .from('inboxes')
        .select('id, name, channel_type');

      if (inboxesError) throw inboxesError;

      // 3. Fetch agent messages for average response time (filtered by date)
      const { data: agentMessages, error: msgError } = await supabase
        .from('messages')
        .select('conversation_id, created_at, sender_id')
        .eq('sender_type', 'agent')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;

      // 4. Fetch messages from the selected period for the chart
      const { data: recentMessages, error: recentMsgsError } = await supabase
        .from('messages')
        .select('created_at, sender_type')
        .gte('created_at', start)
        .lte('created_at', end);

      if (recentMsgsError) throw recentMsgsError;

      // --- Process Dashboard Metrics ---
      const totalConvs = conversations ? conversations.length : 0;

      // Map first response of an agent per conversation
      const firstAgentResponseMap = {};
      if (agentMessages) {
        agentMessages.forEach(msg => {
          if (!firstAgentResponseMap[msg.conversation_id]) {
            firstAgentResponseMap[msg.conversation_id] = new Date(msg.created_at).getTime();
          }
        });
      }

      let totalResponseTimeMs = 0;
      let respondedCount = 0;
      let slaMetCount = 0; // SLA = response within policy time
      const slaLimitMs = (slaPolicy?.first_response_minutes || 30) * 60000;

      if (conversations) {
        conversations.forEach(conv => {
          const firstResponseTime = firstAgentResponseMap[conv.id];
          if (firstResponseTime) {
            const convCreatedAt = new Date(conv.created_at).getTime();
            const diffMs = firstResponseTime - convCreatedAt;
            if (diffMs > 0) {
              totalResponseTimeMs += diffMs;
              respondedCount++;
              if (diffMs <= slaLimitMs) {
                slaMetCount++;
              }
            }
          }
        });
      }

      let avgResponseStr = '0s';
      if (respondedCount > 0) {
        const avgSecs = Math.round((totalResponseTimeMs / respondedCount) / 1000);
        const mins = Math.floor(avgSecs / 60);
        const secs = avgSecs % 60;
        avgResponseStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      }

      // Calculate Average Resolution Time
      let totalResolutionTimeMs = 0;
      let resolvedCount = 0;
      if (conversations) {
        conversations.forEach(c => {
          if (c.status === 'resolved' && c.last_message_at) {
            const createdAt = new Date(c.created_at).getTime();
            const resolvedAt = new Date(c.last_message_at).getTime();
            const diffMs = resolvedAt - createdAt;
            if (diffMs > 0) {
              totalResolutionTimeMs += diffMs;
              resolvedCount++;
            }
          }
        });
      }

      let avgResolutionStr = '0s';
      if (resolvedCount > 0) {
        const avgSecs = Math.round((totalResolutionTimeMs / resolvedCount) / 1000);
        const hours = Math.floor(avgSecs / 3600);
        const mins = Math.floor((avgSecs % 3600) / 60);
        const secs = avgSecs % 60;
        if (hours > 0) {
          avgResolutionStr = `${hours}h ${mins}m`;
        } else if (mins > 0) {
          avgResolutionStr = `${mins}m ${secs}s`;
        } else {
          avgResolutionStr = `${secs}s`;
        }
      }

      let slaPercentageStr = '100%';
      if (respondedCount > 0) {
        slaPercentageStr = `${((slaMetCount / respondedCount) * 100).toFixed(1)}%`;
      }

      setMetrics({
        totalConversations: totalConvs,
        avgResponseStr,
        avgResolutionStr,
        slaPercentageStr
      });

      // --- Process Agent Performance Metrics ---
      const agentRows = agents.map(agent => {
        const agentConvs = conversations ? conversations.filter(c => c.assigned_agent_id === agent.id) : [];
        const totalAgentConvs = agentConvs.length;
        const resolvedAgentConvs = agentConvs.filter(c => c.status === 'resolved').length;

        // Individual TMR
        let agentRespTimeMs = 0;
        let agentRespondedCount = 0;

        agentConvs.forEach(c => {
          const firstResp = agentMessages ? agentMessages.find(m => m.conversation_id === c.id && m.sender_id === agent.id) : null;
          if (firstResp) {
            const diff = new Date(firstResp.created_at).getTime() - new Date(c.created_at).getTime();
            if (diff > 0) {
              agentRespTimeMs += diff;
              agentRespondedCount++;
            }
          }
        });

        let agentTmrStr = '-';
        if (agentRespondedCount > 0) {
          const avgSecs = Math.round((agentRespTimeMs / agentRespondedCount) / 1000);
          const mins = Math.floor(avgSecs / 60);
          const secs = avgSecs % 60;
          agentTmrStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        }

        return {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          role: agent.role,
          avatarUrl: agent.avatar_url,
          totalConversations: totalAgentConvs,
          resolvedConversations: resolvedAgentConvs,
          tmr: agentTmrStr
        };
      });

      setAgentMetrics(agentRows);

      // --- Process Chart Visualizations ---
      const inboxTypes = {};
      if (inboxesData) {
        inboxesData.forEach(i => {
          inboxTypes[i.id] = i.channel_type || 'whatsapp';
        });
      }

      let whatsappCount = 0;
      let emailCount = 0;
      let webchatCount = 0;

      if (conversations) {
        conversations.forEach(c => {
          const type = inboxTypes[c.inbox_id] || 'whatsapp';
          if (type === 'whatsapp') whatsappCount++;
          else if (type === 'email') emailCount++;
          else webchatCount++;
        });
      }

      // Last 7 days days list
      const days = [];
      const incomingData = [0, 0, 0, 0, 0, 0, 0];
      const outgoingData = [0, 0, 0, 0, 0, 0, 0];
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({
          dateString: d.toISOString().split('T')[0],
          label: dayNames[d.getDay()]
        });
      }

      if (recentMessages) {
        recentMessages.forEach(msg => {
          if (!msg.created_at) return;
          const datePart = msg.created_at.split('T')[0];
          const idx = days.findIndex(day => day.dateString === datePart);
          if (idx !== -1) {
            if (msg.sender_type === 'contact') {
              incomingData[idx]++;
            } else if (msg.sender_type === 'agent') {
              outgoingData[idx]++;
            }
          }
        });
      }

      // Render Charts
      if (window.Chart) {
        // Destroy old volume chart
        if (volumeChartInstanceRef.current) {
          volumeChartInstanceRef.current.destroy();
        }
        // Destroy old channels chart
        if (channelsChartInstanceRef.current) {
          channelsChartInstanceRef.current.destroy();
        }

        // Line Chart (Message Volume)
        if (volumeCanvasRef.current) {
          const ctxVol = volumeCanvasRef.current.getContext('2d');
          volumeChartInstanceRef.current = new window.Chart(ctxVol, {
            type: 'line',
            data: {
              labels: days.map(d => d.label),
              datasets: [{
                label: 'Mensagens Recebidas',
                data: incomingData,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4
              }, {
                label: 'Mensagens Enviadas',
                data: outgoingData,
                borderColor: '#38bdf8',
                backgroundColor: 'transparent',
                tension: 0.4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { labels: { color: '#94a3b8' } } },
              scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
              }
            }
          });
        }

        // Doughnut Chart (Channels)
        if (channelsCanvasRef.current) {
          const ctxChan = channelsCanvasRef.current.getContext('2d');
          channelsChartInstanceRef.current = new window.Chart(ctxChan, {
            type: 'doughnut',
            data: {
              labels: ['WhatsApp', 'E-mail', 'Chat Web'],
              datasets: [{
                data: [whatsappCount, emailCount, webchatCount],
                backgroundColor: ['#22c55e', '#ef4444', '#6366f1'],
                borderWidth: 0
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } }
            }
          });
        }
      }
    } catch (err) {
      console.error('Erro ao processar relatórios:', err);
      showToast('Erro ao carregar dados do relatório.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();

    return () => {
      if (volumeChartInstanceRef.current) {
        volumeChartInstanceRef.current.destroy();
      }
      if (channelsChartInstanceRef.current) {
        channelsChartInstanceRef.current.destroy();
      }
    };
  }, [agents, period, customStart, customEnd, filterAgentId, filterInboxId]);

  // CSV Export
  const handleExportCSV = () => {
    const rows = [
      ['Agente', 'Total de Conversas', 'Resolvidas', 'TMR'],
      ...agentMetrics.map(a => [a.name, a.totalConversations, a.resolvedConversations, a.tmr])
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_chatdesk_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('CSV exportado!', 'success');
  };
  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Relatórios e Desempenho</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Métricas de atendimento, conversões e SLAs do time</p>
        </div>
        <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', color: 'var(--success)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {/* Filter Bar */}
      <div className="reports-filter-bar">
        <Filter size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        {[['today','Hoje'],['week','Esta semana'],['month','Este mês'],['30d','Últimos 30 dias'],['custom','Personalizado']].map(([val, label]) => (
          <button key={val} className={`period-btn ${period === val ? 'active' : ''}`} onClick={() => setPeriod(val)}>{label}</button>
        ))}
        {period === 'custom' && (
          <>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              style={{ padding: '4px 8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>até</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              style={{ padding: '4px 8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }} />
          </>
        )}
        <select value={filterAgentId} onChange={e => setFilterAgentId(e.target.value)}
          style={{ padding: '4px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}>
          <option value="">Todos os agentes</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={filterInboxId} onChange={e => setFilterInboxId(e.target.value)}
          style={{ padding: '4px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}>
          <option value="">Todas as inboxes</option>
          {inboxes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>

      {/* Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="info-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div>
            <span className="info-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total de Atendimentos</span>
            <span className="info-value" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent)', display: 'block', marginTop: '4px' }}>
              {loading ? '...' : metrics.totalConversations}
            </span>
          </div>
          <MessageSquare size={24} style={{ color: 'var(--accent)', opacity: 0.8 }} />
        </div>
        
        <div className="info-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div>
            <span className="info-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Média de Resposta (TMR)</span>
            <span className="info-value" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--success)', display: 'block', marginTop: '4px' }}>
              {loading ? '...' : metrics.avgResponseStr}
            </span>
          </div>
          <Clock size={24} style={{ color: 'var(--success)', opacity: 0.8 }} />
        </div>

        <div className="info-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifySpaceBetween: 'space-between', justifyContent: 'space-between', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div>
            <span className="info-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Média de Resolução</span>
            <span className="info-value" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--warning)', display: 'block', marginTop: '4px' }}>
              {loading ? '...' : metrics.avgResolutionStr}
            </span>
          </div>
          <CheckCircle size={24} style={{ color: 'var(--warning)', opacity: 0.8 }} />
        </div>

        <div className="info-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div>
            <span className="info-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Políticas de SLA Cumpridas</span>
            <span className="info-value" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--info)', display: 'block', marginTop: '4px' }}>
              {loading ? '...' : metrics.slaPercentageStr}
            </span>
          </div>
          <ShieldCheck size={24} style={{ color: 'var(--info)', opacity: 0.8 }} />
        </div>
      </div>

      {/* Visualizations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div className="info-card" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <h4 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>Volume de Mensagens por Dia</h4>
          <div style={{ height: '300px', position: 'relative' }}>
            <canvas ref={volumeCanvasRef}></canvas>
          </div>
        </div>
        <div className="info-card" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <h4 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>Canais de Entrada</h4>
          <div style={{ height: '300px', position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <canvas ref={channelsCanvasRef}></canvas>
          </div>
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="info-card" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: 'var(--text-primary)', fontSize: '16px', margin: 0 }}>Desempenho dos Agentes</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 0 0' }}>Métricas individuais dos integrantes da equipe</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="ui-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Agente</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Função</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Conversas Atribuídas</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Conversas Resolvidas</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>TMR Individual</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                    Carregando métricas individuais...
                  </td>
                </tr>
              ) : agentMetrics.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                    Nenhum agente cadastrado.
                  </td>
                </tr>
              ) : (
                agentMetrics.map(item => {
                  const roleLabels = { admin: 'Administrador', agent: 'Agente', supervisor: 'Supervisor' };
                  const roleStr = roleLabels[item.role] || item.role;
                  const initial = (item.name || item.email || 'A').substring(0, 1).toUpperCase();

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="contact-avatar-big" style={{ width: '28px', height: '28px', fontSize: '11px', margin: 0, lineHeight: '28px' }}>
                          {item.avatarUrl ? (
                            <img src={item.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="Agent avatar" />
                          ) : (
                            initial
                          )}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{item.name}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>{roleStr}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{item.totalConversations}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 500, color: 'var(--success)' }}>{item.resolvedConversations}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent)', fontWeight: 600 }}>{item.tmr}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
