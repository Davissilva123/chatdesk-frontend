import React, { useState } from 'react';
import { useApp } from '../../AppContext';
import { getSupabase } from '../../supabase';
import { showToast } from '../../utils';
import { ArrowRightLeft, X, Search } from 'lucide-react';

export default function TransferModal({ conversation, onClose, onTransferred }) {
  const { agents, currentAgent } = useApp();
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredAgents = agents.filter(a => 
    a.id !== currentAgent?.id &&
    (a.name?.toLowerCase().includes(search.toLowerCase()) ||
     a.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleTransfer = async () => {
    if (!selectedAgentId) {
      showToast('Selecione um agente para transferir.', 'warning');
      return;
    }

    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) { setLoading(false); return; }

    try {
      const targetAgent = agents.find(a => a.id === selectedAgentId);
      const fromName = currentAgent?.name || 'Agente';
      const toName = targetAgent?.name || 'Agente';

      // 1. Update assigned agent
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ assigned_agent_id: selectedAgentId })
        .eq('id', conversation.id);

      if (updateError) throw updateError;

      // 2. Insert system activity message
      const noteText = note.trim()
        ? `Conversa transferida de ${fromName} para ${toName}. Nota: "${note.trim()}"`
        : `Conversa transferida de ${fromName} para ${toName}.`;

      await supabase.from('messages').insert({
        conversation_id: conversation.id,
        sender_type: 'system',
        content: noteText,
        message_type: 'activity'
      });

      showToast(`Conversa transferida para ${toName}!`, 'success');
      onTransferred();
    } catch (err) {
      console.error(err);
      showToast('Erro ao transferir conversa: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transfer-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="transfer-modal">
        {/* Header */}
        <div className="transfer-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
              <ArrowRightLeft size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Transferir Conversa</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Selecione o agente de destino</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Search agents */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px' }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              autoFocus
              type="text"
              placeholder="Buscar agente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: 'var(--text-primary)', width: '100%', fontFamily: 'Inter, sans-serif' }}
            />
          </div>
        </div>

        {/* Agent list */}
        <div className="transfer-agent-list">
          {filteredAgents.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Nenhum agente encontrado
            </div>
          ) : filteredAgents.map(agent => (
            <div
              key={agent.id}
              className={`transfer-agent-item ${selectedAgentId === agent.id ? 'selected' : ''}`}
              onClick={() => setSelectedAgentId(agent.id)}
            >
              <div className={`agent-status-dot ${agent.status || 'offline'}`} />
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--accent)', flexShrink: 0, overflow: 'hidden' }}>
                {agent.avatar_url
                  ? <img src={agent.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={agent.name} />
                  : (agent.name || 'A').charAt(0).toUpperCase()
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '13px', truncate: true }}>{agent.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{agent.status || 'offline'}</div>
              </div>
              {selectedAgentId === agent.id && (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
              )}
            </div>
          ))}
        </div>

        {/* Context note */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Nota de contexto (opcional)
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ex: Cliente solicitou falar com especialista técnico..."
            style={{
              width: '100%',
              minHeight: '70px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '13px',
              color: 'var(--text-primary)',
              resize: 'none',
              outline: 'none',
              fontFamily: 'Inter, sans-serif',
              lineHeight: 1.5
            }}
          />
        </div>

        {/* Footer actions */}
        <div style={{ padding: '12px 16px 16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
          >
            Cancelar
          </button>
          <button
            onClick={handleTransfer}
            disabled={loading || !selectedAgentId}
            style={{
              padding: '8px 20px',
              background: selectedAgentId ? 'var(--warning)' : 'rgba(245,158,11,0.3)',
              border: 'none',
              borderRadius: '8px',
              color: selectedAgentId ? '#000' : 'rgba(0,0,0,0.5)',
              cursor: selectedAgentId ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 150ms'
            }}
          >
            <ArrowRightLeft size={14} />
            {loading ? 'Transferindo...' : 'Transferir'}
          </button>
        </div>
      </div>
    </div>
  );
}
