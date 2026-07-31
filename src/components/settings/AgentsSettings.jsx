import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../supabase';
import { showToast } from '../../utils';
import { Plus, Trash2, X, UserCircle2, Mail, Shield } from 'lucide-react';
import { useApp } from '../../AppContext';
import './settings.css';

export default function AgentsSettings() {
  const { currentAgent } = useApp();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const { data, error } = await supabase.from('agents').select('*').order('name', { ascending: true });
      if (error) throw error;
      setAgents(data || []);
    } catch { showToast('Erro ao buscar agentes.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleDeleteAgent = async (agent) => {
    if (!window.confirm(`Remover o agente "${agent.name}"? Esta ação é irreversível.`)) return;
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('agents').delete().eq('id', agent.id);
      if (error) throw error;
      showToast('Agente removido!', 'success');
      fetchAgents();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: inviteEmail.trim(), password: invitePassword,
        options: { data: { name: inviteName.trim() } }
      });
      if (authError) throw authError;
      const { error: dbError } = await supabase.from('agents').insert({
        user_id: authData.user?.id, name: inviteName.trim(),
        email: inviteEmail.trim(), role: inviteRole, status: 'offline',
        company_id: currentAgent?.company_id
      });
      if (dbError) throw dbError;
      showToast('Agente cadastrado com sucesso!', 'success');
      setModalOpen(false);
      setInviteName(''); setInviteEmail(''); setInviteRole('agent'); setInvitePassword('');
      fetchAgents();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const initials = (name) => name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?';
  const avatarColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9'];
  const avatarColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];
  const statusMap = { online: 'online', away: 'away', offline: 'offline' };
  const roleLabel = { agent: 'Agente', supervisor: 'Supervisor', admin: 'Admin' };

  return (
    <div className="s-root">
      {/* Header */}
      <div className="s-header">
        <div className="s-header-text">
          <h2>Gerenciar Agentes</h2>
          <p>Convide e gerencie os atendentes da sua equipe de suporte.</p>
        </div>
        <button className="s-btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Convidar Agente
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '13px' }}>Carregando agentes...</div>
      ) : agents.length === 0 ? (
        <div className="s-empty-state">
          <div className="s-empty-state-icon"><UserCircle2 size={24} /></div>
          <h3>Nenhum agente cadastrado</h3>
          <p>Convide a sua equipe para começar a atender.</p>
          <button className="s-btn-primary" onClick={() => setModalOpen(true)}><Plus size={14} /> Convidar Agente</button>
        </div>
      ) : (
        <div className="s-table-wrap">
          <table className="s-table">
            <thead>
              <tr>
                <th>Agente</th>
                <th>E-mail</th>
                <th>Função</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="s-avatar" style={{ background: `linear-gradient(135deg, ${avatarColor(a.name)}, ${avatarColor(a.name)}cc)` }}>{initials(a.name)}</div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{a.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{a.email}</td>
                  <td><span className="s-badge s-badge-role">{roleLabel[a.role] || a.role}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="s-status-dot" style={{ background: a.status === 'online' ? 'var(--status-online, #22c55e)' : a.status === 'away' ? 'var(--status-away, #f59e0b)' : 'var(--status-offline, #6b7280)' }} />
                      <span className={`s-badge s-badge-${statusMap[a.status] || 'offline'}`} style={{ padding: '2px 0', background: 'none' }}>{a.status}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {a.id !== currentAgent?.id && (
                      <button className="s-icon-btn danger" onClick={() => handleDeleteAgent(a)} title="Remover agente"><Trash2 size={15} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="s-overlay" onClick={e => { if (e.target === e.currentTarget && !saving) setModalOpen(false); }}>
          <div className="s-modal">
            <div className="s-modal-head">
              <div className="s-modal-head-icon"><UserCircle2 size={17} /></div>
              <h3>Convidar Novo Agente</h3>
              <button className="s-modal-close" onClick={() => setModalOpen(false)} disabled={saving}><X size={15} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <div className="s-modal-body">
                <div className="s-grid-2">
                  <div className="s-field">
                    <label className="s-label" htmlFor="inv-name">Nome Completo *</label>
                    <input id="inv-name" className="s-input" type="text" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Ex: Maria Souza" required />
                  </div>
                  <div className="s-field">
                    <label className="s-label" htmlFor="inv-role">Função / Cargo *</label>
                    <select id="inv-role" className="s-select" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                      <option value="agent">Agente de Atendimento</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>
                <div className="s-field">
                  <label className="s-label" htmlFor="inv-email">E-mail *</label>
                  <input id="inv-email" className="s-input" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="maria@empresa.com" required />
                </div>
                <div className="s-field">
                  <label className="s-label" htmlFor="inv-password">Senha Provisória * <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(mín. 6 caracteres)</span></label>
                  <input id="inv-password" className="s-input" type="password" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                </div>
              </div>
              <div className="s-modal-footer">
                <button type="button" className="s-btn-cancel" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className="s-btn-save" disabled={saving}>{saving ? 'Cadastrando...' : 'Cadastrar Agente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
