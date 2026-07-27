import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../supabase';
import { showToast } from '../../utils';
import { Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../../AppContext';

export default function AgentsSettings() {
  const { currentAgent } = useApp();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('agent');
  const [invitePassword, setInvitePassword] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAgents = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setAgents(data || []);
    } catch (err) {
      console.error(err);
      showToast('Erro ao buscar agentes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleDeleteAgent = async (agent) => {
    if (!window.confirm(`Você tem certeza que deseja remover o agente "${agent.name}"? Esta ação é irreversível.`)) {
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', agent.id);

      if (error) throw error;

      showToast('Agente removido com sucesso!', 'success');
      fetchAgents();
    } catch (err) {
      console.error(err);
      showToast('Erro ao remover agente: ' + err.message, 'error');
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    setSaving(true);
    try {
      // 1. SignUp user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: inviteEmail.trim(),
        password: invitePassword,
        options: {
          data: { name: inviteName.trim() }
        }
      });

      if (authError) throw authError;

      // 2. Insert profile in agents table linking user_id
      const { error: dbError } = await supabase
        .from('agents')
        .insert({
          user_id: authData.user?.id,
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          role: inviteRole,
          status: 'offline',
          company_id: currentAgent?.company_id
        });

      if (dbError) throw dbError;

      showToast('Agente cadastrado e convidado!', 'success');
      setModalOpen(false);
      
      // Reset form fields
      setInviteName('');
      setInviteEmail('');
      setInviteRole('agent');
      setInvitePassword('');
      
      fetchAgents();
    } catch (err) {
      console.error(err);
      showToast('Erro ao convidar agente: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Gerenciar Agentes</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Convide ou modifique cargos dos atendentes no ChatDesk</p>
        </div>
        <button className="btn-resolve" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Convidar Agente
        </button>
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <table className="ui-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Nome</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>E-mail</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Função</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Status</th>
              <th style={{ width: '80px', textAlign: 'center', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Buscando agentes...
                </td>
              </tr>
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Nenhum agente cadastrado.
                </td>
              </tr>
            ) : (
              agents.map(a => {
                const statusColor = a.status === 'online' 
                  ? 'var(--status-online)' 
                  : a.status === 'away' 
                    ? 'var(--status-away)' 
                    : 'var(--status-offline)';

                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{a.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{a.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                        {a.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ background: statusColor, width: '8px', height: '8px', borderRadius: '50%' }}></span>
                        <span style={{ fontSize: '12px', textTransform: 'capitalize', color: 'var(--text-primary)' }}>{a.status}</span>
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button 
                        className="toolbar-btn" 
                        onClick={() => handleDeleteAgent(a)} 
                        style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }} 
                        title="Excluir agente"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Modal Overlay */}
      {modalOpen && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Convidar Novo Agente</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)} disabled={saving}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit}>
              <div className="form-field">
                <label htmlFor="inv-name">Nome Completo</label>
                <input 
                  type="text" 
                  id="inv-name" 
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ex: Maria Souza" 
                  required 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="inv-email">E-mail</label>
                <input 
                  type="email" 
                  id="inv-email" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="maria@empresa.com" 
                  required 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="inv-role">Função / Cargo</label>
                <select 
                  id="inv-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={{ width: '100%', height: '38px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                >
                  <option value="agent">Agente de Atendimento</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="inv-password">Senha Provisória</label>
                <input 
                  type="password" 
                  id="inv-password" 
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres" 
                  required 
                  minLength={6}
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn-resolve" disabled={saving}>
                  {saving ? 'Cadastrando...' : 'Cadastrar Agente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
