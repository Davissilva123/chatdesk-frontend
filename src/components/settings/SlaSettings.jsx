import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../supabase';
import { showToast } from '../../utils';
import { Plus, Trash2, X, Clock, Timer, CheckCircle } from 'lucide-react';
import './settings.css';

const fmtMinutes = (m) => {
  if (!m) return '—';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
};

export default function SlaSettings() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [firstResponseMinutes, setFirstResponseMinutes] = useState('');
  const [resolutionMinutes, setResolutionMinutes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPolicies = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('sla_policies').select('*').order('name', { ascending: true });
      if (error) throw error;
      setPolicies(data || []);
    } catch { showToast('Erro ao buscar políticas de SLA.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPolicies(); }, []);

  const handleDelete = async (p) => {
    if (!window.confirm(`Excluir a política "${p.name}"?`)) return;
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('sla_policies').delete().eq('id', p.id);
      if (error) throw error;
      showToast('Política excluída!', 'success'); fetchPolicies();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    const firstMin = parseInt(firstResponseMinutes, 10);
    const resMin = parseInt(resolutionMinutes, 10);
    if (isNaN(firstMin) || isNaN(resMin) || firstMin <= 0 || resMin <= 0) {
      showToast('Informe limites válidos em minutos.', 'error'); return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('sla_policies').insert({ name: name.trim(), first_response_minutes: firstMin, resolution_minutes: resMin });
      if (error) throw error;
      showToast('Política de SLA criada!', 'success');
      setModalOpen(false); setName(''); setFirstResponseMinutes(''); setResolutionMinutes(''); fetchPolicies();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="s-root">
      <div className="s-header">
        <div className="s-header-text">
          <h2>Políticas de SLA</h2>
          <p>Defina metas de tempo para primeira resposta e resolução de atendimentos.</p>
        </div>
        <button className="s-btn-primary" onClick={() => setModalOpen(true)}><Plus size={15} /> Nova Política</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '13px' }}>Carregando...</div>
      ) : policies.length === 0 ? (
        <div className="s-empty-state">
          <div className="s-empty-state-icon"><Clock size={24} /></div>
          <h3>Nenhuma política de SLA</h3>
          <p>Configure metas de tempo de atendimento para o seu time.</p>
          <button className="s-btn-primary" onClick={() => setModalOpen(true)}><Plus size={14} /> Nova Política</button>
        </div>
      ) : (
        <div className="s-table-wrap">
          <table className="s-table">
            <thead>
              <tr>
                <th>Nome do Acordo</th>
                <th>Primeira Resposta</th>
                <th>Resolução Final</th>
                <th>Criado em</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {policies.map(s => (
                <tr key={s.id}>
                  <td><strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{s.name}</strong></td>
                  <td>
                    <span className="s-badge s-badge-info" style={{ gap: '5px' }}>
                      <Timer size={11} /> {fmtMinutes(s.first_response_minutes)}
                    </span>
                  </td>
                  <td>
                    <span className="s-badge" style={{ background: 'rgba(34,197,94,.1)', color: '#4ade80', gap: '5px' }}>
                      <CheckCircle size={11} /> {fmtMinutes(s.resolution_minutes)}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="s-icon-btn danger" onClick={() => handleDelete(s)} title="Excluir"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="s-overlay" onClick={e => { if (e.target === e.currentTarget && !saving) setModalOpen(false); }}>
          <div className="s-modal">
            <div className="s-modal-head">
              <div className="s-modal-head-icon"><Clock size={16} /></div>
              <h3>Nova Política de SLA</h3>
              <button className="s-modal-close" onClick={() => setModalOpen(false)} disabled={saving}><X size={15} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <div className="s-modal-body">
                <div className="s-field">
                  <label className="s-label" htmlFor="sla-name">Nome do Acordo *</label>
                  <input id="sla-name" className="s-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: SLA Padrão Suporte, SLA Clientes VIP" required />
                </div>
                <div className="s-grid-2">
                  <div className="s-field">
                    <label className="s-label" htmlFor="sla-first">Primeira Resposta (min) *</label>
                    <input id="sla-first" className="s-input" type="number" min="1" value={firstResponseMinutes} onChange={e => setFirstResponseMinutes(e.target.value)} placeholder="Ex: 15, 30, 60" required />
                  </div>
                  <div className="s-field">
                    <label className="s-label" htmlFor="sla-res">Resolução Final (min) *</label>
                    <input id="sla-res" className="s-input" type="number" min="1" value={resolutionMinutes} onChange={e => setResolutionMinutes(e.target.value)} placeholder="Ex: 120, 240, 480" required />
                  </div>
                </div>
                {(firstResponseMinutes || resolutionMinutes) && (
                  <div style={{ background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.2)', borderRadius: 'var(--radius)', padding: '12px', display: 'flex', gap: '20px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>1ª Resposta:</span>{' '}
                      <strong style={{ color: 'var(--accent)' }}>{fmtMinutes(parseInt(firstResponseMinutes) || 0)}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Resolução:</span>{' '}
                      <strong style={{ color: 'var(--accent)' }}>{fmtMinutes(parseInt(resolutionMinutes) || 0)}</strong>
                    </div>
                  </div>
                )}
              </div>
              <div className="s-modal-footer">
                <button type="button" className="s-btn-cancel" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className="s-btn-save" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Política'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
