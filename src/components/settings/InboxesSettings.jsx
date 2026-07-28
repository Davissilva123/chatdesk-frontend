import React, { useState, useEffect, useRef } from 'react';
import { getSupabase } from '../../supabase';
import { 
  disconnectWaSession, 
  startWaSession, 
  getQRCode, 
  getConnectionStatus 
} from '../../whatsapp';
import { showToast } from '../../utils';
import { useApp } from '../../AppContext';
import { Plus, Sliders, Trash2, X, Copy, Check, Eye } from 'lucide-react';

export default function InboxesSettings() {
  const { currentAgent } = useApp();
  const [inboxes, setInboxes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Form / Current values
  const [newInboxName, setNewInboxName] = useState('');
  const [newInboxPhone, setNewInboxPhone] = useState('');
  const [newInboxSessionId, setNewInboxSessionId] = useState('');
  const [savingInbox, setSavingInbox] = useState(false);

  const [activeInbox, setActiveInbox] = useState(null);

  // QR Modal State
  const [qrSessionId, setQrSessionId] = useState('');
  const [qrInboxId, setQrInboxId] = useState('');
  const [qrStatusText, setQrStatusText] = useState('Aguardando resposta do servidor...');
  const [qrImageSrc, setQrImageSrc] = useState('');
  const [qrLoading, setQrLoading] = useState(true);
  const qrPollRef = useRef(null);

  const fetchInboxes = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inboxes')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setInboxes(data || []);
    } catch (err) {
      console.error(err);
      showToast('Erro ao buscar caixas de entrada.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInboxes();
  }, []);

  const handleOpenCreateModal = () => {
    const generated = 'inbox-' + Math.random().toString(36).substring(2, 8) + Date.now().toString().slice(-4);
    setNewInboxName('');
    setNewInboxPhone('');
    setNewInboxSessionId(generated);
    setCreateModalOpen(true);
  };

  const handleCreateInboxSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    setSavingInbox(true);
    try {
      const { error } = await supabase
        .from('inboxes')
        .insert({
          name: newInboxName.trim(),
          channel_type: 'whatsapp',
          phone_number: newInboxPhone.trim().replace(/\D/g, ''),
          wa_session_id: newInboxSessionId.trim(),
          is_connected: false,
          company_id: currentAgent?.company_id || null
        });

      if (error) throw error;

      showToast('Caixa de Entrada criada com sucesso!', 'success');
      setCreateModalOpen(false);
      fetchInboxes();
    } catch (err) {
      console.error(err);
      showToast('Erro ao criar caixa: ' + err.message, 'error');
    } finally {
      setSavingInbox(false);
    }
  };

  const handleDeleteInbox = async (inbox) => {
    if (!window.confirm(`Deseja excluir permanentemente a caixa "${inbox.name}"? Todas as mensagens atreladas serão removidas.`)) {
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      // Primeiro, tenta excluir campanhas associadas para evitar erro de Foreign Key
      try {
        await supabase.from('campaigns').delete().eq('inbox_id', inbox.id);
      } catch (e) {
        console.warn('Erro ao excluir campanhas vinculadas:', e);
      }

      showToast('Excluindo caixa de entrada e configurações...', 'info');

      if (inbox.wa_session_id) {
        try {
          await disconnectWaSession(inbox.wa_session_id);
        } catch (e) {
          console.warn('API de desconexão falhou, prosseguindo com delete no banco:', e);
        }
      }

      const { error } = await supabase
        .from('inboxes')
        .delete()
        .eq('id', inbox.id);

      if (error) throw error;

      showToast('Caixa e campanhas associadas excluídas!', 'success');
      fetchInboxes();
    } catch (err) {
      console.error(err);
      if (err.message && err.message.includes('campaigns_inbox_id_fkey')) {
        showToast('Não é possível excluir: Esta caixa está vinculada a uma ou mais Campanhas.', 'error');
      } else {
        showToast('Erro ao excluir: ' + err.message, 'error');
      }
    }
  };

  const handleDisconnectInbox = async (inbox) => {
    if (!window.confirm(`Você tem certeza que deseja desconectar o WhatsApp da caixa de entrada "${inbox.name}"?`)) {
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    showToast('Encerrando sessão...', 'info');
    try {
      if (inbox.wa_session_id) {
        try {
          await disconnectWaSession(inbox.wa_session_id);
        } catch (err) {
          console.warn('API de desconexão falhou, alterando banco de dados mesmo assim:', err);
        }
      }

      const { error } = await supabase
        .from('inboxes')
        .update({ is_connected: false })
        .eq('id', inbox.id);

      if (error) throw error;

      showToast('Sessão desconectada!', 'success');
      fetchInboxes();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar status no banco: ' + err.message, 'error');
    }
  };

  // Connect WhatsApp QR Code Routine
  const handleOpenConnectQRModal = (inbox) => {
    setQrSessionId(inbox.wa_session_id);
    setQrInboxId(inbox.id);
    setQrStatusText('Iniciando sessão do WhatsApp...');
    setQrImageSrc('');
    setQrLoading(true);
    setQrModalOpen(true);
  };

  useEffect(() => {
    if (!qrModalOpen || !qrSessionId || !qrInboxId) return;

    let attempts = 0;
    async function startConnection() {
      try {
        setQrStatusText('Enviando comando para a API...');
        await startWaSession(qrSessionId, qrInboxId);
        setQrStatusText('Aguardando geração do QR Code...');

        qrPollRef.current = setInterval(async () => {
          attempts++;
          try {
            const statusRes = await getConnectionStatus(qrSessionId);
            
            if (statusRes.status === 'connected') {
              clearInterval(qrPollRef.current);
              const supabase = getSupabase();
              if (supabase) {
                await supabase
                  .from('inboxes')
                  .update({ is_connected: true })
                  .eq('id', qrInboxId);
              }
              showToast('WhatsApp conectado com sucesso!', 'success');
              setQrModalOpen(false);
              fetchInboxes();
              return;
            }

            if (statusRes.status === 'waiting_qr') {
              const qrRes = await getQRCode(qrSessionId);
              if (qrRes.qrcode) {
                setQrLoading(false);
                setQrImageSrc(qrRes.qrcode);
                setQrStatusText('Pronto para escaneamento');
              }
            } else {
              setQrStatusText(`Status: ${statusRes.status}`);
            }
          } catch (pollErr) {
            console.warn('Erro ao consultar status:', pollErr);
          }

          if (attempts > 80) {
            clearInterval(qrPollRef.current);
            setQrStatusText('Tempo limite esgotado. Tente novamente.');
            showToast('Tempo limite esgotado para o QR Code.', 'error');
          }
        }, 3000);
      } catch (err) {
        console.error(err);
        
        let errorMsg = err.message;
        if (errorMsg.includes('NetworkError') || errorMsg.includes('Failed to fetch')) {
          errorMsg = 'Erro de Rede. A API do WhatsApp está configurada corretamente em Configurações > Geral? (Lembre-se: Vercel bloqueia localhost)';
        }

        setQrStatusText('Falha ao iniciar conexão: ' + errorMsg);
        showToast('Falha na inicialização: ' + errorMsg, 'error');
      }
    }

    startConnection();

    return () => {
      if (qrPollRef.current) {
        clearInterval(qrPollRef.current);
      }
    };
  }, [qrModalOpen, qrSessionId, qrInboxId]);

  const handleOpenSettingsModal = (inbox) => {
    setActiveInbox(inbox);
    setSettingsModalOpen(true);
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Caixas de Entrada</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Gerencie seus canais de comunicação com clientes</p>
        </div>
        <button className="btn-resolve" onClick={handleOpenCreateModal}>
          <Plus size={16} /> Nova Caixa de Entrada
        </button>
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <table className="ui-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Nome</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Canal</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>ID da Sessão</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Status</th>
              <th style={{ width: '260px', textAlign: 'center', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Buscando caixas de entrada...
                </td>
              </tr>
            ) : inboxes.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Nenhuma caixa cadastrada.
                </td>
              </tr>
            ) : (
              inboxes.map(i => (
                <tr key={i.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{i.name}</td>
                  <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: 'var(--text-primary)' }}>{i.channel_type}</td>
                  <td style={{ padding: '12px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--text-secondary)' }}>{i.wa_session_id || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {i.is_connected ? (
                      <span style={{ background: 'var(--accent-soft)', border: '1px solid var(--success)', color: 'var(--success)', fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', background: 'var(--success)', borderRadius: '50%' }}></span>
                        Conectado
                      </span>
                    ) : (
                      <span style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', background: 'var(--danger)', borderRadius: '50%' }}></span>
                        Desconectado
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {i.is_connected ? (
                        <button 
                          className="btn-cancel" 
                          onClick={() => handleDisconnectInbox(i)}
                          style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)', cursor: 'pointer' }}
                        >
                          Desconectar
                        </button>
                      ) : (
                        <button 
                          className="btn-resolve" 
                          onClick={() => handleOpenConnectQRModal(i)}
                          style={{ fontSize: '11px', padding: '4px 8px', cursor: 'pointer' }}
                        >
                          Conectar WhatsApp
                        </button>
                      )}
                      <button 
                        className="toolbar-btn" 
                        onClick={() => handleOpenSettingsModal(i)} 
                        style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }} 
                        title="Configurações da Caixa"
                      >
                        <Sliders size={16} />
                      </button>
                      <button 
                        className="toolbar-btn" 
                        onClick={() => handleDeleteInbox(i)} 
                        style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }} 
                        title="Excluir Caixa"
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

      {/* Create Inbox Modal Overlay */}
      {createModalOpen && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Nova Caixa de Entrada</h3>
              <button className="modal-close" onClick={() => setCreateModalOpen(false)} disabled={savingInbox}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateInboxSubmit}>
              <div className="form-field">
                <label htmlFor="inb-name">Nome da Caixa de Entrada</label>
                <input 
                  type="text" 
                  id="inb-name" 
                  value={newInboxName}
                  onChange={(e) => setNewInboxName(e.target.value)}
                  placeholder="Ex: Suporte Financeiro" 
                  required 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="inb-channel">Canal / Canal Integrado</label>
                <select 
                  id="inb-channel" 
                  style={{ width: '100%', height: '38px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                >
                  <option value="whatsapp">WhatsApp (Baileys API)</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="inb-phone">Número de Telefone</label>
                <input 
                  type="text" 
                  id="inb-phone" 
                  value={newInboxPhone}
                  onChange={(e) => setNewInboxPhone(e.target.value)}
                  placeholder="Ex: 5511999999999" 
                  required 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="inb-session-id">ID de Sessão WhatsApp (Gerado Automaticamente)</label>
                <input 
                  type="text" 
                  id="inb-session-id" 
                  value={newInboxSessionId}
                  onChange={(e) => setNewInboxSessionId(e.target.value)}
                  required 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn-cancel" onClick={() => setCreateModalOpen(false)} disabled={savingInbox}>
                  Cancelar
                </button>
                <button type="submit" className="btn-resolve" disabled={savingInbox}>
                  {savingInbox ? 'Salvando...' : 'Cadastrar Caixa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connect QR Modal Overlay */}
      {qrModalOpen && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Conectar WhatsApp</h3>
              <button className="modal-close" onClick={() => setQrModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '280px', textAlign: 'center', gap: '16px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '320px', lineHeight: '1.5' }}>
                Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie o código abaixo.
              </p>

              <div id="qr-display-container" style={{ background: 'white', padding: '16px', borderRadius: 'var(--radius)', width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyText: 'center', justifyContent: 'center', position: 'relative' }}>
                {qrLoading ? (
                  <div className="btn-login" style={{ background: 'transparent', boxShadow: 'none', color: 'var(--accent)', flexDirection: 'column', gap: '12px', display: 'flex', alignItems: 'center' }}>
                    <div className="spinner" style={{ display: 'block', width: '32px', height: '32px', borderWidth: '3px', borderTopColor: 'var(--accent)', borderRadius: '50%', borderStyle: 'solid', borderColor: '#e2e8f0', animation: 'spin 1s linear infinite' }}></div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Iniciando WhatsApp...</span>
                  </div>
                ) : (
                  <img src={qrImageSrc} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="WhatsApp QR Code" />
                )}
              </div>

              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--text-muted)' }}>
                {qrStatusText}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Config Inbox Settings Modal Overlay */}
      {settingsModalOpen && activeInbox && (
        <InboxConfigModal 
          inbox={activeInbox} 
          onClose={() => setSettingsModalOpen(false)}
          onCompleted={() => {
            setSettingsModalOpen(false);
            fetchInboxes();
          }}
        />
      )}
    </div>
  );
}

// Sub-component InboxConfigModal for modularity
function InboxConfigModal({ inbox, onClose, onCompleted }) {
  const [activeTab, setActiveTab] = useState('general'); // general | agents | hours | chatbot

  // Tab 1: General fields
  const [name, setName] = useState(inbox.name || '');
  const [greetingEnabled, setGreetingEnabled] = useState(inbox.greeting_enabled || false);
  const [greetingMessage, setGreetingMessage] = useState(inbox.greeting_message || '');
  const [ignoreAudios, setIgnoreAudios] = useState(inbox.ignore_audios || false);
  const [ignoreAudiosMessage, setIgnoreAudiosMessage] = useState(inbox.ignore_audios_message || '');
  const [ignoreGroups, setIgnoreGroups] = useState(inbox.ignore_groups !== false);
  const [signatureEnabled, setSignatureEnabled] = useState(inbox.signature_enabled || false);
  const [syncContacts, setSyncContacts] = useState(inbox.sync_contacts || false);

  // Tab 2: Agents fields
  const [autoAssignment, setAutoAssignment] = useState(inbox.auto_assignment || false);
  const [allAgents, setAllAgents] = useState([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState([]);
  const [newAgentToAdd, setNewAgentToAdd] = useState('');

  // Tab 3: Business hours fields
  const [hoursEnabled, setHoursEnabled] = useState(inbox.business_hours_enabled || false);
  const [absenceMessage, setAbsenceMessage] = useState(inbox.absence_message || '');
  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayLabels = {
    mon: 'Segunda-feira',
    tue: 'Terça-feira',
    wed: 'Quarta-feira',
    thu: 'Quinta-feira',
    fri: 'Sexta-feira',
    sat: 'Sábado',
    sun: 'Domingo'
  };
  const [hoursConfig, setHoursConfig] = useState(() => {
    const bh = inbox.business_hours || {};
    const init = {};
    dayKeys.forEach(k => {
      init[k] = bh[k] || { enabled: true, intervals: [] };
    });
    return init;
  });

  // Tab 4: Chatbot fields
  const [botEnabled, setBotEnabled] = useState(inbox.bot_enabled || false);
  const [botWebhookUrl, setBotWebhookUrl] = useState(inbox.bot_webhook_url || '');

  const [saving, setSaving] = useState(false);

  // Load Agents (Only when Agents tab opens)
  useEffect(() => {
    async function loadAgentsData() {
      const supabase = getSupabase();
      if (!supabase) return;

      try {
        const [agentsRes, assocRes] = await Promise.all([
          supabase.from('agents').select('*').order('name', { ascending: true }),
          supabase.from('inbox_agents').select('agent_id').eq('inbox_id', inbox.id)
        ]);

        if (agentsRes.error) throw agentsRes.error;
        if (assocRes.error) throw assocRes.error;

        setAllAgents(agentsRes.data || []);
        setSelectedAgentIds((assocRes.data || []).map(r => r.agent_id));
      } catch (err) {
        console.error(err);
        showToast('Erro ao carregar dados de agentes.', 'error');
      }
    }

    if (activeTab === 'agents') {
      loadAgentsData();
    }
  }, [activeTab, inbox.id]);

  const handleGeneralSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('inboxes')
        .update({
          name: name.trim(),
          greeting_enabled: greetingEnabled,
          greeting_message: greetingEnabled ? greetingMessage.trim() : null,
          ignore_audios: ignoreAudios,
          ignore_audios_message: ignoreAudios ? ignoreAudiosMessage.trim() : null,
          ignore_groups: ignoreGroups,
          signature_enabled: signatureEnabled,
          sync_contacts: syncContacts
        })
        .eq('id', inbox.id);

      if (error) throw error;

      showToast('Configurações gerais salvas com sucesso!', 'success');
      onCompleted();
    } catch (err) {
      showToast('Erro ao salvar: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAgentsSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    setSaving(true);
    try {
      // 1. Update inbox auto_assignment flag
      const { error: inboxError } = await supabase
        .from('inboxes')
        .update({ auto_assignment: autoAssignment })
        .eq('id', inbox.id);

      if (inboxError) throw inboxError;

      // 2. Clear relations
      const { error: delError } = await supabase
        .from('inbox_agents')
        .delete()
        .eq('inbox_id', inbox.id);

      if (delError) throw delError;

      // 3. Insert relations
      if (selectedAgentIds.length > 0) {
        const rows = selectedAgentIds.map(aid => ({
          inbox_id: inbox.id,
          agent_id: aid
        }));
        const { error: insError } = await supabase
          .from('inbox_agents')
          .insert(rows);

        if (insError) throw insError;
      }

      showToast('Atribuições de agentes atualizadas!', 'success');
      onCompleted();
    } catch (err) {
      showToast('Erro ao atualizar agentes: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDayActiveChange = (day, checked) => {
    setHoursConfig(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: checked }
    }));
  };

  const handleTimeChange = (day, periodIdx, isStart, val) => {
    setHoursConfig(prev => {
      const dayCfg = { ...prev[day] };
      const intervals = [...(dayCfg.intervals || [])];
      
      if (!intervals[periodIdx]) {
        intervals[periodIdx] = ['', ''];
      }
      
      intervals[periodIdx] = [...intervals[periodIdx]];
      intervals[periodIdx][isStart ? 0 : 1] = val;

      return {
        ...prev,
        [day]: { ...dayCfg, intervals }
      };
    });
  };

  const handleCopyHoursToAll = (sourceDay) => {
    const sourceCfg = hoursConfig[sourceDay];
    
    setHoursConfig(prev => {
      const updated = { ...prev };
      dayKeys.forEach(k => {
        if (k !== sourceDay) {
          updated[k] = {
            enabled: sourceCfg.enabled,
            intervals: JSON.parse(JSON.stringify(sourceCfg.intervals))
          };
        }
      });
      return updated;
    });

    showToast('Horário copiado para todos os outros dias!', 'success');
  };

  const handleHoursSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    setSaving(true);
    try {
      // Format clean JSON payload filtering out blank times
      const businessHours = {};
      dayKeys.forEach(k => {
        const dayCfg = hoursConfig[k];
        const intervals = (dayCfg.intervals || []).filter(int => int[0] && int[1]);
        businessHours[k] = {
          enabled: dayCfg.enabled,
          intervals
        };
      });

      const { error } = await supabase
        .from('inboxes')
        .update({
          business_hours_enabled: hoursEnabled,
          business_hours: businessHours,
          absence_message: hoursEnabled ? absenceMessage.trim() : null
        })
        .eq('id', inbox.id);

      if (error) throw error;

      showToast('Horários de funcionamento salvos!', 'success');
      onCompleted();
    } catch (err) {
      showToast('Erro ao salvar horários: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChatbotSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('inboxes')
        .update({
          bot_enabled: botEnabled,
          bot_webhook_url: botEnabled ? botWebhookUrl.trim() : null
        })
        .eq('id', inbox.id);

      if (error) throw error;

      showToast('Configurações do chatbot salvas!', 'success');
      onCompleted();
    } catch (err) {
      showToast('Erro ao salvar chatbot: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const waApiUrl = localStorage.getItem('WA_API_URL') || 'http://localhost:3009';
  const webhookUrl = `${waApiUrl}/api/webhook`;

  return (
    <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
      <div className="modal-card" style={{ width: '600px', maxWidth: '90%' }}>
        <div className="modal-header">
          <h3 className="modal-title">Configurar Caixa: {inbox.name}</h3>
          <button className="modal-close" onClick={onClose} disabled={saving}>
            <X size={16} />
          </button>
        </div>

        <div className="inbox-settings-tabs" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '20px' }}>
          <button 
            type="button" 
            onClick={() => setActiveTab('general')}
            className={`col2-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            style={{ fontWeight: 600, padding: '6px 12px', fontSize: '13px', background: activeTab === 'general' ? 'var(--bg-secondary)' : 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px' }}
          >
            Geral
          </button>
          <button 
            type="button" 
            onClick={() => setActiveTab('agents')}
            className={`col2-tab-btn ${activeTab === 'agents' ? 'active' : ''}`}
            style={{ fontWeight: 600, padding: '6px 12px', fontSize: '13px', background: activeTab === 'agents' ? 'var(--bg-secondary)' : 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px' }}
          >
            Agentes
          </button>
          <button 
            type="button" 
            onClick={() => setActiveTab('hours')}
            className={`col2-tab-btn ${activeTab === 'hours' ? 'active' : ''}`}
            style={{ fontWeight: 600, padding: '6px 12px', fontSize: '13px', background: activeTab === 'hours' ? 'var(--bg-secondary)' : 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px' }}
          >
            Funcionamento
          </button>
          <button 
            type="button" 
            onClick={() => setActiveTab('chatbot')}
            className={`col2-tab-btn ${activeTab === 'chatbot' ? 'active' : ''}`}
            style={{ fontWeight: 600, padding: '6px 12px', fontSize: '13px', background: activeTab === 'chatbot' ? 'var(--bg-secondary)' : 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px' }}
          >
            Chatbot
          </button>
        </div>

        <div id="inbox-settings-tab-content" style={{ minHeight: '280px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
          
          {activeTab === 'general' && (
            <form onSubmit={handleGeneralSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-field">
                <label htmlFor="inb-settings-name">Nome da Caixa de Entrada</label>
                <input 
                  type="text" 
                  id="inb-settings-name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-field">
                <label>URL do Webhook (API Externa)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={webhookUrl}
                    readOnly 
                    style={{ flexGrow: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', cursor: 'not-allowed', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}
                  />
                  <button 
                    type="button" 
                    className="btn-cancel" 
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      showToast('Webhook URL copiada!', 'success');
                    }}
                    style={{ padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Copiar URL"
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Use este endpoint para enviar mensagens de sistemas externos.</span>
              </div>

              <div className="form-field">
                <label htmlFor="inb-settings-greeting-enabled">Ativar mensagem de saudação na caixa?</label>
                <select 
                  id="inb-settings-greeting-enabled" 
                  value={String(greetingEnabled)}
                  onChange={(e) => setGreetingEnabled(e.target.value === 'true')}
                  style={{ width: '100%', height: '38px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                >
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>

              {greetingEnabled && (
                <div className="form-field">
                  <label htmlFor="inb-settings-greeting-msg">Mensagem de Saudação</label>
                  <textarea 
                    id="inb-settings-greeting-msg" 
                    rows="3" 
                    value={greetingMessage}
                    onChange={(e) => setGreetingMessage(e.target.value)}
                    placeholder="Ex: Olá! Seja bem-vindo ao nosso suporte..."
                    style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', resize: 'vertical' }}
                  />
                </div>
              )}

              <div className="form-field">
                <label htmlFor="inb-settings-ignore-audios">Ignorar mensagens de áudio nesta caixa?</label>
                <select 
                  id="inb-settings-ignore-audios" 
                  value={String(ignoreAudios)}
                  onChange={(e) => setIgnoreAudios(e.target.value === 'true')}
                  style={{ width: '100%', height: '38px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                >
                  <option value="true">Sim (Descarta áudios automáticos)</option>
                  <option value="false">Não (Recebe e armazena áudios)</option>
                </select>
              </div>

              {ignoreAudios && (
                <div className="form-field">
                  <label htmlFor="inb-settings-ignore-audios-msg">Mensagem de Resposta Automática para Áudios</label>
                  <textarea 
                    id="inb-settings-ignore-audios-msg" 
                    rows="3" 
                    value={ignoreAudiosMessage}
                    onChange={(e) => setIgnoreAudiosMessage(e.target.value)}
                    placeholder="Ex: Olá! No momento não conseguimos ouvir áudios..."
                    style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', resize: 'vertical' }}
                  />
                </div>
              )}

              <div className="form-field">
                <label htmlFor="inb-settings-ignore-groups">Ignorar mensagens de grupos nesta caixa?</label>
                <select 
                  id="inb-settings-ignore-groups" 
                  value={String(ignoreGroups)}
                  onChange={(e) => setIgnoreGroups(e.target.value === 'true')}
                  style={{ width: '100%', height: '38px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                >
                  <option value="true">Sim (Processa apenas chats 1-a-1)</option>
                  <option value="false">Não (Recebe mensagens de grupos no painel)</option>
                </select>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Desativar bloqueia qualquer mensagem vinda de grupos.</span>
              </div>

              <div className="form-field" style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      id="inb-sig-general" 
                      checked={signatureEnabled}
                      onChange={(e) => setSignatureEnabled(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <label htmlFor="inb-sig-general" className="normal-case" style={{ margin: 0 }}>
                    Habilitar assinatura do Agente nas mensagens enviadas (Ex: *João:* Olá!)
                  </label>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      id="inb-sync-contacts-general" 
                      checked={syncContacts}
                      onChange={(e) => setSyncContacts(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <label htmlFor="inb-sync-contacts-general" className="normal-case" style={{ margin: 0 }}>
                    Sincronizar contatos da agenda do WhatsApp automaticamente
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>Fechar</button>
                <button type="submit" className="btn-resolve" disabled={saving}>Salvar Configurações</button>
              </div>
            </form>
          )}

          {activeTab === 'agents' && (
            <form onSubmit={handleAgentsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-field">
                <label htmlFor="inb-settings-auto-assignment">Atribuição automática de novas conversas?</label>
                <select 
                  id="inb-settings-auto-assignment" 
                  value={String(autoAssignment)}
                  onChange={(e) => setAutoAssignment(e.target.value === 'true')}
                  style={{ width: '100%', height: '38px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                >
                  <option value="true">Sim (Redireciona para um agente da caixa aleatoriamente)</option>
                  <option value="false">Não (Fica em "Não Atribuídas")</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="select-agent-dropdown">Adicionar agentes a esta caixa</label>
                <select 
                  id="select-agent-dropdown" 
                  value={newAgentToAdd}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) {
                      setSelectedAgentIds(prev => [...new Set([...prev, id])]);
                      setNewAgentToAdd('');
                    }
                  }}
                  style={{ width: '100%', height: '38px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                >
                  <option value="">Selecione um agente para adicionar...</option>
                  {allAgents
                    .filter(a => !selectedAgentIds.includes(a.id))
                    .map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                    ))}
                </select>
              </div>

              <div className="form-field">
                <label>Agentes selecionados nesta caixa</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minHeight: '48px', alignItems: 'center' }}>
                  {selectedAgentIds.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Nenhum agente selecionado.</span>
                  ) : (
                    selectedAgentIds.map(id => {
                      const agent = allAgents.find(a => a.id === id);
                      if (!agent) return null;
                      return (
                        <div key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '16px', padding: '4px 10px', fontSize: '13px', color: 'var(--text-primary)' }}>
                          <span>{agent.name}</span>
                          <button 
                            type="button" 
                            onClick={() => setSelectedAgentIds(prev => prev.filter(aid => aid !== id))}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', marginLeft: '4px' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>Fechar</button>
                <button type="submit" className="btn-resolve" disabled={saving}>Salvar Agentes</button>
              </div>
            </form>
          )}

          {activeTab === 'hours' && (
            <form onSubmit={handleHoursSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-field">
                <label htmlFor="inb-settings-hours-enabled">Permitir horário de funcionamento?</label>
                <select 
                  id="inb-settings-hours-enabled" 
                  value={String(hoursEnabled)}
                  onChange={(e) => setHoursEnabled(e.target.value === 'true')}
                  style={{ width: '100%', height: '38px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                >
                  <option value="true">Sim (Verificar horários do time)</option>
                  <option value="false">Não (Atendimento 24h sem mensagem de ausência)</option>
                </select>
              </div>

              {hoursEnabled && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                      Intervalos semanais
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {dayKeys.map(k => {
                        const dayCfg = hoursConfig[k];
                        const start1 = dayCfg.intervals?.[0]?.[0] || '';
                        const end1 = dayCfg.intervals?.[0]?.[1] || '';
                        const start2 = dayCfg.intervals?.[1]?.[0] || '';
                        const end2 = dayCfg.intervals?.[1]?.[1] || '';

                        return (
                          <div key={k} style={{ display: 'grid', gridTemplateColumns: '120px 70px 1fr', gap: '12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', padding: '8px 0' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{dayLabels[k]}</span>
                              <button 
                                type="button" 
                                onClick={() => handleCopyHoursToAll(k)}
                                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}
                              >
                                <Copy size={11} /> Copiar p/ todos
                              </button>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <label className="toggle-switch">
                                <input 
                                  type="checkbox" 
                                  checked={dayCfg.enabled}
                                  onChange={(e) => handleDayActiveChange(k, e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                              </label>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Ativo</span>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', opacity: dayCfg.enabled ? 1 : 0.4, pointerEvents: dayCfg.enabled ? 'auto' : 'none', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>P1:</span>
                                <input 
                                  type="time" 
                                  value={start1}
                                  onChange={(e) => handleTimeChange(k, 0, true, e.target.value)}
                                  style={{ width: '90px', padding: '4px 6px', fontSize: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)' }}
                                />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>às</span>
                                <input 
                                  type="time" 
                                  value={end1}
                                  onChange={(e) => handleTimeChange(k, 0, false, e.target.value)}
                                  style={{ width: '90px', padding: '4px 6px', fontSize: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)' }}
                                />
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>P2:</span>
                                <input 
                                  type="time" 
                                  value={start2}
                                  onChange={(e) => handleTimeChange(k, 1, true, e.target.value)}
                                  style={{ width: '90px', padding: '4px 6px', fontSize: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)' }}
                                />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>às</span>
                                <input 
                                  type="time" 
                                  value={end2}
                                  onChange={(e) => handleTimeChange(k, 1, false, e.target.value)}
                                  style={{ width: '90px', padding: '4px 6px', fontSize: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)' }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-field">
                    <label htmlFor="inb-settings-absence-msg">Mensagem de Ausência (Fora do Horário)</label>
                    <textarea 
                      id="inb-settings-absence-msg" 
                      rows="3" 
                      value={absenceMessage}
                      onChange={(e) => setAbsenceMessage(e.target.value)}
                      placeholder="Ex: Olá! No momento estamos ausentes..."
                      style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', resize: 'vertical' }}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>Fechar</button>
                <button type="submit" className="btn-resolve" disabled={saving}>Salvar Horários</button>
              </div>
            </form>
          )}

          {activeTab === 'chatbot' && (
            <form onSubmit={handleChatbotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-field">
                <label htmlFor="inb-settings-bot-enabled">Ativar Integração com Chatbot?</label>
                <select 
                  id="inb-settings-bot-enabled" 
                  value={String(botEnabled)}
                  onChange={(e) => setBotEnabled(e.target.value === 'true')}
                  style={{ width: '100%', height: '38px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                >
                  <option value="true">Sim (Robô processa novas mensagens)</option>
                  <option value="false">Não (Inativo)</option>
                </select>
              </div>

              {botEnabled && (
                <div className="form-field">
                  <label htmlFor="inb-settings-bot-webhook">URL do Webhook do Bot (Typebot, N8N, Dify...)</label>
                  <input 
                    type="url" 
                    id="inb-settings-bot-webhook" 
                    value={botWebhookUrl}
                    onChange={(e) => setBotWebhookUrl(e.target.value)}
                    placeholder="https://exemplo.com/webhook/bot" 
                    required 
                    style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    As mensagens de entrada serão enviadas para esta URL via POST em tempo real.
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>Fechar</button>
                <button type="submit" className="btn-resolve" disabled={saving}>Salvar Chatbot</button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
