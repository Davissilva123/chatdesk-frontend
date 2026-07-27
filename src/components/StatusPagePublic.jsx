import React, { useEffect, useState } from 'react';

// Página pública de status — acessível em /status sem login
export default function StatusPagePublic() {
  const [components, setComponents] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { getSupabase } = await import('../supabase');
        const sb = getSupabase();
        if (!sb) return;

        const [{ data: comps }, { data: incs }] = await Promise.all([
          sb.from('status_components').select('*').order('sort_order', { ascending: true }),
          sb.from('status_incidents').select('*').order('created_at', { ascending: false }).limit(10),
        ]);

        if (comps) setComponents(comps);
        if (incs) setIncidents(incs);
      } catch (e) {
        console.error('StatusPage error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const STATUS_MAP = {
    operational: { label: 'Operacional', color: '#10b981', bg: 'rgba(16,185,129,.12)', dot: '#10b981' },
    degraded:    { label: 'Degradado',   color: '#f59e0b', bg: 'rgba(245,158,11,.12)', dot: '#f59e0b' },
    outage:      { label: 'Fora do Ar',  color: '#ef4444', bg: 'rgba(239,68,68,.12)',  dot: '#ef4444' },
    maintenance: { label: 'Manutenção',  color: '#6366f1', bg: 'rgba(99,102,241,.12)', dot: '#6366f1' },
  };

  const SEV_MAP = {
    minor:    { label: 'Menor',   color: '#6b7280' },
    major:    { label: 'Maior',   color: '#f59e0b' },
    critical: { label: 'Crítico', color: '#ef4444' },
  };

  const ST_MAP = {
    investigating: { label: 'Investigando', color: '#ef4444' },
    identified:    { label: 'Identificado', color: '#f59e0b' },
    monitoring:    { label: 'Monitorando',  color: '#6366f1' },
    resolved:      { label: 'Resolvido',    color: '#10b981' },
  };

  const overall = components.length > 0
    ? components.some(c => c.status === 'outage') ? 'outage'
    : components.some(c => c.status === 'degraded') ? 'degraded'
    : 'operational'
    : 'operational';

  const overallInfo = STATUS_MAP[overall];
  const openIncidents = incidents.filter(i => i.status !== 'resolved');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#0a0d1a 0%,#060810 100%)',
      color: '#e2e8f0',
      fontFamily: "'Inter','Segoe UI',sans-serif",
    }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,.06)',
        background: 'rgba(255,255,255,.02)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(99,102,241,.4)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '.3px' }}>ChatDesk</p>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Status dos Serviços</p>
            </div>
          </div>
          <a href="/" style={{ fontSize: '13px', color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>← Voltar ao App</a>
        </div>
      </header>

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(99,102,241,.2)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}/>
            <p>Carregando status...</p>
          </div>
        ) : (
          <>
            {/* Overall Status */}
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '12px 24px', borderRadius: '100px', background: overallInfo.bg, border: `1px solid ${overallInfo.color}40`, marginBottom: '16px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: overallInfo.dot, animation: overall !== 'operational' ? 'pulse 2s infinite' : 'none' }}/>
                <span style={{ fontSize: '15px', fontWeight: 700, color: overallInfo.color }}>{overallInfo.label}</span>
              </div>
              <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: '#f1f5f9' }}>
                {overall === 'operational' ? 'Todos os sistemas operacionais' : overall === 'degraded' ? 'Degradação parcial detectada' : 'Incidente em andamento'}
              </h1>
              <p style={{ margin: '10px 0 0', fontSize: '14px', color: '#64748b' }}>
                Última atualização: {new Date().toLocaleString('pt-BR')}
              </p>
            </div>

            {/* Active incidents */}
            {openIncidents.length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: '#ef4444' }}>Incidentes Ativos</h2>
                {openIncidents.map(inc => {
                  const sev = SEV_MAP[inc.severity] || SEV_MAP.minor;
                  const st = ST_MAP[inc.status] || ST_MAP.investigating;
                  return (
                    <div key={inc.id} style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '12px', padding: '18px 20px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>{inc.title}</p>
                          {inc.description && <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>{inc.description}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '4px 9px', borderRadius: '20px', background: `${sev.color}18`, color: sev.color, textTransform: 'uppercase' }}>{sev.label}</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '4px 9px', borderRadius: '20px', background: `${st.color}18`, color: st.color, textTransform: 'uppercase' }}>{st.label}</span>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '11px', color: '#475569' }}>{new Date(inc.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Components */}
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: '#64748b' }}>Componentes</h2>
              <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '14px', overflow: 'hidden' }}>
                {components.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#475569' }}>
                    <p>Nenhum componente configurado.</p>
                  </div>
                ) : components.map((comp, i) => {
                  const sm = STATUS_MAP[comp.status] || STATUS_MAP.operational;
                  return (
                    <div key={comp.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '16px 20px',
                      borderBottom: i < components.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none',
                    }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{comp.name}</p>
                        {comp.description && <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>{comp.description}</p>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sm.dot, animation: comp.status !== 'operational' ? 'pulse 2s infinite' : 'none' }}/>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: sm.color }}>{sm.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Past Incidents */}
            {incidents.filter(i => i.status === 'resolved').length > 0 && (
              <div>
                <h2 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: '#64748b' }}>Incidentes Resolvidos</h2>
                {incidents.filter(i => i.status === 'resolved').map(inc => (
                  <div key={inc.id} style={{ display: 'flex', gap: '12px', padding: '14px 16px', borderRadius: '10px', marginBottom: '8px', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', flexShrink: 0, marginTop: '5px' }}/>
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#94a3b8', textDecoration: 'line-through' }}>{inc.title}</p>
                      <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#475569' }}>
                        Resolvido: {inc.resolved_at ? new Date(inc.resolved_at).toLocaleString('pt-BR') : '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '24px', textAlign: 'center', color: '#475569', fontSize: '12px' }}>
        <p>Powered by <strong style={{ color: '#6366f1' }}>ChatDesk</strong> · Atualizado automaticamente</p>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
