import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../supabase';
import { checkApiHealth } from '../../whatsapp';
import { showToast } from '../../utils';
import { Copy, Eye, EyeOff, Trash2 } from 'lucide-react';

export default function IntegrationsSettings() {
  const [waUrl, setWaUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  
  // Server Health state
  const [serverHealth, setServerHealth] = useState('checking'); // checking | online | offline
  const [revealKey, setRevealKey] = useState(false);

  // Webhooks list states
  const [webhooks, setWebhooks] = useState([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(true);

  // Form states
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [webhookEventSelect, setWebhookEventSelect] = useState('*');
  const [savingWebhook, setSavingWebhook] = useState(false);

  const fetchWebhooks = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    setLoadingWebhooks(true);
    try {
      const { data, error } = await supabase
        .from('outbound_webhooks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  useEffect(() => {
    const url = localStorage.getItem('WA_API_URL') || import.meta.env.VITE_WA_API_URL || 'http://localhost:3009';
    const key = localStorage.getItem('WA_API_KEY') || import.meta.env.VITE_WA_API_KEY || 'Não configurada';
    setWaUrl(url);
    setApiKey(key);

    async function checkHealth() {
      try {
        await checkApiHealth();
        setServerHealth('online');
      } catch (err) {
        setServerHealth('offline');
      }
    }

    checkHealth();
    fetchWebhooks();
  }, []);

  const handleCopyText = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copiado!`, 'success');
  };

  const handleAddWebhookSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    setSavingWebhook(true);
    try {
      const { error } = await supabase
        .from('outbound_webhooks')
        .insert({
          url: webhookUrlInput.trim(),
          event_type: webhookEventSelect
        });

      if (error) throw error;

      showToast('Webhook de saída registrado com sucesso!', 'success');
      setWebhookUrlInput('');
      setWebhookEventSelect('*');
      fetchWebhooks();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar webhook: ' + err.message, 'error');
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleDeleteWebhook = async (id) => {
    if (!window.confirm('Deseja realmente excluir este webhook de saída? Ele deixará de receber eventos.')) {
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('outbound_webhooks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast('Webhook removido!', 'success');
      fetchWebhooks();
    } catch (err) {
      console.error(err);
      showToast('Erro ao remover: ' + err.message, 'error');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Integrações com API</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Conecte sistemas externos (CRMs, ERPs, Bots) ao ChatDesk</p>
      </div>

      {/* API Connection Status */}
      <div className="info-card" style={{ padding: '20px', marginBottom: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '14px' }}>Status do Servidor de WhatsApp</h4>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--text-muted)' }}>{waUrl}</span>
          </div>
          <div>
            {serverHealth === 'checking' && (
              <span style={{ background: 'var(--border)', color: 'var(--text-muted)', fontSize: '11px', padding: '4px 10px', borderRadius: '12px' }}>
                Testando ping...
              </span>
            )}
            {serverHealth === 'online' && (
              <span style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid var(--success)', color: 'var(--success)', fontSize: '11px', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
                Online
              </span>
            )}
            {serverHealth === 'offline' && (
              <span style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: '11px', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
                Offline / Desconectado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Webhook Integration Card */}
      <div className="info-card" style={{ padding: '24px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <div>
          <h4 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '14px' }}>Endpoint de Webhook (Receber eventos)</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.4', margin: 0 }}>
            Para enviar mensagens via CRM externo, envie requisições HTTP POST para a rota abaixo com o cabeçalho <code>x-api-key</code>:
          </p>
        </div>

        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'var(--accent)', wordBreak: 'break-all' }}>
            {waUrl}/api/webhook
          </span>
          <button 
            className="btn-cancel" 
            onClick={() => handleCopyText(`${waUrl}/api/webhook`, 'URL do Webhook')} 
            style={{ fontSize: '11px', padding: '6px 12px', borderColor: 'var(--border-light)', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            <Copy size={12} /> Copiar URL
          </button>
        </div>
      </div>

      {/* API Credentials Card */}
      <div className="info-card" style={{ padding: '24px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <div>
          <h4 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '14px' }}>API Key do WhatsApp Webhook</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.4', margin: 0 }}>
            Use esta chave no header <code>x-api-key</code> para autenticar chamadas externas seguras.
          </p>
        </div>

        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'var(--text-primary)', filter: revealKey ? 'none' : 'blur(4px)', transition: 'filter 0.2s', wordBreak: 'break-all' }}>
            {apiKey}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn-cancel" 
              onClick={() => setRevealKey(prev => !prev)} 
              style={{ fontSize: '11px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
            >
              {revealKey ? <EyeOff size={12} /> : <Eye size={12} />}
              {revealKey ? 'Ocultar' : 'Mostrar'}
            </button>
            <button 
              className="btn-cancel" 
              onClick={() => handleCopyText(apiKey, 'API Key')} 
              style={{ fontSize: '11px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
            >
              <Copy size={12} /> Copiar
            </button>
          </div>
        </div>
      </div>

      {/* Outbound Webhooks Card */}
      <div className="info-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <div>
          <h4 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '14px' }}>Webhooks de Saída (Outbound Webhooks)</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.4', margin: 0 }}>
            Envie payloads de eventos do ChatDesk (criação, atualização ou resolução de conversas) para URLs HTTP externas em tempo real.
          </p>
        </div>

        {/* Webhook Form */}
        <form onSubmit={handleAddWebhookSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div className="form-field">
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>URL do Endpoint Webhook</label>
              <input 
                type="url" 
                value={webhookUrlInput}
                onChange={(e) => setWebhookUrlInput(e.target.value)}
                required 
                placeholder="https://exemplo.com/webhook" 
                style={{ width: '100%', padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}
              />
            </div>
            <div className="form-field">
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Evento</label>
              <select 
                value={webhookEventSelect}
                onChange={(e) => setWebhookEventSelect(e.target.value)}
                style={{ width: '100%', padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px', height: '34px', outline: 'none' }}
              >
                <option value="*">Todos os Eventos (*)</option>
                <option value="conversation.created">Conversa Criada (created)</option>
                <option value="conversation.updated">Conversa Atualizada (updated)</option>
                <option value="conversation.resolved">Conversa Resolvida (resolved)</option>
              </select>
            </div>
          </div>
          <button 
            type="submit" 
            className="btn-resolve" 
            disabled={savingWebhook}
            style={{ alignSelf: 'flex-end', fontSize: '11px', padding: '8px 16px', cursor: 'pointer' }}
          >
            {savingWebhook ? 'Adicionando...' : 'Adicionar Webhook'}
          </button>
        </form>

        {/* Webhooks list */}
        <div id="webhooks-list-container">
          {loadingWebhooks ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '12px 0' }}>
              Carregando webhooks...
            </p>
          ) : webhooks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '12px 0' }}>
              Nenhum webhook de saída cadastrado.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {webhooks.map(wh => (
                <div key={wh.id} style={{ display: 'flex', justifySpaceBetween: 'space-between', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', wordBreak: 'break-all' }}>{wh.url}</span>
                    <span style={{ fontSize: '10px', color: 'var(--accent)', fontFamily: 'monospace' }}>evento: {wh.event_type}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteWebhook(wh.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title="Excluir Webhook"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
