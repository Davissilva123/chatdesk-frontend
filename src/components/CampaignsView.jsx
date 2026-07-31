import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { getSupabase, uploadFileToSupabase } from '../supabase';
import { showToast } from '../utils';
import { 
  Send, 
  History,
  Users,
  Search,
  X,
  Radio,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  Tag,
  Image,
  FileText,
  Calendar,
  Zap,
  ChevronDown,
  Edit2
} from 'lucide-react';

export default function CampaignsView() {
  const { inboxes, labels } = useApp();
  const [campaigns, setCampaigns] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Form state
  const [campName, setCampName] = useState('');
  const [selectedInboxId, setSelectedInboxId] = useState('');
  const [recipientSource, setRecipientSource] = useState('manual');
  const [manualNumbers, setManualNumbers] = useState('');
  const [selectedLabelId, setSelectedLabelId] = useState('');
  const [labelContacts, setLabelContacts] = useState([]);
  const [labelContactsCountText, setLabelContactsCountText] = useState('Selecione uma etiqueta para ver a quantidade de contatos.');
  const [campMessage, setCampMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [campMediaUrl, setCampMediaUrl] = useState('');
  const [campMediaType, setCampMediaType] = useState('');
  const [campMediaFileName, setCampMediaFileName] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const pollIntervalRef = useRef(null);

  const connectedInboxes = inboxes.filter(i => i.is_connected && i.wa_session_id);

  const handleEditCampaign = (c) => {
    setEditingCampaignId(c.id);
    setCampName(c.name || '');
    setCampMessage(c.message || '');
    
    setRecipientSource('manual');
    const numbers = Array.isArray(c.recipients) ? c.recipients.join('\n') : '';
    setManualNumbers(numbers);

    if (c.scheduled_at) {
      try {
        const d = new Date(c.scheduled_at);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        setScheduledAt(`${yyyy}-${mm}-${dd}T${hh}:${m}`);
      } catch (e) {
        setScheduledAt('');
      }
    } else {
      setScheduledAt('');
    }

    setCampMediaUrl(c.media_url || '');
    setCampMediaType(c.media_type || '');
    setSelectedInboxId(c.inbox_id || connectedInboxes[0]?.id || '');
    setCampMediaFileName('');
  };

  const handleCancelEdit = () => {
    setEditingCampaignId(null);
    setCampName(''); setCampMessage(''); setManualNumbers('');
    setSelectedLabelId(''); setScheduledAt('');
    setCampMediaUrl(''); setCampMediaType(''); setCampMediaFileName('');
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (campMediaType === 'image' && !file.type.startsWith('image/')) {
      showToast('Por favor, selecione uma imagem válida.');
      return;
    }

    setIsUploadingMedia(true);
    setCampMediaFileName(file.name);
    try {
      const { publicUrl } = await uploadFileToSupabase(file);
      setCampMediaUrl(publicUrl);
    } catch (error) {
      console.error('Erro ao fazer upload da mídia:', error);
      showToast('Erro ao fazer upload da mídia.');
      setCampMediaFileName('');
      setCampMediaUrl('');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  useEffect(() => {
    if (connectedInboxes.length > 0 && !selectedInboxId) {
      setSelectedInboxId(connectedInboxes[0].id);
    }
  }, [connectedInboxes, selectedInboxId]);

  const fetchCampaignsHistory = async (silent = false) => {
    const supabase = getSupabase();
    if (!supabase) return;

    if (!silent) setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);

      const hasRunning = (data || []).some(c => c.status === 'running');
      if (hasRunning) {
        if (!pollIntervalRef.current) {
          pollIntervalRef.current = setInterval(() => {
            fetchCampaignsHistory(true);
          }, 5000);
        }
      } else {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch (err) {
      console.error('Erro ao buscar histórico de campanhas:', err);
    } finally {
      if (!silent) setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchCampaignsHistory();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    async function countLabelContacts() {
      if (!selectedLabelId) {
        setLabelContactsCountText('Selecione uma etiqueta para ver a quantidade de contatos.');
        setLabelContacts([]);
        return;
      }

      const supabase = getSupabase();
      if (!supabase) return;

      try {
        const { data, error } = await supabase
          .from('conversation_labels')
          .select('conversation_id, conversation:conversations(contact:contacts(phone))')
          .eq('label_id', selectedLabelId);

        if (error) throw error;

        const phones = new Set();
        if (data) {
          data.forEach(item => {
            const phone = item.conversation?.contact?.phone;
            if (phone) phones.add(phone);
          });
        }

        const phonesArray = Array.from(phones);
        setLabelContacts(phonesArray);
        setLabelContactsCountText(`${phonesArray.length} contato(s) exclusivo(s) encontrado(s) com esta etiqueta.`);
      } catch (err) {
        console.error('Erro ao contar contatos por etiqueta:', err);
        setLabelContactsCountText('Erro ao contar contatos.');
      }
    }

    if (recipientSource === 'label') {
      countLabelContacts();
    }
  }, [selectedLabelId, recipientSource]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedInboxId) {
      showToast('Por favor, selecione um canal de disparo.', 'error');
      return;
    }

    const currentInbox = connectedInboxes.find(i => i.id === selectedInboxId);
    if (!currentInbox) {
      showToast('Canal selecionado inválido.', 'error');
      return;
    }

    let recipients = [];
    if (recipientSource === 'manual') {
      if (!manualNumbers.trim()) {
        showToast('Por favor, informe ao menos um número de destinatário.', 'error');
        return;
      }
      recipients = manualNumbers.split('\n').map(n => n.trim()).filter(n => n !== '');
    } else {
      recipients = labelContacts;
      if (recipients.length === 0) {
        showToast('Nenhum contato encontrado com esta etiqueta.', 'error');
        return;
      }
    }

    const waUrl = localStorage.getItem('WA_API_URL') || import.meta.env.VITE_WA_API_URL || 'http://localhost:3009';
    const apiKey = localStorage.getItem('WA_API_KEY') || '';

    if (!waUrl || !apiKey) {
      showToast('Configure a conexão da API nas Configurações primeiro!', 'error');
      return;
    }

    setSending(true);
    try {
      if (editingCampaignId) {
        const supabase = getSupabase();
        await supabase.from('campaigns').delete().eq('id', editingCampaignId);
      }

      const response = await fetch(`${waUrl}/api/campaign/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({
          sessionId: currentInbox.wa_session_id,
          inboxId: currentInbox.id,
          name: campName.trim(),
          recipients,
          message: campMessage.trim(),
          scheduledAt: scheduledAt || null,
          mediaUrl: campMediaUrl || null,
          mediaType: campMediaType || null
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast(scheduledAt ? (editingCampaignId ? 'Campanha alterada com sucesso!' : 'Campanha agendada com sucesso!') : 'Campanha disparada com sucesso!', 'success');
        setEditingCampaignId(null);
        setCampName(''); setCampMessage(''); setManualNumbers('');
        setSelectedLabelId(''); setScheduledAt('');
        setCampMediaUrl(''); setCampMediaType(''); setCampMediaFileName('');
        fetchCampaignsHistory();
      } else {
        showToast(result.error || 'Erro ao enviar campanha.', 'error');
      }
    } catch (error) {
      showToast('Falha na comunicação com a API de WhatsApp.', 'error');
    } finally {
      setSending(false);
    }
  };

  const manualCount = manualNumbers.trim() ? manualNumbers.trim().split('\n').filter(n => n.trim()).length : 0;

  return (
    <div style={{ padding: '28px 32px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Radio size={18} color="#fff" />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Campanhas de Transmissão</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, paddingLeft: '48px' }}>
            Envie mensagens em massa para seus contatos via WhatsApp
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {campaigns.some(c => c.status === 'running') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '8px', color: 'var(--info)', fontSize: '12px', fontWeight: 600 }}>
              <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
              Campanha em execução
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '24px', alignItems: 'start' }}>

        {/* ─── Composer Card ─── */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {/* Card Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.04))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Zap size={16} style={{ color: 'var(--accent)' }} />
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Nova Transmissão</h4>
            </div>
          </div>

          {connectedInboxes.length === 0 ? (
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <XCircle size={24} color="var(--danger)" />
              </div>
              <p style={{ fontWeight: 600, color: 'var(--danger)', margin: '0 0 6px', fontSize: '14px' }}>Nenhum canal conectado</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Conecte um canal de WhatsApp nas configurações de caixas de entrada para disparar campanhas.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Nome da Campanha */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  Nome da Campanha
                </label>
                <input
                  type="text"
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  placeholder="Ex: Promoção de Julho"
                  required
                  style={{ width: '100%', height: '40px', padding: '0 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              {/* Canal */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  Canal de Disparo
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedInboxId}
                    onChange={(e) => setSelectedInboxId(e.target.value)}
                    required
                    style={{ width: '100%', height: '40px', padding: '0 36px 0 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', appearance: 'none', cursor: 'pointer' }}
                  >
                    {connectedInboxes.map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({i.phone_number || 'Sem número'})</option>
                    ))}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Destinatários */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>
                  Destinatários
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  {[
                    { val: 'manual', label: 'Lista Manual', icon: <Users size={14} /> },
                    { val: 'label', label: 'Por Etiqueta', icon: <Tag size={14} /> }
                  ].map(({ val, label, icon }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRecipientSource(val)}
                      style={{
                        padding: '10px',
                        border: `1px solid ${recipientSource === val ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: '8px',
                        background: recipientSource === val ? 'rgba(99,102,241,0.1)' : 'var(--bg-input)',
                        color: recipientSource === val ? 'var(--accent)' : 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {icon}{label}
                    </button>
                  ))}
                </div>

                {recipientSource === 'manual' ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setContactModalOpen(true)}
                      style={{
                        width: '100%', padding: '10px 14px',
                        background: manualCount > 0 ? 'rgba(99,102,241,0.08)' : 'var(--bg-input)',
                        border: `1px dashed ${manualCount > 0 ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: '8px',
                        color: manualCount > 0 ? 'var(--accent)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        fontSize: '13px', fontWeight: 500
                      }}
                    >
                      <Users size={15} />
                      {manualCount > 0
                        ? `${manualCount} contato(s) selecionado(s) — Editar`
                        : 'Selecionar Contatos'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={selectedLabelId}
                        onChange={(e) => setSelectedLabelId(e.target.value)}
                        style={{ width: '100%', height: '40px', padding: '0 36px 0 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', appearance: 'none', cursor: 'pointer' }}
                      >
                        <option value="">Selecione uma etiqueta...</option>
                        {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px', margin: '6px 0 0' }}>{labelContactsCountText}</p>
                  </div>
                )}
              </div>

              {/* Mensagem */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                  Mensagem
                </label>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {[['{{nome}}', 'Nome'], ['{{telefone}}', 'Telefone'], ['{{empresa}}', 'Empresa']].map(([tag, label]) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setCampMessage(prev => prev + tag)}
                      style={{
                        padding: '4px 10px',
                        background: 'rgba(99,102,241,0.1)',
                        border: '1px solid rgba(99,102,241,0.25)',
                        borderRadius: '20px',
                        color: 'var(--accent)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {label} {tag}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={5}
                  value={campMessage}
                  onChange={(e) => setCampMessage(e.target.value)}
                  placeholder="Ex: Olá {{nome}}! Temos uma novidade especial para você..."
                  required
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', resize: 'none', fontFamily: 'Inter, sans-serif', fontSize: '13px', lineHeight: 1.5, boxSizing: 'border-box', outline: 'none' }}
                />
                {campMessage.includes('{{') && (
                  <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={11} /> As variáveis serão substituídas por cada contato no envio.
                  </div>
                )}
              </div>

              {/* Mídia */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                  Mídia <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: campMediaType ? '140px 1fr' : '1fr', gap: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={campMediaType}
                      onChange={e => {
                        setCampMediaType(e.target.value);
                        setCampMediaUrl('');
                        setCampMediaFileName('');
                      }}
                      style={{ width: '100%', height: '40px', padding: '0 36px 0 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: campMediaType ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '13px', appearance: 'none', cursor: 'pointer' }}
                    >
                      <option value="">Sem mídia</option>
                      <option value="image">🖼️ Imagem</option>
                      <option value="document">📄 Documento</option>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  </div>
                  {campMediaType && (
                    <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
                      <input
                        type="file"
                        accept={campMediaType === 'image' ? 'image/*' : 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
                        onChange={handleMediaUpload}
                        style={{ display: 'none' }}
                        id="media-upload"
                      />
                      <label 
                        htmlFor="media-upload" 
                        style={{ flex: 1, display: 'flex', alignItems: 'center', height: '40px', padding: '0 12px', background: 'var(--bg-input)', border: '1px dashed var(--border)', borderRadius: '8px', color: campMediaUrl ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                      >
                        {isUploadingMedia ? (
                          <>
                            <Loader size={14} className="spin" style={{ marginRight: '8px' }} />
                            Enviando arquivo...
                          </>
                        ) : (
                          campMediaFileName || 'Selecionar arquivo do computador...'
                        )}
                      </label>
                      {campMediaUrl && !isUploadingMedia && (
                         <button type="button" onClick={() => { setCampMediaUrl(''); setCampMediaFileName(''); }} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-input)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%' }}>
                           <X size={14} />
                         </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Agendamento */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                  Agendamento <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    style={{ width: '100%', height: '40px', padding: '0 12px 0 34px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: scheduledAt ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '13px', boxSizing: 'border-box', outline: 'none', colorScheme: 'dark' }}
                  />
                </div>
                {scheduledAt && (
                  <div style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={11} /> Agendado para: {new Date(scheduledAt).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {editingCampaignId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={sending}
                    style={{
                      height: '44px', padding: '0 16px',
                      background: 'var(--bg-hover)', color: 'var(--text-primary)',
                      border: 'none', borderRadius: '10px',
                      fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', transition: 'background 0.2s',
                      display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={sending}
                  style={{
                    flex: 1, height: '44px',
                    background: sending ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, var(--accent), #8b5cf6)',
                    border: 'none', borderRadius: '10px',
                    color: '#fff', fontWeight: 700, fontSize: '14px',
                    cursor: sending ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'opacity 0.2s',
                    boxShadow: sending ? 'none' : '0 4px 14px rgba(99,102,241,0.4)'
                  }}
                >
                  {sending ? (
                    <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    editingCampaignId ? <Edit2 size={16} /> : (scheduledAt ? <Clock size={16} /> : <Send size={16} />)
                  )}
                  {sending ? 'Processando...' : editingCampaignId ? 'Salvar Alterações' : (scheduledAt ? 'Agendar Campanha' : 'Disparar Transmissão')}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ─── History Card ─── */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Card Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(56,189,248,0.05), rgba(99,102,241,0.03))' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <History size={16} style={{ color: 'var(--info)' }} />
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Histórico de Envios</h4>
              </div>
              {campaigns.length > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>
                  {campaigns.length} campanha(s)
                </span>
              )}
            </div>
          </div>

          <div style={{ overflowY: 'auto', flexGrow: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px' }}>
            {loadingHistory ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '40px 0', color: 'var(--text-muted)' }}>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '13px' }}>Carregando histórico...</span>
              </div>
            ) : campaigns.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'var(--text-muted)', gap: '12px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Radio size={22} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 600, margin: '0 0 4px', color: 'var(--text-secondary)' }}>Nenhuma campanha ainda</p>
                  <p style={{ fontSize: '12px', margin: 0 }}>Crie sua primeira transmissão ao lado.</p>
                </div>
              </div>
            ) : (
              campaigns.map(c => {
                const total = c.total_recipients || 0;
                const sent = c.sent_count || 0;
                const failed = c.failed_count || 0;
                const pct = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;
                const dateStr = new Date(c.created_at).toLocaleString('pt-BR', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                });

                const statusConfig = {
                  running: { color: 'var(--info)', bg: 'rgba(56,189,248,0.1)', text: 'Enviando', icon: <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> },
                  completed: { color: 'var(--success)', bg: 'rgba(34,197,94,0.1)', text: 'Concluída', icon: <CheckCircle size={11} /> },
                  failed: { color: 'var(--danger)', bg: 'rgba(239,68,68,0.1)', text: 'Falhou', icon: <XCircle size={11} /> },
                  scheduled: { color: 'var(--text-muted)', bg: 'var(--bg-hover)', text: 'Agendada', icon: <Clock size={11} /> },
                  pending: { color: 'var(--text-muted)', bg: 'var(--bg-hover)', text: 'Pendente', icon: <Clock size={11} /> }
                };
                const st = statusConfig[c.status] || statusConfig.pending;
                const barColor = c.status === 'running' ? 'var(--info)' : c.status === 'completed' ? 'var(--success)' : 'var(--danger)';

                return (
                  <div
                    key={c.id}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', transition: 'border-color 0.15s' }}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    {/* Top row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, flex: 1 }}>{c.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {(c.status === 'scheduled' || c.status === 'pending') && (
                          <button
                            title="Editar campanha"
                            onClick={() => handleEditCampaign(c)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
                            onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
                            onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        <span style={{ flexShrink: 0, fontSize: '10px', color: st.color, background: st.bg, padding: '4px 10px', borderRadius: '20px', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {st.icon}{st.text}
                        </span>
                      </div>
                    </div>

                    {/* Message preview */}
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {c.message}
                    </p>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      {[
                        { label: 'Total', value: total },
                        { label: 'Enviados', value: sent, color: 'var(--success)' },
                        { label: 'Falhou', value: failed, color: failed > 0 ? 'var(--danger)' : undefined }
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        <span>{dateStr}</span>
                        <span style={{ fontWeight: 600 }}>{pct}%</span>
                      </div>
                      <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {contactModalOpen && (
        <ContactSelectionModal
          initialSelected={manualNumbers.trim() ? manualNumbers.split('\n') : []}
          onClose={() => setContactModalOpen(false)}
          onConfirm={(selectedPhones) => {
            setManualNumbers(selectedPhones.join('\n'));
            setContactModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ContactSelectionModal({ initialSelected, onClose, onConfirm }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPhones, setSelectedPhones] = useState(initialSelected || []);

  useEffect(() => {
    async function loadContacts() {
      const supabase = getSupabase();
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .order('name', { ascending: true });
        if (error) throw error;
        setContacts(data || []);
      } catch (err) {
        showToast('Erro ao carregar contatos', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadContacts();
  }, []);

  const filtered = contacts.filter(c =>
    (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  );

  const toggleSelect = (phone) => {
    if (selectedPhones.includes(phone)) {
      setSelectedPhones(prev => prev.filter(p => p !== phone));
    } else {
      setSelectedPhones(prev => [...prev, phone]);
    }
  };

  const selectAll = () => {
    const allPhones = filtered.map(c => c.phone).filter(Boolean);
    setSelectedPhones(prev => Array.from(new Set([...prev, ...allPhones])));
  };

  const deselectAll = () => setSelectedPhones([]);

  const initialLetter = (name, phone) => (name || phone || 'C').substring(0, 1).toUpperCase();

  return (
    <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000, padding: '24px' }}>
      <div style={{
        width: '560px', maxWidth: '100%', height: '80vh',
        background: 'var(--bg-primary)', borderRadius: '16px',
        border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px' }}>Selecionar Contatos</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{selectedPhones.length} contato(s) selecionado(s)</p>
          </div>
          <button
            onClick={onClose}
            style={{ width: '32px', height: '32px', border: 'none', background: 'var(--bg-secondary)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{ width: '100%', height: '38px', paddingLeft: '36px', paddingRight: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
        </div>

        {/* Action Bar */}
        <div style={{ padding: '8px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {filtered.length} visíveis
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={selectAll}
              style={{ background: 'none', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontSize: '11px', padding: '4px 10px' }}
            >
              Todos visíveis
            </button>
            <button
              type="button"
              onClick={deselectAll}
              style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer', fontWeight: 600, fontSize: '11px', padding: '4px 10px' }}
            >
              Limpar
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '40px', color: 'var(--text-muted)' }}>
              <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Carregando contatos...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Nenhum contato encontrado.
            </div>
          ) : (
            filtered.map(c => {
              const isSelected = selectedPhones.includes(c.phone);
              return (
                <div
                  key={c.id}
                  onClick={() => toggleSelect(c.phone)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 24px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-light)',
                    background: isSelected ? 'rgba(99,102,241,0.06)' : 'transparent',
                    transition: 'background 0.1s'
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                    background: isSelected ? 'var(--accent)' : 'var(--bg-hover)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700,
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.15s'
                  }}>
                    {isSelected ? '✓' : initialLetter(c.name, c.phone)}
                  </div>
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.name || 'Sem nome'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.phone}</div>
                  </div>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                    border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s'
                  }}>
                    {isSelected && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 900, lineHeight: 1 }}>✓</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: 'var(--bg-secondary)' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ height: '38px', padding: '0 20px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selectedPhones)}
            style={{ height: '38px', padding: '0 20px', background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCircle size={14} />
            Confirmar {selectedPhones.length > 0 ? `(${selectedPhones.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
