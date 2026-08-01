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
import {
  Plus, Sliders, Trash2, X, Copy, Inbox, Wifi, WifiOff,
  Smartphone, Settings2, Users2, Clock4, Bot, Check
} from 'lucide-react';
import './settings.css';

/* ─── Toggle Switch helper ─── */
function Toggle({ checked, onChange, id }) {
  return (
    <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
      <span style={{
        position: 'relative', width: '40px', height: '22px', display: 'inline-block', flexShrink: 0
      }}>
        <input type="checkbox" id={id} checked={checked} onChange={onChange}
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
        <span style={{
          position: 'absolute', inset: 0, background: checked ? '#6366f1' : 'var(--border)',
          borderRadius: '11px', transition: 'background .2s'
        }} />
        <span style={{
          position: 'absolute', top: '3px', left: checked ? '21px' : '3px',
          width: '16px', height: '16px', background: '#fff', borderRadius: '50%',
          transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.3)'
        }} />
      </span>
    </label>
  );
}

/* ─── Inline field helper ─── */
function Field({ label, hint, children }) {
  return (
    <div className="s-field">
      <label className="s-label">{label}</label>
      {children}
      {hint && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{hint}</span>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function InboxesSettings() {
  const { currentAgent } = useApp();
  const [inboxes, setInboxes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const [newInboxName, setNewInboxName] = useState('');
  const [newInboxPhone, setNewInboxPhone] = useState('');
  const [newInboxSessionId, setNewInboxSessionId] = useState('');
  const [savingInbox, setSavingInbox] = useState(false);

  const [activeInbox, setActiveInbox] = useState(null);

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
      const { data, error } = await supabase.from('inboxes').select('*').order('name', { ascending: true });
      if (error) throw error;
      setInboxes(data || []);
    } catch { showToast('Erro ao buscar caixas de entrada.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInboxes(); }, []);

  const handleOpenCreate = () => {
    const generated = 'inbox-' + Math.random().toString(36).substring(2, 8) + Date.now().toString().slice(-4);
    setNewInboxName(''); setNewInboxPhone(''); setNewInboxSessionId(generated);
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setSavingInbox(true);
    try {
      const { error } = await supabase.from('inboxes').insert({
        name: newInboxName.trim(), channel_type: 'whatsapp',
        phone_number: newInboxPhone.trim().replace(/\D/g, ''),
        wa_session_id: newInboxSessionId.trim(),
        is_connected: false, company_id: currentAgent?.company_id || null
      });
      if (error) throw error;
      showToast('Caixa de entrada criada!', 'success');
      setCreateModalOpen(false); fetchInboxes();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
    finally { setSavingInbox(false); }
  };

  const handleDelete = async (inbox) => {
    if (!window.confirm(`Excluir permanentemente a caixa "${inbox.name}"? Todas as mensagens serão removidas.`)) return;
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      try { await supabase.from('campaigns').delete().eq('inbox_id', inbox.id); } catch {}
      showToast('Excluindo caixa...', 'info');
      if (inbox.wa_session_id) {
        try { await disconnectWaSession(inbox.wa_session_id); } catch {}
      }
      const { error } = await supabase.from('inboxes').delete().eq('id', inbox.id);
      if (error) throw error;
      showToast('Caixa excluída!', 'success'); fetchInboxes();
    } catch (err) {
      if (err.message?.includes('campaigns_inbox_id_fkey')) {
        showToast('Não é possível excluir: vinculada a Campanhas.', 'error');
      } else {
        showToast('Erro: ' + err.message, 'error');
      }
    }
  };

  const handleDisconnect = async (inbox) => {
    if (!window.confirm(`Desconectar o WhatsApp da caixa "${inbox.name}"?`)) return;
    const supabase = getSupabase();
    if (!supabase) return;
    showToast('Encerrando sessão...', 'info');
    try {
      if (inbox.wa_session_id) { try { await disconnectWaSession(inbox.wa_session_id); } catch {} }
      const { error } = await supabase.from('inboxes').update({ is_connected: false }).eq('id', inbox.id);
      if (error) throw error;
      showToast('Sessão desconectada!', 'success'); fetchInboxes();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
  };

  const handleOpenQR = (inbox) => {
    setQrSessionId(inbox.wa_session_id); setQrInboxId(inbox.id);
    setQrStatusText('Iniciando sessão...'); setQrImageSrc(''); setQrLoading(true);
    setQrModalOpen(true);
  };

  useEffect(() => {
    if (!qrModalOpen || !qrSessionId || !qrInboxId) return;
    let attempts = 0;
    async function startConnection() {
      try {
        setQrStatusText('Enviando comando para a API...');
        await startWaSession(qrSessionId, qrInboxId);
        setQrStatusText('Aguardando QR Code...');
        qrPollRef.current = setInterval(async () => {
          attempts++;
          try {
            const statusRes = await getConnectionStatus(qrSessionId);
            if (statusRes.status === 'connected') {
              clearInterval(qrPollRef.current);
              const supabase = getSupabase();
              if (supabase) await supabase.from('inboxes').update({ is_connected: true }).eq('id', qrInboxId);
              showToast('WhatsApp conectado!', 'success');
              setQrModalOpen(false); fetchInboxes(); return;
            }
            if (statusRes.status === 'waiting_qr') {
              const qrRes = await getQRCode(qrSessionId);
              if (qrRes.qrcode) { setQrLoading(false); setQrImageSrc(qrRes.qrcode); setQrStatusText('Aguardando escaneamento...'); }
            } else { setQrStatusText(`Status: ${statusRes.status}`); }
          } catch {}
          if (attempts > 80) { clearInterval(qrPollRef.current); setQrStatusText('Tempo limite esgotado.'); showToast('Tempo limite expirado.', 'error'); }
        }, 3000);
      } catch (err) {
        let msg = err.message;
        if (msg.includes('NetworkError') || msg.includes('Failed to fetch')) msg = 'Erro de rede. Verifique a URL da API do WhatsApp em Configurações > Geral.';
        setQrStatusText('Falha: ' + msg); showToast('Falha: ' + msg, 'error');
      }
    }
    startConnection();
    return () => { if (qrPollRef.current) clearInterval(qrPollRef.current); };
  }, [qrModalOpen, qrSessionId, qrInboxId]);

  return (
    <div className="s-root">
      {/* Header */}
      <div className="s-header">
        <div className="s-header-text">
          <h2>Caixas de Entrada</h2>
          <p>Gerencie seus canais de comunicação com clientes via WhatsApp.</p>
        </div>
        <button className="s-btn-primary" onClick={handleOpenCreate}><Plus size={15} /> Nova Caixa</button>
      </div>

      {/* Inbox Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '13px' }}>Carregando...</div>
      ) : inboxes.length === 0 ? (
        <div className="s-empty-state">
          <div className="s-empty-state-icon"><Inbox size={24} /></div>
          <h3>Nenhuma caixa de entrada</h3>
          <p>Crie uma caixa para conectar seu número de WhatsApp.</p>
          <button className="s-btn-primary" onClick={handleOpenCreate}><Plus size={14} /> Nova Caixa</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {inboxes.map(inbox => (
            <div key={inbox.id} style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '18px 20px',
              display: 'flex', alignItems: 'center', gap: '16px',
              transition: 'border-color .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              {/* Icon */}
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: inbox.is_connected
                  ? 'linear-gradient(135deg, rgba(34,197,94,.15), rgba(16,185,129,.15))'
                  : 'rgba(107,114,128,.1)',
                color: inbox.is_connected ? '#22c55e' : 'var(--text-muted)',
              }}>
                <Smartphone size={22} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{inbox.name}</strong>
                  {inbox.is_connected ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: 'rgba(34,197,94,.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,.25)' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 5px #22c55e' }} /> Conectado
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: 'rgba(239,68,68,.1)', color: '#f87171', border: '1px solid rgba(239,68,68,.25)' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f87171' }} /> Desconectado
                    </span>
                  )}
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: 'rgba(99,102,241,.1)', color: '#818cf8' }}>WhatsApp</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {inbox.phone_number && (
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>📱 +{inbox.phone_number}</span>
                  )}
                  {inbox.wa_session_id && (
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '1px 6px', borderRadius: '4px' }}>{inbox.wa_session_id}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {inbox.is_connected ? (
                  <button className="s-btn-secondary" onClick={() => handleDisconnect(inbox)} style={{ padding: '7px 14px', fontSize: '11px', color: '#f87171', borderColor: 'rgba(239,68,68,.25)' }}>
                    <WifiOff size={13} /> Desconectar
                  </button>
                ) : (
                  <button className="s-btn-primary" onClick={() => handleOpenQR(inbox)} style={{ padding: '7px 14px', fontSize: '11px' }}>
                    <Wifi size={13} /> Conectar
                  </button>
                )}
                <button className="s-icon-btn action" onClick={() => { setActiveInbox(inbox); setSettingsModalOpen(true); }} title="Configurações">
                  <Settings2 size={15} />
                </button>
                <button className="s-icon-btn danger" onClick={() => handleDelete(inbox)} title="Excluir">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Modal ── */}
      {createModalOpen && (
        <div className="s-overlay" onClick={e => { if (e.target === e.currentTarget && !savingInbox) setCreateModalOpen(false); }}>
          <div className="s-modal">
            <div className="s-modal-head">
              <div className="s-modal-head-icon"><Inbox size={16} /></div>
              <h3>Nova Caixa de Entrada</h3>
              <button className="s-modal-close" onClick={() => setCreateModalOpen(false)} disabled={savingInbox}><X size={15} /></button>
            </div>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <div className="s-modal-body">
                <Field label="Nome da Caixa *">
                  <input className="s-input" type="text" value={newInboxName} onChange={e => setNewInboxName(e.target.value)} placeholder="Ex: Suporte Financeiro" required />
                </Field>
                <Field label="Canal">
                  <select className="s-select">
                    <option value="whatsapp">WhatsApp (Baileys API)</option>
                  </select>
                </Field>
                <Field label="Número de Telefone *" hint="Com código do país. Ex: 5511999999999">
                  <input className="s-input" type="text" value={newInboxPhone} onChange={e => setNewInboxPhone(e.target.value)} placeholder="5511999999999" required />
                </Field>
                <Field label="ID de Sessão" hint="Gerado automaticamente. Pode ser alterado se necessário.">
                  <input className="s-input" type="text" value={newInboxSessionId} onChange={e => setNewInboxSessionId(e.target.value)} required style={{ fontFamily: 'monospace', fontSize: '12px' }} />
                </Field>
              </div>
              <div className="s-modal-footer">
                <button type="button" className="s-btn-cancel" onClick={() => setCreateModalOpen(false)} disabled={savingInbox}>Cancelar</button>
                <button type="submit" className="s-btn-save" disabled={savingInbox}>{savingInbox ? 'Criando...' : 'Criar Caixa'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QR Code Modal ── */}
      {qrModalOpen && (
        <div className="s-overlay" onClick={e => { if (e.target === e.currentTarget) setQrModalOpen(false); }}>
          <div className="s-modal" style={{ width: '420px' }}>
            <div className="s-modal-head">
              <div className="s-modal-head-icon" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}><Smartphone size={16} /></div>
              <h3>Conectar WhatsApp</h3>
              <button className="s-modal-close" onClick={() => setQrModalOpen(false)}><X size={15} /></button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Abra o WhatsApp no celular → <strong>Aparelhos Conectados</strong> → escaneie o código abaixo.
              </p>
              <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(0,0,0,.2)' }}>
                {qrLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Iniciando...</span>
                  </div>
                ) : (
                  <img src={qrImageSrc} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="WhatsApp QR Code" />
                )}
              </div>
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border)' }}>{qrStatusText}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal ── */}
      {settingsModalOpen && activeInbox && (
        <InboxConfigModal
          inbox={activeInbox}
          onClose={() => setSettingsModalOpen(false)}
          onCompleted={() => { setSettingsModalOpen(false); fetchInboxes(); }}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   INBOX CONFIG MODAL
════════════════════════════════════════════════════════════════ */
function InboxConfigModal({ inbox, onClose, onCompleted }) {
  const [activeTab, setActiveTab] = useState('general');

  const [name, setName] = useState(inbox.name || '');
  const [greetingEnabled, setGreetingEnabled] = useState(inbox.greeting_enabled || false);
  const [greetingMessage, setGreetingMessage] = useState(inbox.greeting_message || '');
  const [ignoreAudios, setIgnoreAudios] = useState(inbox.ignore_audios || false);
  const [ignoreAudiosMessage, setIgnoreAudiosMessage] = useState(inbox.ignore_audios_message || '');
  const [ignoreGroups, setIgnoreGroups] = useState(inbox.ignore_groups !== false);
  const [signatureEnabled, setSignatureEnabled] = useState(inbox.signature_enabled || false);
  const [syncContacts, setSyncContacts] = useState(inbox.sync_contacts || false);

  const [autoAssignment, setAutoAssignment] = useState(inbox.auto_assignment || false);
  const [allAgents, setAllAgents] = useState([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState([]);
  const [newAgentToAdd, setNewAgentToAdd] = useState('');

  const [hoursEnabled, setHoursEnabled] = useState(inbox.business_hours_enabled || false);
  const [absenceMessage, setAbsenceMessage] = useState(inbox.absence_message || '');
  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayLabels = { mon: 'Segunda', tue: 'Terça', wed: 'Quarta', thu: 'Quinta', fri: 'Sexta', sat: 'Sábado', sun: 'Domingo' };
  const [hoursConfig, setHoursConfig] = useState(() => {
    const bh = inbox.business_hours || {};
    const init = {};
    dayKeys.forEach(k => { init[k] = bh[k] || { enabled: true, intervals: [] }; });
    return init;
  });

  const [botEnabled, setBotEnabled] = useState(inbox.bot_enabled || false);
  const [botWebhookUrl, setBotWebhookUrl] = useState(inbox.bot_webhook_url || '');

  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const waApiUrl = localStorage.getItem('WA_API_URL') || import.meta.env.VITE_WA_API_URL || 'http://localhost:3009';
  const webhookUrl = `${waApiUrl}/api/webhook`;

  useEffect(() => {
    if (activeTab !== 'agents') return;
    async function load() {
      const supabase = getSupabase();
      if (!supabase) return;
      try {
        const [ag, ia] = await Promise.all([
          supabase.from('agents').select('*').order('name'),
          supabase.from('inbox_agents').select('agent_id').eq('inbox_id', inbox.id)
        ]);
        setAllAgents(ag.data || []);
        setSelectedAgentIds((ia.data || []).map(r => r.agent_id));
      } catch { showToast('Erro ao carregar agentes.', 'error'); }
    }
    load();
  }, [activeTab, inbox.id]);

  const handleGeneralSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('inboxes').update({
        name: name.trim(), greeting_enabled: greetingEnabled,
        greeting_message: greetingEnabled ? greetingMessage.trim() : null,
        ignore_audios: ignoreAudios, ignore_audios_message: ignoreAudios ? ignoreAudiosMessage.trim() : null,
        ignore_groups: ignoreGroups, signature_enabled: signatureEnabled, sync_contacts: syncContacts
      }).eq('id', inbox.id);
      if (error) throw error;
      showToast('Configurações salvas!', 'success'); onCompleted();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleAgentsSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setSaving(true);
    try {
      await supabase.from('inboxes').update({ auto_assignment: autoAssignment }).eq('id', inbox.id);
      await supabase.from('inbox_agents').delete().eq('inbox_id', inbox.id);
      if (selectedAgentIds.length > 0) {
        await supabase.from('inbox_agents').insert(selectedAgentIds.map(aid => ({ inbox_id: inbox.id, agent_id: aid })));
      }
      showToast('Agentes atualizados!', 'success'); onCompleted();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleHoursSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setSaving(true);
    try {
      const businessHours = {};
      dayKeys.forEach(k => {
        const d = hoursConfig[k];
        businessHours[k] = { enabled: d.enabled, intervals: (d.intervals || []).filter(i => i[0] && i[1]) };
      });
      const { error } = await supabase.from('inboxes').update({
        business_hours_enabled: hoursEnabled, business_hours: businessHours,
        absence_message: hoursEnabled ? absenceMessage.trim() : null
      }).eq('id', inbox.id);
      if (error) throw error;
      showToast('Horários salvos!', 'success'); onCompleted();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleChatbotSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('inboxes').update({
        bot_enabled: botEnabled, bot_webhook_url: botEnabled ? botWebhookUrl.trim() : null
      }).eq('id', inbox.id);
      if (error) throw error;
      showToast('Chatbot salvo!', 'success'); onCompleted();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleTimeChange = (day, idx, isStart, val) => {
    setHoursConfig(prev => {
      const d = { ...prev[day] };
      const ints = [...(d.intervals || [])];
      if (!ints[idx]) ints[idx] = ['', ''];
      ints[idx] = [...ints[idx]];
      ints[idx][isStart ? 0 : 1] = val;
      return { ...prev, [day]: { ...d, intervals: ints } };
    });
  };

  const handleCopyHours = (sourceDay) => {
    const src = hoursConfig[sourceDay];
    setHoursConfig(prev => {
      const u = { ...prev };
      dayKeys.forEach(k => { if (k !== sourceDay) u[k] = { enabled: src.enabled, intervals: JSON.parse(JSON.stringify(src.intervals)) }; });
      return u;
    });
    showToast('Horário copiado!', 'success');
  };

  const TABS = [
    { key: 'general', label: 'Geral', Icon: Settings2 },
    { key: 'agents', label: 'Agentes', Icon: Users2 },
    { key: 'hours', label: 'Horários', Icon: Clock4 },
    { key: 'chatbot', label: 'Chatbot', Icon: Bot },
  ];

  const inputSt = { width: '100%', height: '40px', padding: '0 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' };
  const selectSt = { ...inputSt, cursor: 'pointer' };
  const textareaSt = { width: '100%', padding: '10px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' };

  return (
    <div className="s-overlay" onClick={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className="s-modal wide" style={{ width: '680px', maxHeight: '88vh' }}>
        {/* Head */}
        <div className="s-modal-head">
          <div className="s-modal-head-icon"><Sliders size={16} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0 }}>Configurar Caixa</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{inbox.name}</span>
          </div>
          <button className="s-modal-close" onClick={onClose} disabled={saving}><X size={15} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', padding: '0 22px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {TABS.map(({ key, label, Icon }) => (
            <button key={key} type="button" onClick={() => setActiveTab(key)} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', border: 'none',
              background: 'transparent', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              color: activeTab === key ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'color .15s', marginBottom: '-1px',
            }}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ── GENERAL ── */}
          {activeTab === 'general' && (
            <form onSubmit={handleGeneralSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="s-field">
                <label className="s-label" htmlFor="inb-cfg-name">Nome da Caixa *</label>
                <input id="inb-cfg-name" style={inputSt} type="text" value={name} onChange={e => setName(e.target.value)} required />
              </div>

              {/* Webhook URL */}
              <div className="s-field">
                <label className="s-label">URL do Webhook</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input style={{ ...inputSt, fontFamily: 'monospace', fontSize: '11px', flex: 1, background: 'var(--bg-secondary)', color: 'var(--text-muted)', cursor: 'not-allowed' }} type="text" value={webhookUrl} readOnly />
                  <button type="button" className="s-btn-secondary" style={{ padding: '0 14px', flexShrink: 0 }} onClick={() => { navigator.clipboard.writeText(webhookUrl); setCopied(true); showToast('URL copiada!', 'success'); setTimeout(() => setCopied(false), 2000); }}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Use este endpoint para sistemas externos enviarem mensagens.</span>
              </div>

              {/* Greeting */}
              <div className="s-field">
                <label className="s-label">Mensagem de saudação?</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Toggle id="cfg-greeting" checked={greetingEnabled} onChange={e => setGreetingEnabled(e.target.checked)} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{greetingEnabled ? 'Ativada' : 'Desativada'}</span>
                </div>
                {greetingEnabled && (
                  <textarea style={textareaSt} rows="3" value={greetingMessage} onChange={e => setGreetingMessage(e.target.value)} placeholder="Ex: Olá! Seja bem-vindo ao nosso suporte..." />
                )}
              </div>

              {/* Ignore audios */}
              <div className="s-field">
                <label className="s-label">Ignorar mensagens de áudio?</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Toggle id="cfg-audios" checked={ignoreAudios} onChange={e => setIgnoreAudios(e.target.checked)} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{ignoreAudios ? 'Ignorando áudios' : 'Recebendo áudios'}</span>
                </div>
                {ignoreAudios && (
                  <textarea style={textareaSt} rows="3" value={ignoreAudiosMessage} onChange={e => setIgnoreAudiosMessage(e.target.value)} placeholder="Ex: No momento não conseguimos ouvir áudios..." />
                )}
              </div>

              {/* Ignore groups */}
              <div className="s-field">
                <label className="s-label">Ignorar mensagens de grupos?</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Toggle id="cfg-groups" checked={ignoreGroups} onChange={e => setIgnoreGroups(e.target.checked)} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{ignoreGroups ? 'Processando apenas 1-a-1' : 'Incluindo mensagens de grupos'}</span>
                </div>
              </div>

              {/* Signature */}
              <div className="s-field">
                <label className="s-label">Assinatura do agente nas mensagens?</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Toggle id="cfg-sig" checked={signatureEnabled} onChange={e => setSignatureEnabled(e.target.checked)} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{signatureEnabled ? 'Ativada (Ex: *João:* Olá!)' : 'Desativada'}</span>
                </div>
              </div>

              {/* Sync contacts */}
              <div className="s-field">
                <label className="s-label">Sincronizar contatos da agenda?</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Toggle id="cfg-sync" checked={syncContacts} onChange={e => setSyncContacts(e.target.checked)} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{syncContacts ? 'Sincronização ativada' : 'Desativada'}</span>
                </div>
              </div>

              <div className="s-modal-footer" style={{ padding: '0', marginTop: '4px' }}>
                <button type="button" className="s-btn-cancel" onClick={onClose} disabled={saving}>Fechar</button>
                <button type="submit" className="s-btn-save" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Geral'}</button>
              </div>
            </form>
          )}

          {/* ── AGENTS ── */}
          {activeTab === 'agents' && (
            <form onSubmit={handleAgentsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="s-field">
                <label className="s-label">Atribuição automática de novas conversas?</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Toggle id="cfg-auto" checked={autoAssignment} onChange={e => setAutoAssignment(e.target.checked)} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{autoAssignment ? 'Sim — redireciona aleatoriamente' : 'Não — ficam em "Não Atribuídas"'}</span>
                </div>
              </div>

              <div className="s-field">
                <label className="s-label">Adicionar agente</label>
                <select style={selectSt} value={newAgentToAdd} onChange={e => {
                  const id = e.target.value;
                  if (id) { setSelectedAgentIds(prev => [...new Set([...prev, id])]); setNewAgentToAdd(''); }
                }}>
                  <option value="">Selecione um agente...</option>
                  {allAgents.filter(a => !selectedAgentIds.includes(a.id)).map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                  ))}
                </select>
              </div>

              <div className="s-field">
                <label className="s-label">Agentes desta caixa ({selectedAgentIds.length})</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minHeight: '50px', alignItems: 'center' }}>
                  {selectedAgentIds.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Nenhum agente selecionado.</span>
                  ) : selectedAgentIds.map(id => {
                    const a = allAgents.find(ag => ag.id === id);
                    if (!a) return null;
                    return (
                      <div key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.25)', borderRadius: '20px', padding: '4px 10px', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {a.name}
                        <button type="button" onClick={() => setSelectedAgentIds(prev => prev.filter(aid => aid !== id))} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', marginLeft: '2px' }}>
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="s-modal-footer" style={{ padding: 0, marginTop: '4px' }}>
                <button type="button" className="s-btn-cancel" onClick={onClose} disabled={saving}>Fechar</button>
                <button type="submit" className="s-btn-save" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Agentes'}</button>
              </div>
            </form>
          )}

          {/* ── HOURS ── */}
          {activeTab === 'hours' && (
            <form onSubmit={handleHoursSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="s-field">
                <label className="s-label">Ativar horário de funcionamento?</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Toggle id="cfg-hours-en" checked={hoursEnabled} onChange={e => setHoursEnabled(e.target.checked)} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{hoursEnabled ? 'Ativado' : 'Atendimento 24h (sem mensagem de ausência)'}</span>
                </div>
              </div>

              {hoursEnabled && (
                <>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,.12)', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      Intervalos Semanais
                    </div>
                    {dayKeys.map((k, idx) => {
                      const d = hoursConfig[k];
                      const s1 = d.intervals?.[0]?.[0] || '', e1 = d.intervals?.[0]?.[1] || '';
                      const s2 = d.intervals?.[1]?.[0] || '', e2 = d.intervals?.[1]?.[1] || '';
                      const timeSt = { width: '85px', padding: '5px 8px', fontSize: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', boxSizing: 'border-box' };
                      return (
                        <div key={k} style={{ display: 'grid', gridTemplateColumns: '100px 80px 1fr', gap: '10px', alignItems: 'center', padding: '10px 14px', borderBottom: idx < 6 ? '1px solid var(--border)' : 'none', background: d.enabled ? 'transparent' : 'rgba(0,0,0,.04)' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)', marginBottom: '2px' }}>{dayLabels[k]}</div>
                            <button type="button" onClick={() => handleCopyHours(k)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Copy size={9} /> copiar p/ todos
                            </button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Toggle id={`day-${k}`} checked={d.enabled} onChange={e => setHoursConfig(prev => ({ ...prev, [k]: { ...prev[k], enabled: e.target.checked } }))} />
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.enabled ? 'Ativo' : 'Off'}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', opacity: d.enabled ? 1 : .35, pointerEvents: d.enabled ? 'auto' : 'none', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>P1</span>
                              <input type="time" value={s1} onChange={e => handleTimeChange(k, 0, true, e.target.value)} style={timeSt} />
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>às</span>
                              <input type="time" value={e1} onChange={e => handleTimeChange(k, 0, false, e.target.value)} style={timeSt} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>P2</span>
                              <input type="time" value={s2} onChange={e => handleTimeChange(k, 1, true, e.target.value)} style={timeSt} />
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>às</span>
                              <input type="time" value={e2} onChange={e => handleTimeChange(k, 1, false, e.target.value)} style={timeSt} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="s-field">
                    <label className="s-label" htmlFor="cfg-absence">Mensagem de Ausência</label>
                    <textarea id="cfg-absence" style={textareaSt} rows="3" value={absenceMessage} onChange={e => setAbsenceMessage(e.target.value)} placeholder="Ex: Olá! No momento estamos ausentes..." />
                  </div>
                </>
              )}

              <div className="s-modal-footer" style={{ padding: 0, marginTop: '4px' }}>
                <button type="button" className="s-btn-cancel" onClick={onClose} disabled={saving}>Fechar</button>
                <button type="submit" className="s-btn-save" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Horários'}</button>
              </div>
            </form>
          )}

          {/* ── CHATBOT ── */}
          {activeTab === 'chatbot' && (
            <form onSubmit={handleChatbotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="s-field">
                <label className="s-label">Ativar integração com chatbot?</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Toggle id="cfg-bot" checked={botEnabled} onChange={e => setBotEnabled(e.target.checked)} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{botEnabled ? 'Ativado — o robô processa as mensagens' : 'Desativado'}</span>
                </div>
              </div>

              {botEnabled && (
                <div className="s-field">
                  <label className="s-label" htmlFor="cfg-bot-url">URL do Webhook do Bot *</label>
                  <input id="cfg-bot-url" style={inputSt} type="url" value={botWebhookUrl} onChange={e => setBotWebhookUrl(e.target.value)} placeholder="https://exemplo.com/webhook/bot" required />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Compatível com Typebot, N8N, Dify e outros webhooks HTTP.</span>
                </div>
              )}

              <div className="s-modal-footer" style={{ padding: 0, marginTop: '4px' }}>
                <button type="button" className="s-btn-cancel" onClick={onClose} disabled={saving}>Fechar</button>
                <button type="submit" className="s-btn-save" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Chatbot'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
