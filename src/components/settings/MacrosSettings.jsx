import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../supabase';
import { showToast } from '../../utils';
import { Plus, Trash2, X, Wand2, Globe, Users, User } from 'lucide-react';
import './settings.css';

const VISIBILITY_MAP = {
  global: { label: 'Global', icon: Globe, color: '#38bdf8', bg: 'rgba(14,165,233,.12)' },
  team: { label: 'Equipe', icon: Users, color: '#a78bfa', bg: 'rgba(139,92,246,.12)' },
  personal: { label: 'Pessoal', icon: User, color: '#4ade80', bg: 'rgba(34,197,94,.12)' },
};

export default function MacrosSettings() {
  const [macros, setMacros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState('global');
  const [actions, setActions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [labels, setLabels] = useState([]);

  const fetchMacros = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('macros').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setMacros(data || []);
    } catch { showToast('Erro ao buscar macros.', 'error'); }
    finally { setLoading(false); }
  };

  const fetchAux = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const [ag, te, la] = await Promise.all([
        supabase.from('agents').select('*').order('name'),
        supabase.from('teams').select('*').order('name'),
        supabase.from('labels').select('*').order('name'),
      ]);
      setAgents(ag.data || []); setTeams(te.data || []); setLabels(la.data || []);
    } catch {}
  };

  useEffect(() => { fetchMacros(); fetchAux(); }, []);

  const handleDelete = async (m) => {
    if (!window.confirm(`Excluir a macro "${m.name}"?`)) return;
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('macros').delete().eq('id', m.id);
      if (error) throw error;
      showToast('Macro excluída!', 'success'); fetchMacros();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
  };

  const handleOpenModal = () => { setName(''); setVisibility('global'); setActions([]); setModalOpen(true); };
  const handleAddAction = () => setActions(prev => [...prev, { type: 'assign_agent', value: '' }]);
  const handleRemoveAction = (i) => setActions(prev => prev.filter((_, idx) => idx !== i));
  const handleActionChange = (i, key, val) => setActions(prev => { const u = [...prev]; u[i] = { ...u[i], [key]: val }; return u; });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    const filtered = actions.filter(a => a.value !== '');
    if (filtered.length === 0) { showToast('Adicione ao menos uma ação preenchida.', 'error'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('macros').insert({ name: name.trim(), visibility, actions: filtered });
      if (error) throw error;
      showToast('Macro criada!', 'success'); setModalOpen(false); fetchMacros();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const selStyle = { flex: 1, height: '34px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px', padding: '0 8px', boxSizing: 'border-box' };

  return (
    <div className="s-root">
      <div className="s-header">
        <div className="s-header-text">
          <h2>Macros</h2>
          <p>Execute lotes de ações (atribuir + etiquetar + responder) com um único clique.</p>
        </div>
        <button className="s-btn-primary" onClick={handleOpenModal}><Plus size={15} /> Criar Macro</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '13px' }}>Carregando...</div>
      ) : macros.length === 0 ? (
        <div className="s-empty-state">
          <div className="s-empty-state-icon"><Wand2 size={24} /></div>
          <h3>Nenhuma macro criada</h3>
          <p>Crie macros para automatizar ações repetitivas no atendimento.</p>
          <button className="s-btn-primary" onClick={handleOpenModal}><Plus size={14} /> Criar Macro</button>
        </div>
      ) : (
        <div className="s-table-wrap">
          <table className="s-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Ações</th>
                <th>Visibilidade</th>
                <th>Criada em</th>
                <th style={{ textAlign: 'center' }}>Remover</th>
              </tr>
            </thead>
            <tbody>
              {macros.map(m => {
                const vis = VISIBILITY_MAP[m.visibility] || VISIBILITY_MAP.global;
                const VisIcon = vis.icon;
                return (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, rgba(99,102,241,.2), rgba(139,92,246,.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', flexShrink: 0 }}>
                          <Wand2 size={14} />
                        </div>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{m.name}</strong>
                      </div>
                    </td>
                    <td><span className="s-badge s-badge-role">{(m.actions || []).length} ação(ões)</span></td>
                    <td>
                      <span className="s-badge" style={{ background: vis.bg, color: vis.color, gap: '5px' }}>
                        <VisIcon size={10} /> {vis.label}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{new Date(m.created_at).toLocaleDateString('pt-BR')}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="s-icon-btn danger" onClick={() => handleDelete(m)} title="Excluir"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="s-overlay" onClick={e => { if (e.target === e.currentTarget && !saving) setModalOpen(false); }}>
          <div className="s-modal wide">
            <div className="s-modal-head">
              <div className="s-modal-head-icon"><Wand2 size={16} /></div>
              <h3>Criar Nova Macro</h3>
              <button className="s-modal-close" onClick={() => setModalOpen(false)} disabled={saving}><X size={15} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <div className="s-modal-body">
                <div className="s-grid-2">
                  <div className="s-field">
                    <label className="s-label" htmlFor="mac-name">Nome da Macro *</label>
                    <input id="mac-name" className="s-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Atribuir Suporte + Prioridade Alta" required />
                  </div>
                  <div className="s-field">
                    <label className="s-label" htmlFor="mac-vis">Visibilidade</label>
                    <select id="mac-vis" className="s-select" value={visibility} onChange={e => setVisibility(e.target.value)}>
                      <option value="global">Global (Todos os agentes)</option>
                      <option value="team">Equipe (Apenas minha equipe)</option>
                      <option value="personal">Pessoal (Apenas eu)</option>
                    </select>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0,0,0,.12)', borderBottom: actions.length > 0 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Ações</span>
                    <button type="button" className="s-btn-secondary" onClick={handleAddAction} style={{ padding: '5px 12px', fontSize: '11px' }}>
                      <Plus size={12} /> Adicionar
                    </button>
                  </div>
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-secondary)', maxHeight: '220px', overflowY: 'auto' }}>
                    {actions.length === 0 ? (
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>Nenhuma ação adicionada. Clique em "Adicionar" para começar.</p>
                    ) : actions.map((act, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(99,102,241,.2)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                        <select value={act.type} onChange={e => handleActionChange(i, 'type', e.target.value)} style={{ ...selStyle, flex: '0 0 160px' }}>
                          <option value="assign_agent">Atribuir Agente</option>
                          <option value="assign_team">Atribuir Equipe</option>
                          <option value="add_label">Anexar Etiqueta</option>
                          <option value="send_message">Enviar Mensagem</option>
                        </select>
                        {act.type === 'assign_agent' && (
                          <select value={act.value} onChange={e => handleActionChange(i, 'value', e.target.value)} required style={selStyle}>
                            <option value="">Selecione o agente...</option>
                            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                        )}
                        {act.type === 'assign_team' && (
                          <select value={act.value} onChange={e => handleActionChange(i, 'value', e.target.value)} required style={selStyle}>
                            <option value="">Selecione a equipe...</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        )}
                        {act.type === 'add_label' && (
                          <select value={act.value} onChange={e => handleActionChange(i, 'value', e.target.value)} required style={selStyle}>
                            <option value="">Selecione a etiqueta...</option>
                            {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                        )}
                        {act.type === 'send_message' && (
                          <input type="text" value={act.value} onChange={e => handleActionChange(i, 'value', e.target.value)} placeholder="Mensagem a enviar..." required style={selStyle} />
                        )}
                        <button type="button" onClick={() => handleRemoveAction(i)} style={{ width: '26px', height: '26px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="s-modal-footer">
                <button type="button" className="s-btn-cancel" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className="s-btn-save" disabled={saving}>{saving ? 'Criando...' : 'Criar Macro'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
