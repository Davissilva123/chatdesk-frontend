import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../supabase';
import { showToast } from '../../utils';
import { Plus, Trash2, X, Users } from 'lucide-react';

export default function TeamsSettings() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Form states
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);

  // Member editing states
  const [allAgents, setAllAgents] = useState([]);
  const [teamAgentIds, setTeamAgentIds] = useState([]);
  const [savingMembers, setSavingMembers] = useState(false);

  const fetchTeamsAndCounts = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    setLoading(true);
    try {
      const { data: teamsList, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true });

      if (teamsError) throw teamsError;

      const teamsWithCount = [];
      for (const team of (teamsList || [])) {
        const { count, error: countError } = await supabase
          .from('team_agents')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id);

        if (countError) throw countError;
        teamsWithCount.push({ ...team, memberCount: count || 0 });
      }

      setTeams(teamsWithCount);
    } catch (err) {
      console.error(err);
      showToast('Erro ao buscar equipes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamsAndCounts();
  }, []);

  const handleDeleteTeam = async (team) => {
    if (!window.confirm(`Tem certeza que deseja excluir a equipe "${team.name}"?`)) {
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', team.id);

      if (error) throw error;

      showToast('Equipe excluída com sucesso!', 'success');
      fetchTeamsAndCounts();
    } catch (err) {
      console.error(err);
      showToast('Erro ao remover equipe: ' + err.message, 'error');
    }
  };

  const handleCreateTeamSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    setSavingTeam(true);
    try {
      const { error } = await supabase
        .from('teams')
        .insert({ 
          name: teamName.trim(), 
          description: teamDescription.trim() 
        });

      if (error) throw error;

      showToast('Equipe criada com sucesso!', 'success');
      setCreateModalOpen(false);
      setTeamName('');
      setTeamDescription('');
      fetchTeamsAndCounts();
    } catch (err) {
      console.error(err);
      showToast('Erro ao criar equipe: ' + err.message, 'error');
    } finally {
      setSavingTeam(false);
    }
  };

  const handleOpenMembersModal = async (team) => {
    setSelectedTeam(team);
    setMembersModalOpen(true);

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      // 1. Fetch all agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .order('name', { ascending: true });

      if (agentsError) throw agentsError;
      setAllAgents(agentsData || []);

      // 2. Fetch current team agents
      const { data: teamAgentsData, error: teamAgentsError } = await supabase
        .from('team_agents')
        .select('agent_id')
        .eq('team_id', team.id);

      if (teamAgentsError) throw teamAgentsError;
      setTeamAgentIds((teamAgentsData || []).map(ta => ta.agent_id));
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar membros da equipe.', 'error');
    }
  };

  const handleMemberCheckboxChange = (agentId) => {
    setTeamAgentIds(current => {
      if (current.includes(agentId)) {
        return current.filter(id => id !== agentId);
      } else {
        return [...current, agentId];
      }
    });
  };

  const handleSaveMembersSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    setSavingMembers(true);
    try {
      // 1. Delete existing members
      const { error: deleteError } = await supabase
        .from('team_agents')
        .delete()
        .eq('team_id', selectedTeam.id);

      if (deleteError) throw deleteError;

      // 2. Insert selected members
      if (teamAgentIds.length > 0) {
        const rows = teamAgentIds.map(agentId => ({
          team_id: selectedTeam.id,
          agent_id: agentId
        }));

        const { error: insertError } = await supabase
          .from('team_agents')
          .insert(rows);

        if (insertError) throw insertError;
      }

      showToast('Membros da equipe atualizados!', 'success');
      setMembersModalOpen(false);
      fetchTeamsAndCounts();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar membros: ' + err.message, 'error');
    } finally {
      setSavingMembers(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Gerenciar Equipes</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Agrupe agentes em setores (ex: Suporte, Vendas, Financeiro)</p>
        </div>
        <button className="btn-resolve" onClick={() => setCreateModalOpen(true)}>
          <Plus size={16} /> Criar Equipe
        </button>
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <table className="ui-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Nome da Equipe</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Descrição</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Membros</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Criado em</th>
              <th style={{ width: '180px', textAlign: 'center', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Buscando equipes...
                </td>
              </tr>
            ) : teams.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Nenhuma equipe cadastrada.
                </td>
              </tr>
            ) : (
              teams.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{t.description || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="conv-badge" style={{ background: 'var(--border)', color: 'var(--text-primary)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
                      {t.memberCount} agentes
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {new Date(t.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        className="btn-cancel" 
                        onClick={() => handleOpenMembersModal(t)}
                        style={{ fontSize: '11px', padding: '4px 8px', cursor: 'pointer' }}
                      >
                        Membros
                      </button>
                      <button 
                        className="toolbar-btn" 
                        onClick={() => handleDeleteTeam(t)} 
                        style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }} 
                        title="Excluir equipe"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Team Modal Overlay */}
      {createModalOpen && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Criar Nova Equipe</h3>
              <button className="modal-close" onClick={() => setCreateModalOpen(false)} disabled={savingTeam}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTeamSubmit}>
              <div className="form-field">
                <label htmlFor="team-name">Nome da Equipe</label>
                <input 
                  type="text" 
                  id="team-name" 
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ex: Suporte Nivel 1" 
                  required 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="team-desc">Descrição / Setor</label>
                <textarea 
                  id="team-desc" 
                  rows="3" 
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="Resumo das responsabilidades do setor..." 
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn-cancel" onClick={() => setCreateModalOpen(false)} disabled={savingTeam}>
                  Cancelar
                </button>
                <button type="submit" className="btn-resolve" disabled={savingTeam}>
                  {savingTeam ? 'Salvando...' : 'Salvar Equipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Members Modal Overlay */}
      {membersModalOpen && selectedTeam && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} />
                Membros: {selectedTeam.name}
              </h3>
              <button className="modal-close" onClick={() => setMembersModalOpen(false)} disabled={savingMembers}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveMembersSubmit}>
              <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Selecione os agentes que integram esta equipe de atendimento:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto', padding: '4px', marginBottom: '20px' }}>
                {allAgents.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>
                    Carregando agentes ou nenhum cadastrado...
                  </div>
                ) : (
                  allAgents.map(agent => (
                    <label key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
                      <input 
                        type="checkbox" 
                        checked={teamAgentIds.includes(agent.id)}
                        onChange={() => handleMemberCheckboxChange(agent.id)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                        disabled={savingMembers}
                      />
                      {agent.name} ({agent.email})
                    </label>
                  ))
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-cancel" onClick={() => setMembersModalOpen(false)} disabled={savingMembers}>
                  Cancelar
                </button>
                <button type="submit" className="btn-resolve" disabled={savingMembers}>
                  {savingMembers ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
