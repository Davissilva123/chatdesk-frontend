import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../AppContext';
import { getSupabase, resetUnreadCount, bulkUpdateConversations } from '../supabase';
import { formatTime, showToast } from '../utils';
import AssignModal from './modals/AssignModal';
import { Search, Menu, MessageSquare, AlertCircle, CheckSquare, X, CheckCircle, Clock, UserCheck, Square } from 'lucide-react';

// ── SLA helper ──────────────────────────────────────────────────────
function getSlaStatus(conv) {
  if (!conv?.created_at || conv.status !== 'open') return null;
  const diffMins = Math.floor((Date.now() - new Date(conv.created_at)) / 60000);
  if (diffMins < 30) return 'ok';
  if (diffMins < 60) return 'warn';
  return 'breach';
}

export default function ConversationList() {
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    currentAgent,
    agents,
    filterAgent,
    setFilterAgent,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    filtersCollapsed,
    setFiltersCollapsed,
    fetchConversationsList,
    setFilterSidebar,
    filterSidebar,
    loading: appLoading
  } = useApp();

  const [foundMessages, setFoundMessages] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningConvId, setAssigningConvId] = useState(null);

  // ── Bulk selection state ────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  // ── Debounced message search ────────────────────────────────────
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setFoundMessages([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      const q = searchQuery.trim();
      const supabase = getSupabase();
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`*, conversation:conversations(*, contact:contacts(*), inbox:inboxes(*))`)
          .ilike('content', `%${q}%`)
          .order('created_at', { ascending: false })
          .limit(10);
        if (!error && data) setFoundMessages(data);
      } catch (err) {
        console.error('Erro ao buscar mensagens no Supabase:', err);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // ── Filtered conversation lists ─────────────────────────────────
  const mineList       = conversations.filter(c => currentAgent && String(c.assigned_agent_id) === String(currentAgent.id));
  const unassignedList = conversations.filter(c => !c.assigned_agent_id);
  const allList        = conversations;

  let visibleList = conversations;
  if (filterAgent === 'mine')       visibleList = mineList;
  else if (filterAgent === 'unassigned') visibleList = unassignedList;
  else if (filterAgent === 'all')   visibleList = allList;

  const unreadTotal = visibleList.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  const handleSetFilterAgent = (val) => {
    setFilterAgent(val);
    if ((val === 'mine' || val === 'all') && filterSidebar.type === 'unassigned') {
      setFilterSidebar({ type: 'all', id: null });
    }
  };

  const handleSelectConversation = async (conv) => {
    if (bulkMode) {
      // In bulk mode, clicking toggles selection
      toggleSelect(conv.id);
      return;
    }
    setActiveConversation(conv);
    localStorage.setItem('contact-panel-collapsed', 'false');
    if (conv.unread_count > 0) {
      conv.unread_count = 0;
      await resetUnreadCount(conv.id);
      fetchConversationsList();
    }
  };

  const handleSelectMessageResult = async (convId, msgId) => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { data: convData, error } = await supabase
        .from('conversations')
        .select(`*, contact:contacts(*), agent:agents(*), inbox:inboxes(*), labels:conversation_labels(label:labels(*))`)
        .eq('id', convId)
        .single();
      if (!error && convData) {
        setActiveConversation(convData);
        localStorage.setItem('contact-panel-collapsed', 'false');
        if (convData.unread_count > 0) {
          convData.unread_count = 0;
          await resetUnreadCount(convData.id);
        }
        setSearchQuery('');
        fetchConversationsList();
        setTimeout(() => {
          const targetMsgEl = document.getElementById(`msg-${msgId}`);
          if (targetMsgEl) {
            targetMsgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetMsgEl.style.outline = '2px dashed var(--accent)';
            targetMsgEl.style.outlineOffset = '4px';
            targetMsgEl.style.borderRadius = '8px';
            setTimeout(() => { targetMsgEl.style.outline = 'none'; }, 3000);
          }
        }, 800);
      }
    } catch (err) { console.error(err); }
  };

  const handleInlineAssign = (e, convId) => {
    e.stopPropagation();
    setAssigningConvId(convId);
    setShowAssignModal(true);
  };

  const handleAssignedSuccess = () => fetchConversationsList();

  // ── Bulk selection helpers ──────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === visibleList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleList.map(c => c.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkMode(false);
  };

  // ── Bulk actions ────────────────────────────────────────────────
  const handleBulkResolve = async () => {
    if (!selectedIds.size) return;
    try {
      await bulkUpdateConversations([...selectedIds], { status: 'resolved' });
      showToast(`${selectedIds.size} conversa(s) resolvida(s)!`, 'success');
      clearSelection();
      fetchConversationsList();
    } catch (err) { showToast('Erro ao resolver conversas: ' + err.message, 'error'); }
  };

  const handleBulkPending = async () => {
    if (!selectedIds.size) return;
    try {
      await bulkUpdateConversations([...selectedIds], { status: 'pending' });
      showToast(`${selectedIds.size} conversa(s) marcadas como pendentes!`, 'success');
      clearSelection();
      fetchConversationsList();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
  };

  const handleBulkAssign = async () => {
    if (!selectedIds.size || !currentAgent?.id) return;
    try {
      await bulkUpdateConversations([...selectedIds], { assigned_agent_id: currentAgent.id });
      showToast(`${selectedIds.size} conversa(s) atribuídas a você!`, 'success');
      clearSelection();
      fetchConversationsList();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
  };

  return (
    <section id="conversation-list" className="column-col2">
      {/* Top search + view details */}
      <div className="col2-header">
        <div className="col2-title-area" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="toolbar-btn"
            onClick={() => setFiltersCollapsed(!filtersCollapsed)}
            title="Mostrar/Esconder Filtros"
            style={{ padding: '4px', marginRight: '2px' }}
          >
            <Menu size={18} />
          </button>
          <h3 className="col2-title" style={{ flexGrow: 1 }}>Conversas</h3>
          {unreadTotal > 0 && <span className="conv-badge" style={{ background: 'var(--accent)' }}>{unreadTotal}</span>}

          {/* Bulk mode toggle */}
          <button
            className="toolbar-btn"
            onClick={() => { setBulkMode(b => !b); setSelectedIds(new Set()); }}
            title={bulkMode ? 'Sair da seleção em lote' : 'Selecionar em lote'}
            style={{ color: bulkMode ? 'var(--accent)' : undefined }}
          >
            {bulkMode ? <CheckSquare size={17} /> : <Square size={17} />}
          </button>
        </div>

        {/* Bulk Actions Toolbar */}
        {bulkMode && selectedIds.size > 0 && (
          <div className="bulk-action-bar">
            <span className="bulk-count">{selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}</span>
            <button className="bulk-btn success" onClick={handleBulkResolve} title="Resolver selecionadas">
              <CheckCircle size={13} /> Resolver
            </button>
            <button className="bulk-btn" onClick={handleBulkPending} title="Marcar como pendente">
              <Clock size={13} /> Pendente
            </button>
            <button className="bulk-btn" onClick={handleBulkAssign} title="Atribuir a mim">
              <UserCheck size={13} /> Atribuir a mim
            </button>
            <button className="bulk-clear" onClick={clearSelection} title="Cancelar seleção">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Bulk: select all bar */}
        {bulkMode && selectedIds.size === 0 && (
          <div style={{ padding: '6px 14px', background: 'rgba(124,111,247,0.04)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <CheckSquare size={13} style={{ color: 'var(--accent)' }} />
            <span>Clique em conversas para selecioná-las</span>
            <button onClick={toggleSelectAll} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>Selecionar todas</button>
          </div>
        )}

        <div className="search-container">
          <Search size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Pesquisar contatos e mensagens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter tabs */}
        <div className="col2-tabs" style={{ display: 'flex', gap: '4px', padding: '4px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', width: '100%', boxSizing: 'border-box' }}>
          <button className={`col2-tab-btn ${filterAgent === 'mine' ? 'active' : ''}`} onClick={() => handleSetFilterAgent('mine')} style={{ flex: 1, fontSize: '11px', padding: '6px 4px', whiteSpace: 'nowrap', textAlign: 'center' }}>
            Minhas ({mineList.length})
          </button>
          <button className={`col2-tab-btn ${filterAgent === 'unassigned' ? 'active' : ''}`} onClick={() => handleSetFilterAgent('unassigned')} style={{ flex: 1, fontSize: '11px', padding: '6px 4px', whiteSpace: 'nowrap', textAlign: 'center' }}>
            Não atribuídas ({unassignedList.length})
          </button>
          <button className={`col2-tab-btn ${filterAgent === 'all' ? 'active' : ''}`} onClick={() => handleSetFilterAgent('all')} style={{ flex: 1, fontSize: '11px', padding: '6px 4px', whiteSpace: 'nowrap', textAlign: 'center' }}>
            Todas ({allList.length})
          </button>
        </div>
      </div>

      {/* Status filter */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', background: 'rgba(0,0,0,0.15)' }}>
        <div className="filter-select-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>Status das conversas:</span>
          <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="open">Abertas</option>
            <option value="pending">Pendentes</option>
            <option value="resolved">Resolvidas</option>
            <option value="snoozed">Suspensas</option>
          </select>
        </div>
      </div>

      {/* Conversation list */}
      <div className="conversations-scroll" id="conv-list-items" style={{ overflowY: 'auto' }}>
        {appLoading ? (
          <div style={{ padding: '8px' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display: 'flex', gap: '10px', padding: '12px', marginBottom: '2px', borderRadius: 'var(--radius-sm)', alignItems: 'flex-start' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--border)', flexShrink: 0, animation: `shimmer-pulse ${1.2 + i * 0.1}s infinite ease-in-out` }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ height: '12px', width: '60%', background: 'var(--border)', borderRadius: '4px', animation: `shimmer-pulse ${1.2 + i * 0.1}s infinite ease-in-out` }} />
                  <div style={{ height: '10px', width: '85%', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', animation: `shimmer-pulse ${1.3 + i * 0.1}s infinite ease-in-out` }} />
                </div>
                <div style={{ width: '30px', height: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', flexShrink: 0, animation: 'shimmer-pulse 1.5s infinite ease-in-out' }} />
              </div>
            ))}
          </div>
        ) : visibleList.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 16px', fontSize: '13px' }}>
            <MessageSquare size={28} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Nenhuma conversa</div>
            <div style={{ fontSize: '11.5px', marginTop: '4px' }}>Nenhuma conversa no filtro atual</div>
          </div>
        ) : (
          visibleList.map(c => {
            const contact   = c.contact || {};
            const isActive  = activeConversation && activeConversation.id === c.id;
            const isSelected = selectedIds.has(c.id);
            const initial   = (contact.name || contact.phone || 'C').substring(0, 1).toUpperCase();
            const slaStatus = getSlaStatus(c);

            return (
              <div
                key={c.id}
                className={`conv-item ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''} ${c.priority === 'urgent' ? 'priority-urgent' : ''}`}
                onClick={() => handleSelectConversation(c)}
              >
                {/* Checkbox (visible on hover or when bulk mode active) */}
                {bulkMode && (
                  <div className="conv-checkbox-wrapper" onClick={e => { e.stopPropagation(); toggleSelect(c.id); }}>
                    <input type="checkbox" checked={isSelected} readOnly />
                  </div>
                )}

                <div className={`conv-avatar-wrapper ${c.inbox?.is_connected ? 'connected' : 'disconnected'}`} style={isSelected ? { marginLeft: '28px' } : {}}>
                  {contact.avatar_url ? (
                    <img src={contact.avatar_url} className="conv-avatar-img" alt="Avatar" />
                  ) : (
                    <div className="conv-avatar">{initial}</div>
                  )}
                  <div
                    className="conv-inbox-dot"
                    style={{ backgroundColor: c.inbox?.is_connected ? 'var(--success)' : 'var(--danger)' }}
                    title={c.inbox?.name || 'Canal'}
                  />
                </div>

                <div className="conv-details">
                  <div className="conv-row1">
                    <span className="conv-name">{contact.name || contact.phone || 'Sem Nome'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {/* SLA indicator dot */}
                      {slaStatus && slaStatus !== 'ok' && (
                        <div className={`sla-dot ${slaStatus}`} title={slaStatus === 'warn' ? 'SLA em risco' : 'SLA estourado'} />
                      )}
                      <span className="conv-time">{formatTime(c.last_message_at)}</span>
                    </div>
                  </div>
                  <div className="conv-row2">
                    <span className="conv-preview">{c.last_message_preview || 'Sem mensagens...'}</span>
                    {c.unread_count > 0 && <span className="conv-badge">{c.unread_count}</span>}
                  </div>

                  {/* Labels */}
                  {c.labels && c.labels.length > 0 && (
                    <div className="conv-tags-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px', marginBottom: '2px' }}>
                      {c.labels.map(l => {
                        const lbl = l.label;
                        if (!lbl) return null;
                        return (
                          <span key={lbl.id} className="conv-tag"
                            style={{ background: lbl.color || '#6366f1', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase' }}>
                            {lbl.name}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="conv-row3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {c.inbox?.name || 'WhatsApp'}
                    </span>
                    {c.agent ? (
                      <div className="conv-agent-min" title={`Atribuído a: ${c.agent.name}`}>
                        {c.agent.name.substring(0, 2).toUpperCase()}
                      </div>
                    ) : (
                      <button
                        className="btn-assign-inline"
                        onClick={(e) => handleInlineAssign(e, c.id)}
                        style={{ marginLeft: 'auto', fontSize: '10px', padding: '2px 8px', background: 'var(--accent)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Atribuir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Global Search Messages Results */}
        {searchQuery && searchQuery.trim().length >= 2 && (
          <>
            {foundMessages.length > 0 ? (
              <>
                <div style={{ padding: '14px 16px 6px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', borderTop: '1px solid var(--border)', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={12} />
                  Mensagens no Histórico
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {foundMessages.map(msg => {
                    const conv    = msg.conversation || {};
                    const contact = conv.contact || {};
                    const dateStr = new Date(msg.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                    const matchingSnippet = msg.content || `[${msg.message_type}]`;
                    const term = searchQuery.trim();
                    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                    const highlightedContent = matchingSnippet.replace(regex, '<mark style="background: rgba(99,102,241,0.25); color: var(--text-primary); border-radius: 2px; padding: 0 1px;">$1</mark>');
                    return (
                      <div key={msg.id} className="conv-item search-msg-item" onClick={() => handleSelectMessageResult(conv.id, msg.id)}
                        style={{ padding: '10px 16px', cursor: 'pointer', transition: 'background 150ms' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', width: '100%' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{contact.name || contact.phone || 'Sem Nome'}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{dateStr}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', wordBreak: 'break-word', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                          title={matchingSnippet} dangerouslySetInnerHTML={{ __html: `"${highlightedContent}"` }} />
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ padding: '14px 16px 6px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderTop: '1px solid var(--border)', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={12} /> Nenhuma mensagem encontrada
              </div>
            )}
          </>
        )}
      </div>

      {showAssignModal && (
        <AssignModal conversationId={assigningConvId} onClose={() => setShowAssignModal(false)} onAssigned={handleAssignedSuccess} />
      )}
    </section>
  );
}
