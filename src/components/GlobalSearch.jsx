import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../AppContext';
import { getSupabase } from '../supabase';
import { Search, MessageSquare, User, X, ArrowRight } from 'lucide-react';

export default function GlobalSearch({ onClose }) {
  const { setActiveConversation, setActiveView } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ contacts: [], conversations: [], messages: [] });
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const flatResults = [
    ...results.contacts.map(r => ({ ...r, _type: 'contact' })),
    ...results.conversations.map(r => ({ ...r, _type: 'conversation' })),
    ...results.messages.map(r => ({ ...r, _type: 'message' })),
  ];

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResults({ contacts: [], conversations: [], messages: [] });
      return;
    }

    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) { setLoading(false); return; }

    try {
      const term = q.trim();

      // 1. Contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name, phone, email, avatar_url')
        .or(`name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(5);

      // 2. Conversations by last message preview
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, last_message_preview, status, contact:contacts(name, phone, avatar_url)')
        .ilike('last_message_preview', `%${term}%`)
        .limit(5);

      // 3. Messages content
      const { data: messages } = await supabase
        .from('messages')
        .select('id, content, conversation_id, created_at, conversation:conversations(contact:contacts(name, phone))')
        .ilike('content', `%${term}%`)
        .neq('message_type', 'activity')
        .order('created_at', { ascending: false })
        .limit(8);

      setResults({
        contacts: contacts || [],
        conversations: conversations || [],
        messages: messages || []
      });
      setActiveIndex(0);
    } catch (err) {
      console.error('Global search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 300);
  };

  const openConversation = async (conversationId) => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase
      .from('conversations')
      .select('*, contact:contacts(*), inbox:inboxes(*)')
      .eq('id', conversationId)
      .single();
    if (data) {
      setActiveView('conversations');
      setActiveConversation(data);
      onClose();
    }
  };

  const handleSelect = (item) => {
    if (item._type === 'contact') {
      // Open contacts view filtered by this contact
      setActiveView('contacts');
      onClose();
    } else if (item._type === 'conversation') {
      openConversation(item.id);
    } else if (item._type === 'message') {
      openConversation(item.conversation_id);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (flatResults[activeIndex]) handleSelect(flatResults[activeIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const highlight = (text, q) => {
    if (!q || !text) return text || '';
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: 'rgba(99,102,241,0.4)', color: 'var(--text-primary)', borderRadius: '2px', padding: '0 2px' }}>
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  const isEmpty = flatResults.length === 0;
  let flatIdx = 0;

  return (
    <div className="global-search-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="global-search-box" onKeyDown={handleKeyDown}>
        {/* Input */}
        <div className="global-search-input-row">
          <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="global-search-input"
            placeholder="Buscar conversas, contatos, mensagens..."
            value={query}
            onChange={handleQueryChange}
          />
          {loading && (
            <div style={{ width: '16px', height: '16px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', flexShrink: 0 }} />
          )}
          {!loading && query && (
            <button onClick={() => { setQuery(''); setResults({ contacts: [], conversations: [], messages: [] }); inputRef.current?.focus(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="global-search-results">
          {!query || query.trim().length < 2 ? (
            <div className="global-search-empty">
              <Search size={32} style={{ opacity: 0.2, marginBottom: '8px' }} />
              <div>Digite ao menos 2 caracteres para buscar</div>
            </div>
          ) : isEmpty && !loading ? (
            <div className="global-search-empty">
              <MessageSquare size={32} style={{ opacity: 0.2, marginBottom: '8px' }} />
              <div>Nenhum resultado encontrado para "<strong>{query}</strong>"</div>
            </div>
          ) : (
            <>
              {/* Contacts */}
              {results.contacts.length > 0 && (
                <>
                  <div className="global-search-section-title">Contatos</div>
                  {results.contacts.map(contact => {
                    const idx = flatIdx++;
                    return (
                      <div
                        key={`c-${contact.id}`}
                        className={`global-search-result-item ${activeIndex === idx ? 'active' : ''}`}
                        onClick={() => handleSelect({ ...contact, _type: 'contact' })}
                        onMouseEnter={() => setActiveIndex(idx)}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--accent)', flexShrink: 0, overflow: 'hidden' }}>
                          {contact.avatar_url
                            ? <img src={contact.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                            : (contact.name || contact.phone || 'C').charAt(0).toUpperCase()
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{highlight(contact.name || contact.phone, query)}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{highlight(contact.phone, query)}</div>
                        </div>
                        <User size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      </div>
                    );
                  })}
                </>
              )}

              {/* Conversations */}
              {results.conversations.length > 0 && (
                <>
                  <div className="global-search-section-title">Conversas</div>
                  {results.conversations.map(conv => {
                    const idx = flatIdx++;
                    const contactName = conv.contact?.name || conv.contact?.phone || 'Sem nome';
                    return (
                      <div
                        key={`conv-${conv.id}`}
                        className={`global-search-result-item ${activeIndex === idx ? 'active' : ''}`}
                        onClick={() => handleSelect({ ...conv, _type: 'conversation' })}
                        onMouseEnter={() => setActiveIndex(idx)}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', flexShrink: 0 }}>
                          <MessageSquare size={14} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{contactName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {highlight(conv.last_message_preview, query)}
                          </div>
                        </div>
                        <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      </div>
                    );
                  })}
                </>
              )}

              {/* Messages */}
              {results.messages.length > 0 && (
                <>
                  <div className="global-search-section-title">Mensagens</div>
                  {results.messages.map(msg => {
                    const idx = flatIdx++;
                    const contactName = msg.conversation?.contact?.name || msg.conversation?.contact?.phone || 'Contato';
                    return (
                      <div
                        key={`m-${msg.id}`}
                        className={`global-search-result-item ${activeIndex === idx ? 'active' : ''}`}
                        onClick={() => handleSelect({ ...msg, _type: 'message' })}
                        onMouseEnter={() => setActiveIndex(idx)}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0, fontSize: '12px' }}>
                          💬
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>{contactName}</div>
                          <div style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {highlight(msg.content, query)}
                          </div>
                        </div>
                        <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="global-search-footer">
          <span><kbd>↑↓</kbd> navegar</span>
          <span><kbd>Enter</kbd> abrir</span>
          <span><kbd>Esc</kbd> fechar</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
