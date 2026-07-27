import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../supabase';
import { showToast } from '../../utils';
import { Plus, Trash2, X, PlusCircle } from 'lucide-react';

export default function MacrosSettings() {
  const [macros, setMacros] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState('global'); // personal | team | global
  const [actions, setActions] = useState([]); // list of { type, value }
  const [saving, setSaving] = useState(false);

  // Aux database lists for actions selection
  const [agents, setAgents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [labels, setLabels] = useState([]);

  const fetchMacros = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('macros')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMacros(data || []);
    } catch (err) {
      console.error(err);
      showToast('Erro ao buscar macros.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxLists = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const [agentsRes, teamsRes, labelsRes] = await Promise.all([
        supabase.from('agents').select('*').order('name', { ascending: true }),
        supabase.from('teams').select('*').order('name', { ascending: true }),
        supabase.from('labels').select('*').order('name', { ascending: true })
      ]);

      setAgents(agentsRes.data || []);
      setTeams(teamsRes.data || []);
      setLabels(labelsRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMacros();
    fetchAuxLists();
  }, []);

  const handleDeleteMacro = async (macro) => {
    if (!window.confirm(`Você tem certeza que deseja remover a macro "${macro.name}"?`)) {
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('macros')
        .delete()
        .eq('id', macro.id);

      if (error) throw error;

      showToast('Macro excluída!', 'success');
      fetchMacros();
    } catch (err) {
      console.error(err);
      showToast('Erro ao remover: ' + err.message, 'error');
    }
  };

  const handleOpenCreateModal = () => {
    setName('');
    setVisibility('global');
    setActions([]);
    setModalOpen(true);
  };

  const handleAddActionField = () => {
    setActions(prev => [...prev, { type: 'assign_agent', value: '' }]);
  };

  const handleRemoveActionField = (index) => {
    setActions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleActionChange = (index, key, val) => {
    setActions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: val };
      return updated;
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    // Filter out empty actions
    const filteredActions = actions.filter(act => act.value !== '');
    if (filteredActions.length === 0) {
      showToast('Adicione e preencha pelo menos uma ação válida para a macro.', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('macros')
        .insert({
          name: name.trim(),
          visibility,
          actions: filteredActions
        });

      if (error) throw error;

      showToast('Macro cadastrada com sucesso!', 'success');
      setModalOpen(false);
      fetchMacros();
    } catch (err) {
      console.error(err);
      showToast('Erro ao criar macro: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Macros de Atendimento</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Execute lotes de ações manuais (ex: atribuir + etiquetar + resolver) com 1 clique</p>
        </div>
        <button className="btn-resolve" onClick={handleOpenCreateModal}>
          <Plus size={16} /> Criar Macro
        </button>
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <table className="ui-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Nome</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600', width: '120px' }}>Ações</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600', width: '140px' }}>Visibilidade</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Criada em</th>
              <th style={{ width: '80px', textAlign: 'center', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Buscando macros...
                </td>
              </tr>
            ) : macros.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Nenhuma macro cadastrada.
                </td>
              </tr>
            ) : (
              macros.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="conv-badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
                      {(m.actions || []).length} ação(ões)
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: 'var(--text-primary)' }}>{m.visibility}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {new Date(m.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button 
                      className="toolbar-btn" 
                      onClick={() => handleDeleteMacro(m)} 
                      style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }} 
                      title="Excluir macro"
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

      {/* Add Macro Modal Overlay */}
      {modalOpen && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-card" style={{ width: '560px', maxWidth: '95%' }}>
            <div className="modal-header">
              <h3 className="modal-title">Criar Nova Macro</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)} disabled={saving}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-field">
                <label htmlFor="macro-name">Nome da Macro</label>
                <input 
                  type="text" 
                  id="macro-name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Atribuir Suporte + Prioridade Urgente" 
                  required 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="macro-visibility">Visibilidade da Macro</label>
                <select 
                  id="macro-visibility"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  style={{ width: '100%', height: '38px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                >
                  <option value="global">Global (Todos os agentes)</option>
                  <option value="team">Equipe (Apenas agentes na minha equipe)</option>
                  <option value="personal">Pessoal (Apenas eu visualizo)</option>
                </select>
              </div>

              {/* Actions Builder Section */}
              <div style={{ margin: '16px 0 20px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Ações da Macro</span>
                  <button 
                    type="button" 
                    onClick={handleAddActionField}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0, fontSize: '12px', fontWeight: 600 }}
                  >
                    <PlusCircle size={14} /> Adicionar Ação
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {actions.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '10px' }}>
                      Nenhuma ação definida. Clique em "Adicionar Ação" para começar.
                    </p>
                  ) : (
                    actions.map((act, index) => (
                      <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                        <select 
                          value={act.type}
                          onChange={(e) => handleActionChange(index, 'type', e.target.value)}
                          style={{ width: '150px', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px' }}
                        >
                          <option value="assign_agent">Atribuir Agente</option>
                          <option value="assign_team">Atribuir Equipe</option>
                          <option value="add_label">Anexar Etiqueta</option>
                          <option value="send_message">Enviar Mensagem</option>
                        </select>

                        {/* Renders input depending on action type */}
                        <div style={{ flexGrow: 1 }}>
                          {act.type === 'assign_agent' && (
                            <select 
                              value={act.value}
                              onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                              required
                              style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px' }}
                            >
                              <option value="">Selecione o agente...</option>
                              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                          )}

                          {act.type === 'assign_team' && (
                            <select 
                              value={act.value}
                              onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                              required
                              style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px' }}
                            >
                              <option value="">Selecione a equipe...</option>
                              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          )}

                          {act.type === 'add_label' && (
                            <select 
                              value={act.value}
                              onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                              required
                              style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px' }}
                            >
                              <option value="">Selecione a etiqueta...</option>
                              {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                          )}

                          {act.type === 'send_message' && (
                            <textarea 
                              rows={1}
                              value={act.value}
                              onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                              required
                              placeholder="Mensagem a ser enviada..."
                              style={{ width: '100%', padding: '6px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px', height: '34px', resize: 'none' }}
                            />
                          )}
                        </div>

                        <button 
                          type="button" 
                          onClick={() => handleRemoveActionField(index)}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn-resolve" disabled={saving}>
                  {saving ? 'Criando...' : 'Criar Macro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
