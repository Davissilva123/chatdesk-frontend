import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../supabase';
import { showToast } from '../../utils';
import { Plus, Trash2, X } from 'lucide-react';

export default function SlaSettings() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
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
      const { data, error } = await supabase
        .from('sla_policies')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setPolicies(data || []);
    } catch (err) {
      console.error(err);
      showToast('Erro ao buscar políticas de SLA.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleDeletePolicy = async (policy) => {
    if (!window.confirm(`Você tem certeza que deseja remover o acordo de SLA "${policy.name}"?`)) {
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('sla_policies')
        .delete()
        .eq('id', policy.id);

      if (error) throw error;

      showToast('Política de SLA excluída!', 'success');
      fetchPolicies();
    } catch (err) {
      console.error(err);
      showToast('Erro ao remover: ' + err.message, 'error');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    const firstMin = parseInt(firstResponseMinutes, 10);
    const resMin = parseInt(resolutionMinutes, 10);

    if (isNaN(firstMin) || isNaN(resMin) || firstMin <= 0 || resMin <= 0) {
      showToast('Por favor, informe limites válidos em minutos.', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('sla_policies')
        .insert({
          name: name.trim(),
          first_response_minutes: firstMin,
          resolution_minutes: resMin
        });

      if (error) throw error;

      showToast('Política de SLA cadastrada!', 'success');
      setModalOpen(false);
      setName('');
      setFirstResponseMinutes('');
      setResolutionMinutes('');
      fetchPolicies();
    } catch (err) {
      console.error(err);
      showToast('Erro ao criar política: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Políticas de SLA</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Defina metas de tempo limite para primeira resposta e resolução de atendimentos</p>
        </div>
        <button className="btn-resolve" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nova Política
        </button>
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <table className="ui-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Nome do Acordo</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Primeira Resposta</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Resolução Final</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Criado em</th>
              <th style={{ width: '80px', textAlign: 'center', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Buscando políticas...
                </td>
              </tr>
            ) : policies.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Nenhuma política cadastrada.
                </td>
              </tr>
            ) : (
              policies.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>⏱ {s.first_response_minutes} minutos</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>⏱ {s.resolution_minutes} minutos</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {new Date(s.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button 
                      className="toolbar-btn" 
                      onClick={() => handleDeletePolicy(s)} 
                      style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }} 
                      title="Excluir política"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add SLA Modal Overlay */}
      {modalOpen && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Nova Política de SLA</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)} disabled={saving}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-field">
                <label htmlFor="sla-name">Nome do Acordo / SLA</label>
                <input 
                  type="text" 
                  id="sla-name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: SLA Padrão Suporte, SLA Clientes VIP" 
                  required 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="sla-first">Tempo Limite da Primeira Resposta (em minutos)</label>
                <input 
                  type="number" 
                  id="sla-first" 
                  value={firstResponseMinutes}
                  onChange={(e) => setFirstResponseMinutes(e.target.value)}
                  placeholder="Ex: 15, 30, 60" 
                  required 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="sla-res">Tempo Limite de Resolução Final (em minutos)</label>
                <input 
                  type="number" 
                  id="sla-res" 
                  value={resolutionMinutes}
                  onChange={(e) => setResolutionMinutes(e.target.value)}
                  placeholder="Ex: 120, 240, 480" 
                  required 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn-resolve" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Política'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
