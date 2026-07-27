import React, { useState } from 'react';
import { useApp } from '../../AppContext';
import { getSupabase, assignConversationAgent, assignConversationTeam } from '../../supabase';
import { showToast } from '../../utils';
import { X } from 'lucide-react';

export default function AssignModal({ conversationId, onClose, onAssigned }) {
  const { agents, teams, currentAgent, setConversations } = useApp();
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const agentId = selectedAgentId || null;
    const teamId = selectedTeamId || null;

    try {
      const supabase = getSupabase();
      if (supabase) {
        const agentName = currentAgent?.name || 'Agente';
        
        let targetName = 'Fila Geral';
        if (agentId) {
          const ag = agents.find(a => a.id === agentId);
          if (ag) targetName = ag.name;
        } else if (teamId) {
          const tm = teams.find(t => t.id === teamId);
          if (tm) targetName = `Equipe ${tm.name}`;
        }

        let systemText = `${agentName} transferiu o atendimento para ${targetName}.`;
        if (note.trim()) {
          systemText += ` Observação: ${note.trim()}`;
        }
        
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_type: 'system',
          content: systemText,
          message_type: 'activity'
        });
      }

      await assignConversationAgent(conversationId, agentId);
      await assignConversationTeam(conversationId, teamId);
      
      // Atualização Otimista da Lista
      if (setConversations) {
        setConversations(prev => prev.map(c => 
          c.id === conversationId 
            ? { ...c, assigned_agent_id: agentId || null, team_id: teamId || null } 
            : c
        ));
      }
      
      showToast('Atribuição e transferência concluídas!', 'success');
      if (onAssigned) onAssigned({ agentId, teamId });
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Erro ao realizar transferência.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="modal-title">Atribuir Responsável</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="assign-agent-select">Agente de Atendimento</label>
            <select 
              id="assign-agent-select"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              style={{ width: '100%', height: '38px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius)' }}
            >
              <option value="">Não atribuir (Fila Geral)</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="assign-team-select">Equipe</label>
            <select 
              id="assign-team-select"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              style={{ width: '100%', height: '38px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius)' }}
            >
              <option value="">Nenhuma equipe</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="assign-note">Observação / Nota de Transferência (Opcional)</label>
            <textarea 
              id="assign-note" 
              placeholder="Motivo da transferência..." 
              rows="3" 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px', 
                background: 'var(--bg-input)', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius)', 
                color: 'var(--text-primary)', 
                resize: 'vertical', 
                fontSize: '12px' 
              }}
            ></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-resolve" disabled={loading}>
              {loading ? 'Confirmando...' : 'Confirmar Atribuição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
