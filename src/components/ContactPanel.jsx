import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { 
  getSupabase, 
  assignConversationAgent, 
  assignConversationTeam, 
  updateConversationPriority 
} from '../supabase';
import { showToast } from '../utils';
import { ChevronRight, Edit3, Download, X, Eye } from 'lucide-react';

export default function ContactPanel() {
  const { 
    activeConversation, 
    setActiveConversation,
    agents, 
    teams,
    contactCollapsed, 
    setContactCollapsed,
    setConversations 
  } = useApp();

  const [activeTab, setActiveTab] = useState('details'); // details | media | history
  const [customAttributes, setCustomAttributes] = useState([]);
  const [customAttributeValues, setCustomAttributeValues] = useState({});
  const [mediaMessages, setMediaMessages] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [previousConversations, setPreviousConversations] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);

  // Edit contact fields
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  const contact = activeConversation?.contact || {};

  // Initialize edit fields when modal opens
  useEffect(() => {
    if (isEditingContact && contact) {
      setEditName(contact.name || '');
      setEditPhone(contact.phone || '');
      setEditEmail(contact.email || '');
      setEditNotes(contact.notes || '');
      setEditCity(contact.city || '');
      setEditCountry(contact.country || '');
      setEditCompany(contact.company || '');
    }
  }, [isEditingContact, contact]);

  // Load Custom Attributes & Values
  useEffect(() => {
    async function loadCustomAttributes() {
      if (!contact.id) return;
      const supabase = getSupabase();
      if (!supabase) return;

      try {
        let entityIds = [contact.id];
        if (activeConversation?.id) entityIds.push(activeConversation.id);

        const [attrsRes, valsRes] = await Promise.all([
          supabase.from('custom_attributes').select('*'),
          supabase.from('custom_attribute_values').select('*').in('entity_id', entityIds)
        ]);

        if (attrsRes.error) throw attrsRes.error;
        if (valsRes.error) throw valsRes.error;

        setCustomAttributes(attrsRes.data || []);
        
        const valueMap = {};
        (valsRes.data || []).forEach(v => {
          valueMap[v.attribute_id] = v;
        });
        setCustomAttributeValues(valueMap);
      } catch (err) {
        console.error('Erro ao buscar atributos personalizados:', err);
      }
    }

    if (activeTab === 'details' && contact.id) {
      loadCustomAttributes();
    }
  }, [contact.id, activeConversation?.id, activeTab]);

  // Load Media Files
  useEffect(() => {
    async function loadMedia() {
      if (!activeConversation?.id) return;
      const supabase = getSupabase();
      if (!supabase) return;

      setLoadingMedia(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', activeConversation.id)
          .in('message_type', ['image', 'audio', 'file'])
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMediaMessages(data || []);
      } catch (err) {
        console.error('Erro ao buscar mídias:', err);
        showToast('Erro ao carregar mídias.', 'error');
      } finally {
        setLoadingMedia(false);
      }
    }

    if (activeTab === 'media' && activeConversation?.id) {
      loadMedia();
    }
  }, [activeConversation?.id, activeTab]);

  // Load Previous Conversations
  useEffect(() => {
    async function loadPrevious() {
      if (!contact.id) return;
      const supabase = getSupabase();
      if (!supabase) return;

      setLoadingHistory(true);
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('contact_id', contact.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        const history = (data || []).filter(c => c.id !== activeConversation?.id);
        setPreviousConversations(history);
      } catch (err) {
        console.error('Erro ao buscar conversas anteriores:', err);
      } finally {
        setLoadingHistory(false);
      }
    }

    if (activeTab === 'history' && contact.id) {
      loadPrevious();
    }
  }, [contact.id, activeTab, activeConversation?.id]);

  if (!activeConversation) {
    return null;
  }

  if (contactCollapsed) {
    return null;
  }

  // Event Handlers for Conversation Properties
  const handleAgentChange = async (e) => {
    const val = e.target.value;
    try {
      await assignConversationAgent(activeConversation.id, val || null);
      setActiveConversation(prev => ({ ...prev, assigned_agent_id: val ? val : null }));
      setConversations(prev => prev.map(c => c.id === activeConversation.id ? { ...c, assigned_agent_id: val ? val : null } : c));
      showToast('Atribuição de agente atualizada!', 'success');
    } catch (err) {
      showToast('Erro ao atualizar agente.', 'error');
    }
  };

  const handleTeamChange = async (e) => {
    const val = e.target.value;
    try {
      await assignConversationTeam(activeConversation.id, val || null);
      setActiveConversation(prev => ({ ...prev, team_id: val ? val : null }));
      showToast('Atribuição de equipe atualizada!', 'success');
    } catch (err) {
      showToast('Erro ao atualizar equipe.', 'error');
    }
  };

  const handlePriorityChange = async (e) => {
    const val = e.target.value;
    try {
      await updateConversationPriority(activeConversation.id, val);
      setActiveConversation(prev => ({ ...prev, priority: val }));
      showToast('Prioridade da conversa atualizada!', 'success');
    } catch (err) {
      showToast('Erro ao atualizar prioridade.', 'error');
    }
  };

  // Custom Attribute Upsert Handler
  const handleCustomAttributeUpsert = async (attrId, entityId, valueId, newValue) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      if (valueId) {
        // Update existing value
        const { error } = await supabase
          .from('custom_attribute_values')
          .update({ value: newValue, updated_at: new Date().toISOString() })
          .eq('id', valueId);

        if (error) throw error;
        
        setCustomAttributeValues(prev => ({
          ...prev,
          [attrId]: { ...prev[attrId], value: newValue }
        }));
        showToast('Atributo atualizado!', 'success');
      } else {
        // Insert new value
        if (newValue.trim() === '') return;
        const { data: inserted, error } = await supabase
          .from('custom_attribute_values')
          .insert({
            attribute_id: attrId,
            entity_id: entityId,
            value: newValue
          })
          .select()
          .single();

        if (error) throw error;

        setCustomAttributeValues(prev => ({
          ...prev,
          [attrId]: inserted
        }));
        showToast('Atributo salvo!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar atributo: ' + err.message, 'error');
    }
  };

  // Edit Contact Submit Handler
  const handleEditContactSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    setSavingContact(true);
    try {
      const cleanedPhone = editPhone.replace(/\D/g, '');
      const { error } = await supabase
        .from('contacts')
        .update({ 
          name: editName, 
          phone: cleanedPhone,
          email: editEmail, 
          notes: editNotes,
          city: editCity,
          country: editCountry,
          company: editCompany
        })
        .eq('id', contact.id);

      if (error) throw error;

      showToast('Contato atualizado com sucesso!', 'success');
      setActiveConversation(prev => ({
        ...prev,
        contact: {
          ...prev.contact,
          name: editName,
          phone: cleanedPhone,
          email: editEmail,
          notes: editNotes,
          city: editCity,
          country: editCountry,
          company: editCompany
        }
      }));
      setIsEditingContact(false);
    } catch (err) {
      showToast('Erro ao atualizar contato: ' + err.message, 'error');
    } finally {
      setSavingContact(false);
    }
  };

  const initialLetter = (contact.name || contact.phone || 'C').substring(0, 1).toUpperCase();

  return (
    <aside id="contact-panel" className={`column-col4 ${contactCollapsed ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header Panel */}
      <div className="col4-header" style={{ borderBottom: 'none', paddingBottom: '8px' }}>
        <h3 className="col4-title">Informações</h3>
        <button 
          className="toolbar-btn" 
          onClick={() => setContactCollapsed(true)} 
          title="Recolher Painel"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {!activeConversation ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Nenhuma conversa ativa
        </div>
      ) : (
        <>
          {/* Tabs Header */}
      <div 
        className="col4-tabs" 
        style={{ 
          display: 'flex', 
          borderBottom: '1px solid var(--border)', 
          background: 'rgba(0,0,0,0.15)', 
          padding: '4px', 
          gap: '4px', 
          margin: '0 12px 12px 12px', 
          borderRadius: 'var(--radius-sm)' 
        }}
      >
        <button 
          onClick={() => setActiveTab('details')}
          className={`col2-tab-btn ${activeTab === 'details' ? 'active' : ''}`} 
          style={{ 
            flex: 1, 
            fontSize: '11px', 
            padding: '6px 0', 
            border: 'none', 
            textAlign: 'center', 
            cursor: 'pointer', 
            color: 'var(--text-primary)', 
            background: activeTab === 'details' ? 'var(--bg-secondary)' : 'transparent', 
            fontWeight: activeTab === 'details' ? '600' : 'normal',
            borderRadius: 'var(--radius-sm)' 
          }}
        >
          Detalhes
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`col2-tab-btn ${activeTab === 'history' ? 'active' : ''}`} 
          style={{ 
            flex: 1, 
            fontSize: '11px', 
            padding: '6px 0', 
            border: 'none', 
            textAlign: 'center', 
            cursor: 'pointer', 
            color: 'var(--text-primary)', 
            background: activeTab === 'history' ? 'var(--bg-secondary)' : 'transparent', 
            fontWeight: activeTab === 'history' ? '600' : 'normal',
            borderRadius: 'var(--radius-sm)' 
          }}
        >
          Histórico
        </button>
        <button 
          onClick={() => setActiveTab('media')}
          className={`col2-tab-btn ${activeTab === 'media' ? 'active' : ''}`} 
          style={{ 
            flex: 1, 
            fontSize: '11px', 
            padding: '6px 0', 
            border: 'none', 
            textAlign: 'center', 
            cursor: 'pointer', 
            color: 'var(--text-primary)', 
            background: activeTab === 'media' ? 'var(--bg-secondary)' : 'transparent', 
            fontWeight: activeTab === 'media' ? '600' : 'normal',
            borderRadius: 'var(--radius-sm)' 
          }}
        >
          Mídias
        </button>
      </div>

      {/* Scroll Content */}
      <div className="col4-scroll" style={{ overflowY: 'auto' }}>
        {activeTab === 'details' ? (
          <>
            {/* Profile Area */}
            <div className="contact-avatar-sec" style={{ marginTop: '4px' }}>
              <div className="contact-avatar-big">
                {contact.avatar_url ? (
                  <img src={contact.avatar_url} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="Avatar" />
                ) : (
                  initialLetter
                )}
              </div>
              <div className="contact-name-big">{contact.name || contact.phone || 'Sem Nome'}</div>
              <div className="contact-phone-big">{contact.phone || ''}</div>
              <button 
                className="btn-cancel" 
                onClick={() => setIsEditingContact(true)} 
                style={{ fontSize: '11px', padding: '4px 8px', marginTop: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Edit3 size={10} /> Editar Contato
              </button>
            </div>

            {/* Properties Section */}
            <div className="col4-section">
              <h4 className="col4-sec-title">Propriedades</h4>
              
              <div className="form-field" style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '10px' }}>Atribuído a</label>
                <select 
                  value={activeConversation.assigned_agent_id || ''} 
                  onChange={handleAgentChange}
                  style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius)' }}
                >
                  <option value="">Não atribuído</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field" style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '10px' }}>Equipe</label>
                <select 
                  value={activeConversation.team_id || ''} 
                  onChange={handleTeamChange}
                  style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius)' }}
                >
                  <option value="">Nenhuma</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field" style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '10px' }}>Prioridade</label>
                <select 
                  value={activeConversation.priority || 'none'} 
                  onChange={handlePriorityChange}
                  style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius)' }}
                >
                  <option value="none">Nenhuma</option>
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              <div className="info-grid" style={{ marginTop: '12px' }}>
                <div className="info-card">
                  <span className="info-label">ID Conversa</span>
                  <span className="info-value">#{activeConversation.id.substring(0, 8)}</span>
                </div>
                <div className="info-card">
                  <span className="info-label">Criada em</span>
                  <span className="info-value" style={{ fontSize: '10px' }}>
                    {new Date(activeConversation.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            {/* SLA Section */}
            <div className="col4-section">
              <h4 className="col4-sec-title">Acordo de SLA</h4>
              
              <div className="info-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="info-label">Primeira Resposta</span>
                  <span className="info-value" style={{ fontSize: '11px', color: 'var(--success)' }}>⏱ 2h restantes</span>
                </div>
                <div className="sla-progress-bar">
                  <div className="sla-progress-fill" style={{ width: '80%' }}></div>
                </div>
              </div>

              <div className="info-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="info-label">Resolução Final</span>
                  <span className="info-value" style={{ fontSize: '11px', color: 'var(--warning)' }}>⏱ 5h restantes</span>
                </div>
                <div className="sla-progress-bar">
                  <div className="sla-progress-fill warning" style={{ width: '45%' }}></div>
                </div>
              </div>
            </div>

            {/* Contact Notes */}
            <div className="col4-section">
              <h4 className="col4-sec-title">Detalhes do Contato</h4>
              <div className="info-card">
                <span className="info-label">E-mail</span>
                <span className="info-value" style={{ fontSize: '11px', wordBreak: 'break-all' }}>{contact.email || 'Não informado'}</span>
              </div>
              <div className="info-card">
                <span className="info-label">Observações / Notas</span>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {contact.notes || 'Sem observações registradas.'}
                </p>
              </div>
            </div>

            {/* Custom Attributes */}
            {customAttributes.filter(a => a.entity_type === 'contact').length > 0 && (
              <div className="col4-section">
                <h4 className="col4-sec-title">Atributos do Contato</h4>
                <div>
                  {customAttributes.filter(a => a.entity_type === 'contact').map(attr => {
                    const valObj = customAttributeValues[attr.id];
                    const currentVal = valObj ? (valObj.value || '') : '';

                    return (
                      <div key={attr.id} className="form-field" style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '10px' }}>{attr.name}</label>
                        {attr.field_type === 'boolean' ? (
                          <select 
                            value={currentVal} 
                            onChange={(e) => handleCustomAttributeUpsert(attr.id, contact.id, valObj?.id, e.target.value)}
                            style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius)' }}
                          >
                            <option value="">Não informado</option>
                            <option value="true">Sim</option>
                            <option value="false">Não</option>
                          </select>
                        ) : attr.field_type === 'number' ? (
                          <input 
                            type="number" 
                            defaultValue={currentVal} 
                            onBlur={(e) => handleCustomAttributeUpsert(attr.id, contact.id, valObj?.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.target.blur();
                              }
                            }}
                            placeholder="Digite um número"
                            style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius)', padding: '0 8px' }}
                          />
                        ) : attr.field_type === 'date' ? (
                          <input 
                            type="date" 
                            value={currentVal} 
                            onChange={(e) => handleCustomAttributeUpsert(attr.id, contact.id, valObj?.id, e.target.value)}
                            style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius)', padding: '0 8px' }}
                          />
                        ) : (
                          <input 
                            type="text" 
                            defaultValue={currentVal} 
                            onBlur={(e) => handleCustomAttributeUpsert(attr.id, contact.id, valObj?.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.target.blur();
                              }
                            }}
                            placeholder="Preencher valor..."
                            style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius)', padding: '0 8px' }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {customAttributes.filter(a => a.entity_type === 'conversation').length > 0 && activeConversation?.id && (
              <div className="col4-section">
                <h4 className="col4-sec-title">Atributos da Conversa</h4>
                <div>
                  {customAttributes.filter(a => a.entity_type === 'conversation').map(attr => {
                    const valObj = customAttributeValues[attr.id];
                    const currentVal = valObj ? (valObj.value || '') : '';

                    return (
                      <div key={attr.id} className="form-field" style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '10px' }}>{attr.name}</label>
                        {attr.field_type === 'boolean' ? (
                          <select 
                            value={currentVal} 
                            onChange={(e) => handleCustomAttributeUpsert(attr.id, activeConversation.id, valObj?.id, e.target.value)}
                            style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius)' }}
                          >
                            <option value="">Não informado</option>
                            <option value="true">Sim</option>
                            <option value="false">Não</option>
                          </select>
                        ) : attr.field_type === 'number' ? (
                          <input 
                            type="number" 
                            defaultValue={currentVal} 
                            onBlur={(e) => handleCustomAttributeUpsert(attr.id, activeConversation.id, valObj?.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.target.blur();
                              }
                            }}
                            placeholder="Digite um número"
                            style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius)', padding: '0 8px' }}
                          />
                        ) : attr.field_type === 'date' ? (
                          <input 
                            type="date" 
                            value={currentVal} 
                            onChange={(e) => handleCustomAttributeUpsert(attr.id, activeConversation.id, valObj?.id, e.target.value)}
                            style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius)', padding: '0 8px' }}
                          />
                        ) : (
                          <input 
                            type="text" 
                            defaultValue={currentVal} 
                            onBlur={(e) => handleCustomAttributeUpsert(attr.id, activeConversation.id, valObj?.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.target.blur();
                              }
                            }}
                            placeholder="Preencher valor..."
                            style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius)', padding: '0 8px' }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'media' ? (
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h4 className="col4-sec-title" style={{ marginBottom: '12px' }}>Arquivos Compartilhados</h4>
            
            {loadingMedia ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
                Carregando mídias...
              </p>
            ) : mediaMessages.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
                Nenhuma mídia compartilhada.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mediaMessages.map(msg => {
                  const dateStr = new Date(msg.created_at).toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });

                  if (msg.message_type === 'image') {
                    return (
                      <div key={msg.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', fontWeight: '500' }}>
                          <span>Imagem</span>
                          <span>{dateStr}</span>
                        </div>
                        <a href={msg.media_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-light)', maxHeight: '140px', background: 'rgba(0,0,0,0.2)' }}>
                          <img src={msg.media_url} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }} alt="Sent media" />
                        </a>
                      </div>
                    );
                  }

                  if (msg.message_type === 'audio') {
                    return (
                      <div key={msg.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', fontWeight: '500' }}>
                          <span>Áudio</span>
                          <span>{dateStr}</span>
                        </div>
                        <audio src={msg.media_url} controls style={{ width: '100%', height: '36px', borderRadius: 'var(--radius-sm)' }}></audio>
                      </div>
                    );
                  }

                  if (msg.message_type === 'file') {
                    const filename = msg.media_filename || 'documento';
                    return (
                      <div key={msg.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', fontWeight: '500' }}>
                          <span>Documento</span>
                          <span>{dateStr}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textHighlight: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 }} title={filename}>
                            {filename}
                          </span>
                          <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="btn-cancel" style={{ padding: '4px 8px', fontSize: '10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', borderColor: 'var(--border)' }}>
                            <Download size={12} /> Baixar
                          </a>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'history' ? (
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h4 className="col4-sec-title" style={{ marginBottom: '12px' }}>Conversas Anteriores</h4>
            
            {loadingHistory ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
                Buscando conversas...
              </p>
            ) : previousConversations.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
                Nenhum histórico encontrado.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {previousConversations.map(conv => (
                  <div 
                    key={conv.id} 
                    onClick={() => setActiveConversation(conv)}
                    style={{ 
                      background: 'var(--bg-secondary)', 
                      border: '1px solid var(--border)', 
                      borderRadius: 'var(--radius-sm)', 
                      padding: '10px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '4px',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600' }}>#{conv.id.substring(0, 6)}</span>
                      <span style={{ 
                        fontSize: '9px', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        background: conv.status === 'resolved' ? 'rgba(34,197,94,0.1)' : 'rgba(255,165,0,0.1)',
                        color: conv.status === 'resolved' ? 'var(--success)' : 'var(--warning)',
                        textTransform: 'uppercase',
                        fontWeight: '600'
                      }}>
                        {conv.status === 'resolved' ? 'Resolvida' : conv.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-primary)', margin: '4px 0 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {conv.last_message_preview || '(Sem mensagens)'}
                    </p>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>
                      {new Date(conv.created_at).toLocaleDateString('pt-BR')} às {new Date(conv.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Edit Contact Modal Overlay */}
      {isEditingContact && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Editar Detalhes do Contato</h3>
              <button 
                className="modal-close" 
                onClick={() => setIsEditingContact(false)}
                disabled={savingContact}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditContactSubmit}>
              <div className="form-field">
                <label htmlFor="edit-c-name">Nome Completo</label>
                <input 
                  type="text" 
                  id="edit-c-name" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  placeholder="Nome do cliente"
                  required
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="form-field">
                <label htmlFor="edit-c-phone">Telefone (WhatsApp)</label>
                <input 
                  type="text" 
                  id="edit-c-phone" 
                  value={editPhone} 
                  onChange={(e) => setEditPhone(e.target.value)} 
                  placeholder="Ex: 5511999999999"
                  required
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="form-field">
                <label htmlFor="edit-c-email">E-mail</label>
                <input 
                  type="email" 
                  id="edit-c-email" 
                  value={editEmail} 
                  onChange={(e) => setEditEmail(e.target.value)} 
                  placeholder="email@exemplo.com"
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="edit-c-company">Nome da Empresa</label>
                <input 
                  type="text" 
                  id="edit-c-company" 
                  value={editCompany} 
                  onChange={(e) => setEditCompany(e.target.value)} 
                  placeholder="Ex: ChatDesk Corp"
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-field">
                  <label htmlFor="edit-c-city">Cidade</label>
                  <input 
                    type="text" 
                    id="edit-c-city" 
                    value={editCity} 
                    onChange={(e) => setEditCity(e.target.value)} 
                    placeholder="Ex: São Paulo"
                    style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                  />
                </div>
                
                <div className="form-field">
                  <label htmlFor="edit-c-country">País</label>
                  <select 
                    id="edit-c-country" 
                    value={editCountry} 
                    onChange={(e) => setEditCountry(e.target.value)} 
                    style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Selecione...</option>
                    <option value="Brasil">Brasil</option>
                    <option value="Portugal">Portugal</option>
                    <option value="Estados Unidos">Estados Unidos</option>
                    <option value="Espanha">Espanha</option>
                    <option value="Argentina">Argentina</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="edit-c-notes">Observações / Notas</label>
                <textarea 
                  id="edit-c-notes" 
                  rows="4" 
                  value={editNotes} 
                  onChange={(e) => setEditNotes(e.target.value)} 
                  placeholder="Algum detalhe importante sobre o cliente..."
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setIsEditingContact(false)}
                  disabled={savingContact}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-resolve"
                  disabled={savingContact}
                >
                  {savingContact ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}
    </aside>
  );
}
