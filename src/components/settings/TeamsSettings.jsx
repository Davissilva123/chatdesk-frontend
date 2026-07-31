import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../supabase';
import { showToast } from '../../utils';
import { Plus, Trash2, X, Users, UserCheck } from 'lucide-react';
import './settings.css';

export default function TeamsSettings() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);
  const [allAgents, setAllAgents] = useState([]);
  const [teamAgentIds, setTeamAgentIds] = useState([]);
  const [savingMembers, setSavingMembers] = useState(false);

  const fetchTeams = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: teamsList, error } = await supabase.from('teams').select('*').order('name', { ascending: true });
      if (error) throw error;
      const withCount = await Promise.all((teamsList || []).map(async t => {
        const { count } = await supabase.from('team_agents').select('*', { count: 'exact', head: true }).eq('team_id', t.id);
        return { ...t, memberCount: count || 0 };
      }));
      setTeams(withCount);
    } catch { showToast('Erro ao buscar equipes.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeams(); }, []);

  const handleDeleteTeam = async (t) => {
    if (!window.confirm(`Excluir a equipe "${t.name}"?`)) return;
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('teams').delete().eq('id', t.id);
      if (error) throw error;
      showToast('Equipe excluída!', 'success'); fetchTeams();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setSavingTeam(true);
    try {
      const { error } = await supabase.from('teams').insert({ name: teamName.trim(), description: teamDescription.trim() });
      if (error) throw error;
      showToast('Equipe criada!', 'success');
      setCreateModalOpen(false); setTeamName(''); setTeamDescription(''); fetchTeams();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
    finally { setSavingTeam(false); }
  };

  const handleOpenMembers = async (t) => {
    setSelectedTeam(t); setMembersModalOpen(true);
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { data: ag } = await supabase.from('agents').select('*').order('name', { ascending: true });
      setAllAgents(ag || []);
      const { data: ta } = await supabase.from('team_agents').select('agent_id').eq('team_id', t.id);
      setTeamAgentIds((ta || []).map(x => x.agent_id));
    } catch { showToast('Erro ao carregar membros.', 'error'); }
  };

  const handleToggleMember = (id) => setTeamAgentIds(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);

  const handleSaveMembers = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setSavingMembers(true);
    try {
      await supabase.from('team_agents').delete().eq('team_id', selectedTeam.id);
      if (teamAgentIds.length > 0) {
        await supabase.from('team_agents').insert(teamAgentIds.map(id => ({ team_id: selectedTeam.id, agent_id: id })));
      }
      showToast('Membros atualizados!', 'success'); setMembersModalOpen(false); fetchTeams();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
    finally { setSavingMembers(false); }
  };

  const initials = (name) => name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?';

  return (
    <div className="s-root">
      <div className="s-header">
        <div className="s-header-text">
          <h2>Equipes</h2>
          <p>Agrupe agentes em setores como Suporte, Vendas e Financeiro.</p>
        </div>
        <button className="s-btn-primary" onClick={() => setCreateModalOpen(true)}><Plus size={15} /> Criar Equipe</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '13px' }}>Carregando equipes...</div>
      ) : teams.length === 0 ? (
        <div className="s-empty-state">
          <div className="s-empty-state-icon"><Users size={24} /></div>
          <h3>Nenhuma equipe criada</h3>
          <p>Crie equipes para organizar e distribuir atendimentos.</p>
          <button className="s-btn-primary" onClick={() => setCreateModalOpen(true)}><Plus size={14} /> Criar Equipe</button>
        </div>
      ) : (
        <div className="s-table-wrap">
          <table className="s-table">
            <thead>
              <tr>
                <th>Equipe</th>
                <th>Descrição</th>
                <th>Membros</th>
                <th>Criada em</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {teams.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(99,102,241,.2), rgba(139,92,246,.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', flexShrink: 0 }}>
                        <Users size={15} />
                      </div>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{t.name}</strong>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{t.description || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td><span className="s-badge s-badge-count"><Users size={11} /> {t.memberCount} agente{t.memberCount !== 1 ? 's' : ''}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                      <button className="s-btn-secondary" onClick={() => handleOpenMembers(t)} style={{ padding: '6px 12px', fontSize: '11px' }}>
                        <UserCheck size={13} /> Membros
                      </button>
                      <button className="s-icon-btn danger" onClick={() => handleDeleteTeam(t)} title="Excluir"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {createModalOpen && (
        <div className="s-overlay" onClick={e => { if (e.target === e.currentTarget && !savingTeam) setCreateModalOpen(false); }}>
          <div className="s-modal">
            <div className="s-modal-head">
              <div className="s-modal-head-icon"><Users size={16} /></div>
              <h3>Criar Nova Equipe</h3>
              <button className="s-modal-close" onClick={() => setCreateModalOpen(false)} disabled={savingTeam}><X size={15} /></button>
            </div>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <div className="s-modal-body">
                <div className="s-field">
                  <label className="s-label" htmlFor="team-name">Nome da Equipe *</label>
                  <input id="team-name" className="s-input" type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Ex: Suporte Nível 1" required />
                </div>
                <div className="s-field">
                  <label className="s-label" htmlFor="team-desc">Descrição / Setor</label>
                  <textarea id="team-desc" className="s-textarea" rows="3" value={teamDescription} onChange={e => setTeamDescription(e.target.value)} placeholder="Resumo das responsabilidades desta equipe..." />
                </div>
              </div>
              <div className="s-modal-footer">
                <button type="button" className="s-btn-cancel" onClick={() => setCreateModalOpen(false)} disabled={savingTeam}>Cancelar</button>
                <button type="submit" className="s-btn-save" disabled={savingTeam}>{savingTeam ? 'Criando...' : 'Criar Equipe'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {membersModalOpen && selectedTeam && (
        <div className="s-overlay" onClick={e => { if (e.target === e.currentTarget && !savingMembers) setMembersModalOpen(false); }}>
          <div className="s-modal">
            <div className="s-modal-head">
              <div className="s-modal-head-icon"><UserCheck size={16} /></div>
              <h3>Membros — {selectedTeam.name}</h3>
              <button className="s-modal-close" onClick={() => setMembersModalOpen(false)} disabled={savingMembers}><X size={15} /></button>
            </div>
            <form onSubmit={handleSaveMembers} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <div className="s-modal-body">
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Selecione os agentes que integram esta equipe:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                  {allAgents.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px', padding: '20px 0' }}>Nenhum agente disponível.</p>
                  ) : allAgents.map(a => (
                    <label key={a.id} className="s-check-item">
                      <input type="checkbox" checked={teamAgentIds.includes(a.id)} onChange={() => handleToggleMember(a.id)} disabled={savingMembers} />
                      <div className="info">
                        <strong>{a.name}</strong>
                        <span>{a.email}</span>
                      </div>
                    </label>
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{teamAgentIds.length} agente(s) selecionado(s)</p>
              </div>
              <div className="s-modal-footer">
                <button type="button" className="s-btn-cancel" onClick={() => setMembersModalOpen(false)} disabled={savingMembers}>Cancelar</button>
                <button type="submit" className="s-btn-save" disabled={savingMembers}>{savingMembers ? 'Salvando...' : 'Salvar Alterações'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
