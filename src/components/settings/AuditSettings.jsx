import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../supabase';
import { formatDateTime } from '../../utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AuditSettings() {
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const itemsPerPage = 20;

  // Load agents list for the dropdown filter
  useEffect(() => {
    async function fetchAgents() {
      const supabase = getSupabase();
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .order('name', { ascending: true });
        
        if (error) throw error;
        setAgents(data || []);
      } catch (err) {
        console.error('Erro ao carregar agentes para auditoria:', err);
      }
    }
    fetchAgents();
  }, []);

  // Fetch audit logs
  useEffect(() => {
    async function fetchAuditLogs() {
      const supabase = getSupabase();
      if (!supabase) return;

      setLoading(true);
      try {
        const startRange = (activePage - 1) * itemsPerPage;
        const endRange = startRange + itemsPerPage - 1;

        let query = supabase
          .from('audit_logs')
          .select(`
            *,
            agent:agents(*)
          `, { count: 'exact' });

        if (selectedAgentId) {
          query = query.eq('agent_id', selectedAgentId);
        }

        query = query
          .order('created_at', { ascending: false })
          .range(startRange, endRange);

        const { data, error, count } = await query;
        if (error) throw error;

        setLogs(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Erro ao buscar logs de auditoria:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAuditLogs();
  }, [selectedAgentId, activePage]);

  const handleAgentFilterChange = (e) => {
    setSelectedAgentId(e.target.value);
    setActivePage(1);
  };

  const handlePrevPage = () => {
    if (activePage > 1) {
      setActivePage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    const maxPage = Math.ceil(totalCount / itemsPerPage);
    if (activePage < maxPage) {
      setActivePage(prev => prev + 1);
    }
  };

  const maxPage = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Logs de Auditoria</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Monitore as ações executadas pelos agentes na plataforma</p>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="form-field" style={{ marginBottom: 0, width: '220px' }}>
          <label style={{ fontSize: '10px', marginBottom: '4px' }}>Filtrar por Agente</label>
          <select 
            id="audit-agent-filter" 
            value={selectedAgentId}
            onChange={handleAgentFilterChange}
            style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
          >
            <option value="">Todos os Agentes</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', marginBottom: '20px' }}>
        <table className="ui-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600', width: '160px' }}>Data/Hora</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600', width: '180px' }}>Agente</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600', width: '160px' }}>Ação</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600', width: '120px' }}>Entidade</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Buscando registros...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Nenhum log encontrado.
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-primary)' }}>
                    {formatDateTime(log.created_at)}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '500' }}>
                    {log.agent?.name || 'Sistema'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-hover)', color: 'var(--text-secondary)', fontWeight: '600' }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {log.entity_type}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {log.details || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Total: {totalCount} logs (Página {activePage} de {maxPage})
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn-cancel" 
            onClick={handlePrevPage}
            disabled={activePage === 1}
            style={{ fontSize: '11px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            <ChevronLeft size={12} /> Anterior
          </button>
          <button 
            className="btn-cancel" 
            onClick={handleNextPage}
            disabled={activePage >= maxPage}
            style={{ fontSize: '11px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            Próximo <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
