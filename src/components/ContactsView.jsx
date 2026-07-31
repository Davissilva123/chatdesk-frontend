import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { getSupabase, logAuditAction } from '../supabase';
import { showToast } from '../utils';
import { 
  Search, 
  Download, 
  UserPlus, 
  MessageSquare, 
  Edit3, 
  Trash2, 
  ShieldAlert, 
  Unlock,
  X 
} from 'lucide-react';

export default function ContactsView() {
  const { 
    setActiveView, 
    setActiveConversation, 
    inboxes,
    currentAgent
  } = useApp();

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false); // false | 'create' | 'edit'
  const [selectedContact, setSelectedContact] = useState(null);
  
  // Form fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Custom Attributes
  const [customAttributes, setCustomAttributes] = useState([]);
  const [customAttributeValues, setCustomAttributeValues] = useState({});

  const fetchContacts = async (query = '') => {
    const supabase = getSupabase();
    if (!supabase) return;

    setLoading(true);
    try {
      let dbQuery = supabase.from('contacts').select('*');
      if (query) {
        dbQuery = dbQuery.or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`);
      }
      dbQuery = dbQuery.order('name', { ascending: true });

      const { data, error } = await dbQuery;
      if (error) throw error;

      setContacts(data || []);
    } catch (err) {
      console.error('Erro ao buscar contatos:', err);
      showToast('Erro ao carregar contatos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    async function loadAttrs() {
      if (!modalOpen) return;
      const supabase = getSupabase();
      if (!supabase) return;
      try {
        const { data: attrs } = await supabase.from('custom_attributes').select('*').eq('entity_type', 'contact');
        setCustomAttributes(attrs || []);
        
        if (selectedContact?.id) {
          const { data: vals } = await supabase.from('custom_attribute_values').select('*').eq('entity_id', selectedContact.id);
          const valueMap = {};
          (vals || []).forEach(v => {
            valueMap[v.attribute_id] = v;
          });
          setCustomAttributeValues(valueMap);
        } else {
          setCustomAttributeValues({});
        }
      } catch (err) {
        console.error('Erro ao carregar atributos personalizados:', err);
      }
    }
    loadAttrs();
  }, [modalOpen, selectedContact]);

  const handleCustomAttrChange = (attrId, value) => {
    setCustomAttributeValues(prev => ({
      ...prev,
      [attrId]: { ...(prev[attrId] || {}), value }
    }));
  };

  const handleStartChat = async (contact) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      // 1. Check for existing conversation with the contact
      const { data: existing, error: errExist } = await supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts(*),
          agent:agents(*),
          inbox:inboxes(*),
          labels:conversation_labels(label:labels(*))
        `)
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false });

      if (errExist) throw errExist;

      if (existing && existing.length > 0) {
        setActiveConversation(existing[0]);
        setActiveView('conversations');
        window.location.hash = '#conversations';
        return;
      }

      // 2. Create new conversation if none exists
      const defaultInbox = inboxes.find(i => i.is_connected) || inboxes[0];
      if (!defaultInbox) {
        showToast('Nenhum canal ativo de WhatsApp conectado para iniciar o chat.', 'error');
        return;
      }

      const { data: created, error: createError } = await supabase
        .from('conversations')
        .insert({
          company_id: currentAgent?.company_id || contact.company_id,
          contact_id: contact.id,
          inbox_id: defaultInbox.id,
          status: 'open',
          unread_count: 0
        })
        .select(`
          *,
          contact:contacts(*),
          agent:agents(*),
          inbox:inboxes(*),
          labels:conversation_labels(label:labels(*))
        `)
        .single();

      if (createError) throw createError;

      setActiveConversation(created);
      setActiveView('conversations');
      window.location.hash = '#conversations';
    } catch (err) {
      console.error('Erro ao iniciar chat:', err);
      showToast('Erro ao iniciar conversa: ' + err.message, 'error');
    }
  };

  const handleBlockToggle = async (contact) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const actionText = contact.is_blocked ? 'desbloquear' : 'bloquear';
    if (!window.confirm(`Deseja realmente ${actionText} este contato? ${contact.is_blocked ? 'Ele voltará a poder enviar mensagens.' : 'Você não receberá mais mensagens dele.'}`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .update({ is_blocked: !contact.is_blocked })
        .eq('id', contact.id);

      if (error) throw error;

      showToast(`Contato ${contact.is_blocked ? 'desbloqueado' : 'bloqueado'} com sucesso!`, 'success');
      logAuditAction(contact.is_blocked ? 'UNBLOCK_CONTACT' : 'BLOCK_CONTACT', { contact_name: contact.name, phone: contact.phone }, contact.id);
      fetchContacts(searchQuery);
    } catch (err) {
      console.error(err);
      showToast(`Erro ao ${actionText} contato: ` + err.message, 'error');
    }
  };

  const handleDeleteContact = async (contactId) => {
    const supabase = getSupabase();
    if (!supabase) return;

    if (!window.confirm('Tem certeza que deseja excluir permanentemente este contato? Isso também excluirá todas as conversas e mensagens associadas.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      showToast('Contato excluído com sucesso!', 'success');
      logAuditAction('DELETE_CONTACT', { contact_id: contactId }, contactId);
      fetchContacts(searchQuery);
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir contato: ' + err.message, 'error');
    }
  };

  const handleExportCSV = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    showToast('Carregando contatos para exportação...', 'info');
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        showToast('Nenhum contato cadastrado para exportar.', 'warning');
        return;
      }

      const headers = ['Nome', 'Telefone', 'E-mail', 'Bloqueado', 'Criado em', 'Notas'];
      const csvRows = [
        headers.join(','),
        ...data.map(c => [
          `"${(c.name || '').replace(/"/g, '""')}"`,
          `"${(c.phone || '')}"`,
          `"${(c.email || '').replace(/"/g, '""')}"`,
          c.is_blocked ? 'Sim' : 'Não',
          new Date(c.created_at).toLocaleDateString('pt-BR'),
          `"${(c.notes || '').replace(/"/g, '""')}"`
        ].join(','))
      ];

      const csvContent = "\uFEFF" + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `contatos_chatdesk_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      
      link.click();
      document.body.removeChild(link);
      showToast('Contatos exportados com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao exportar contatos.', 'error');
    }
  };

  const handleOpenCreateModal = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormNotes('');
    setFormCity('');
    setFormCountry('');
    setFormCompany('');
    setSelectedContact(null);
    setModalOpen('create');
  };

  const handleOpenEditModal = (contact) => {
    setSelectedContact(contact);
    setFormName(contact.name || '');
    setFormPhone(contact.phone || '');
    setFormEmail(contact.email || '');
    setFormNotes(contact.notes || '');
    setFormCity(contact.city || '');
    setFormCountry(contact.country || '');
    setFormCompany(contact.company || '');
    setModalOpen('edit');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    setSaving(true);
    try {
      if (modalOpen === 'create') {
        const cleanedPhone = formPhone.replace(/\D/g, '');
        const { data: insertRes, error } = await supabase
          .from('contacts')
          .insert({ 
            name: formName.trim(), 
            phone: cleanedPhone, 
            email: formEmail.trim(), 
            notes: formNotes.trim(),
            city: formCity.trim(),
            country: formCountry.trim(),
            company: formCompany.trim()
          })
          .select()
          .single();

        if (error) throw error;
        
        const newContactId = insertRes.id;
        
        // Salvar atributos
        const upsertPromises = Object.entries(customAttributeValues).map(async ([attrId, valObj]) => {
          if (!valObj.value && !valObj.id) return null; 
          return supabase.from('custom_attribute_values').insert({ attribute_id: attrId, entity_id: newContactId, value: valObj.value });
        });
        await Promise.all(upsertPromises);
        showToast('Contato criado com sucesso!', 'success');
      } else if (modalOpen === 'edit' && selectedContact) {
        const cleanedPhone = formPhone.replace(/\D/g, '');
        const { error } = await supabase
          .from('contacts')
          .update({ 
            name: formName.trim(), 
            phone: cleanedPhone,
            email: formEmail.trim(), 
            notes: formNotes.trim(),
            city: formCity.trim(),
            country: formCountry.trim(),
            company: formCompany.trim()
          })
          .eq('id', selectedContact.id);

        if (error) throw error;
        
        // Atualizar atributos
        const upsertPromises = Object.entries(customAttributeValues).map(async ([attrId, valObj]) => {
          if (!valObj.value && !valObj.id) return null; 
          if (valObj.id) {
            return supabase.from('custom_attribute_values').update({ value: valObj.value, updated_at: new Date().toISOString() }).eq('id', valObj.id);
          } else {
            return supabase.from('custom_attribute_values').insert({ attribute_id: attrId, entity_id: selectedContact.id, value: valObj.value });
          }
        });
        await Promise.all(upsertPromises);
        
        showToast('Contato atualizado com sucesso!', 'success');
      }

      setModalOpen(false);
      fetchContacts(searchQuery);
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar contato: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Contatos</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Gerenciamento de clientes integrados ao ChatDesk</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn-cancel" 
            onClick={handleExportCSV} 
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: 'var(--border)' }}
          >
            <Download size={14} /> Exportar CSV
          </button>
          <button 
            className="btn-resolve" 
            onClick={handleOpenCreateModal} 
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <UserPlus size={14} /> Novo Contato
          </button>
        </div>
      </div>

      <div className="search-container" style={{ marginBottom: '20px', maxWidth: '400px', display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0 12px' }}>
        <Search size={16} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
        <input 
          type="text" 
          className="search-input" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar por nome, telefone ou e-mail..."
          style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', height: '38px', width: '100%', outline: 'none' }}
        />
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <table className="ui-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Nome</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Telefone</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>E-mail</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Notas</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Criado em</th>
              <th style={{ width: '220px', textAlign: 'center', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Buscando contatos...
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Nenhum contato encontrado.
                </td>
              </tr>
            ) : (
              contacts.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {c.name || 'Sem nome'}
                    {c.is_blocked && (
                      <span className="badge-blocked" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '10px', marginLeft: '6px', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>
                        Bloqueado
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--text-primary)' }}>
                    {c.phone || '-'}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{c.email || '-'}</td>
                  <td 
                    style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} 
                    title={c.notes || ''}
                  >
                    {c.notes || '-'}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        className="btn-cancel" 
                        onClick={() => handleStartChat(c)}
                        style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', borderColor: 'var(--border)' }}
                        title="Iniciar conversa"
                      >
                        <MessageSquare size={12} /> Conversar
                      </button>
                      <button 
                        className="btn-cancel" 
                        onClick={() => handleOpenEditModal(c)}
                        style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', borderColor: 'var(--border)' }}
                        title="Editar contato"
                      >
                        <Edit3 size={12} /> Editar
                      </button>
                      <button 
                        className="btn-cancel" 
                        onClick={() => handleBlockToggle(c)}
                        style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', borderColor: 'var(--border)', color: c.is_blocked ? 'var(--success)' : 'var(--danger)' }}
                        title={c.is_blocked ? 'Desbloquear contato' : 'Bloquear contato'}
                      >
                        {c.is_blocked ? <Unlock size={12} /> : <ShieldAlert size={12} />}
                        {c.is_blocked ? 'Desbloquear' : 'Bloquear'}
                      </button>
                      <button 
                        className="btn-cancel" 
                        onClick={() => handleDeleteContact(c.id)}
                        style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        title="Excluir contato"
                      >
                        <Trash2 size={12} /> Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Contact Modal Overlay */}
      {modalOpen && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-card" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalOpen === 'create' ? 'Novo Contato' : 'Editar Detalhes do Contato'}
              </h3>
              <button 
                className="modal-close" 
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="form-field">
                <label htmlFor="modal-c-name">Nome Completo</label>
                <input 
                  type="text" 
                  id="modal-c-name" 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Maria Souza" 
                  required 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>
              
              <div className="form-field">
                <label htmlFor="modal-c-phone">Telefone (WhatsApp)</label>
                <input 
                  type="text" 
                  id="modal-c-phone" 
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Ex: 5511999999999" 
                  required 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="modal-c-email">E-mail</label>
                <input 
                  type="email" 
                  id="modal-c-email" 
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="email@exemplo.com" 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="modal-c-company">Nome da Empresa</label>
                <input 
                  type="text" 
                  id="modal-c-company" 
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  placeholder="Ex: ChatDesk Corp" 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-field">
                  <label htmlFor="modal-c-city">Cidade</label>
                  <input 
                    type="text" 
                    id="modal-c-city" 
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="Ex: São Paulo" 
                    style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                  />
                </div>
                
                <div className="form-field">
                  <label htmlFor="modal-c-country">País</label>
                  <select 
                    id="modal-c-country" 
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
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

              {customAttributes.length > 0 && (
                <>
                  <div style={{ margin: '24px 0 12px 0', borderBottom: '1px solid var(--border)' }}></div>
                  <h4 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text-primary)', fontWeight: 600 }}>Atributos Personalizados</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {customAttributes.map(attr => {
                      const valObj = customAttributeValues[attr.id];
                      const currentVal = valObj ? (valObj.value || '') : '';
                      return (
                        <div key={attr.id} className="form-field">
                          <label>{attr.name}</label>
                          {attr.field_type === 'boolean' ? (
                            <select 
                              value={currentVal} 
                              onChange={(e) => handleCustomAttrChange(attr.id, e.target.value)}
                              style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                            >
                              <option value="">Não informado</option>
                              <option value="true">Sim</option>
                              <option value="false">Não</option>
                            </select>
                          ) : attr.field_type === 'number' ? (
                            <input 
                              type="number" 
                              value={currentVal} 
                              onChange={(e) => handleCustomAttrChange(attr.id, e.target.value)}
                              placeholder="Digite um número"
                              style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                            />
                          ) : attr.field_type === 'date' ? (
                            <input 
                              type="date" 
                              value={currentVal} 
                              onChange={(e) => handleCustomAttrChange(attr.id, e.target.value)}
                              style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                            />
                          ) : (
                            <input 
                              type="text" 
                              value={currentVal} 
                              onChange={(e) => handleCustomAttrChange(attr.id, e.target.value)}
                              placeholder="Preencher valor..."
                              style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="form-field">
                <label htmlFor="modal-c-notes">Observações / Notas</label>
                <textarea 
                  id="modal-c-notes" 
                  rows="4" 
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Alguma observação sobre este cliente..."
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-resolve"
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar Contato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
