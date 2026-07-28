import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../AppContext';
import { 
  getMessages, 
  sendAgentMessage, 
  updateConversationStatus, 
  uploadFileToSupabase,
  getSupabase,
  resetUnreadCount,
  updateMessage,
  deleteMessage
} from '../supabase';
import { sendWaMessage } from '../whatsapp';
import { formatTime, showToast, formatMessageText } from '../utils';
import { 
  ArrowLeft, FolderOpen, Check, User, MoreVertical, Download, Lock,
  Smile, Paperclip, Send, Sparkles, FileText, AlertCircle,
  MessageSquare, AlertTriangle, ArrowRightLeft, Upload, Reply,
  X, AtSign, Search, Mic, MicOff, Edit3, Trash2, CheckCheck,
  LayoutTemplate, Clock, ChevronUp, ChevronDown
} from 'lucide-react';
import TransferModal from './modals/TransferModal';
import EmojiPicker from './EmojiPicker';

// ─── Quick Reaction Emojis ────────────────────────────────────────
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '👎'];

// ─── Avatar color helper ──────────────────────────────────────────
const AVATAR_COLORS = ['#7C6FF7','#06B6D4','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899'];
const getAvatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// ─── Render text with @mentions highlighted ───────────────────────
function renderWithMentions(html) {
  return html.replace(/@([A-Za-zÀ-ÿ0-9_\- ]+?)(?=\s|$|[.,!?])/g, (match) => {
    return `<span class="mention-highlight">${match}</span>`;
  });
}

// ─── SLA calculation ──────────────────────────────────────────────
function getSlaInfo(conv) {
  if (!conv?.created_at) return null;
  const diffMins = Math.floor((Date.now() - new Date(conv.created_at)) / 60000);
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  const label = h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`;
  const tier = diffMins < 30 ? 'ok' : diffMins < 60 ? 'warn' : 'breach';
  return { label, tier, diffMins };
}

// ─── Format recording time ────────────────────────────────────────
function fmtRecTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function ChatWindow() {
  const {
    activeConversation,
    setActiveConversation,
    currentAgent,
    agents,
    contactCollapsed,
    setContactCollapsed,
    fetchConversationsList
  } = useApp();

  // ── Core state ──────────────────────────────────────────────────
  const [messages, setMessages]         = useState([]);
  const [inputValue, setInputValue]     = useState('');
  const [isNoteMode, setIsNoteMode]     = useState(false);
  const [showMenu, setShowMenu]         = useState(false);
  const [showEmojis, setShowEmojis]     = useState(false);
  const [cannedList, setCannedList]     = useState([]);
  const [aiLoading, setAiLoading]       = useState(false);
  const [clientTyping, setClientTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [isDragOver, setIsDragOver]     = useState(false);

  // ── Reply/Quote ──────────────────────────────────────────────────
  const [replyTo, setReplyTo]           = useState(null);

  // ── Reactions ────────────────────────────────────────────────────
  const [reactions, setReactions]       = useState({});
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState(null);

  // ── @Mention ─────────────────────────────────────────────────────
  const [mentionSearch, setMentionSearch]     = useState('');
  const [mentionDropdown, setMentionDropdown] = useState(false);
  const [mentionIndex, setMentionIndex]       = useState(0);

  // ── In-conversation search ────────────────────────────────────────
  const [showConvSearch, setShowConvSearch]   = useState(false);
  const [convSearch, setConvSearch]           = useState('');
  const [searchMatchIdx, setSearchMatchIdx]   = useState(0);

  // ── Edit / Delete ─────────────────────────────────────────────────
  const [editingMsgId, setEditingMsgId]       = useState(null);
  const [editingContent, setEditingContent]   = useState('');
  const [editedMsgIds, setEditedMsgIds]       = useState(new Set());

  // ── Audio recording ───────────────────────────────────────────────
  const [isRecording, setIsRecording]   = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);

  // ── Templates HSM ─────────────────────────────────────────────────
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates]         = useState([]);
  const [templateSearch, setTemplateSearch] = useState('');

  const scrollerRef  = useRef(null);
  const fileInputRef = useRef(null);
  const emojiRef     = useRef(null);
  const inputRef     = useRef(null);
  const convSearchRef = useRef(null);

  const WA_CHAR_LIMIT = 1024;
  const charCount = inputValue.length;

  // ── SLA info ─────────────────────────────────────────────────────
  const [slaTick, setSlaTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlaTick(n => n + 1), 60000);
    return () => clearInterval(t);
  }, []);
  const slaInfo = activeConversation ? getSlaInfo(activeConversation) : null;

  // ── Filtered agents for mention dropdown ─────────────────────────
  const mentionAgents = mentionSearch
    ? agents.filter(a => a.name?.toLowerCase().includes(mentionSearch.toLowerCase())).slice(0, 6)
    : agents.slice(0, 6);

  // ── Filtered + highlighted messages for in-conv search ───────────
  const displayedMessages = convSearch.trim()
    ? messages.filter(m => m.content?.toLowerCase().includes(convSearch.toLowerCase()))
    : messages;

  const searchMatches = convSearch.trim() ? displayedMessages.length : 0;

  const highlightConvSearch = (text) => {
    if (!convSearch.trim() || !text) return text;
    const escaped = convSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="msg-search-highlight">$1</mark>');
  };

  // ── Load messages ─────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!activeConversation) return;
    try {
      const list = await getMessages(activeConversation.id);
      setMessages(list);
      const reactionMap = {};
      list.forEach(m => {
        if (m.metadata?.reactions) reactionMap[m.id] = m.metadata.reactions;
      });
      setReactions(reactionMap);
    } catch (err) { console.error(err); }
  }, [activeConversation]);

  useEffect(() => {
    loadMessages();
    setReplyTo(null);
    setConvSearch('');
    setShowConvSearch(false);
    setEditingMsgId(null);
  }, [activeConversation]);

  // ── Scroll to bottom ─────────────────────────────────────────────
  useEffect(() => {
    if (scrollerRef.current && !convSearch) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, clientTyping]);

  // ── Realtime ─────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !activeConversation) return;
    const channel = supabase.channel(`chat-timeline-${activeConversation.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversation.id}` }, () => {
        loadMessages();
      }).subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeConversation, loadMessages]);

  // ── Client typing ─────────────────────────────────────────────────
  useEffect(() => {
    let typingTimeout;
    window.onPresenceTyping = (payload) => {
      if (!activeConversation?.contact) return;
      const contactPhone = activeConversation.contact.phone || '';
      const cleanPayloadPhone = payload.phone.replace(/\D/g, '');
      const cleanContactPhone = contactPhone.replace(/\D/g, '');
      if (cleanPayloadPhone === cleanContactPhone) {
        if (payload.isTyping) {
          setClientTyping(true);
          clearTimeout(typingTimeout);
          typingTimeout = setTimeout(() => setClientTyping(false), 5000);
        } else {
          setClientTyping(false);
        }
      }
    };
    return () => { window.onPresenceTyping = null; clearTimeout(typingTimeout); };
  }, [activeConversation]);

  // ── Close menus on outside click ──────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showMenu && !e.target.closest('#chat-header-menu') && !e.target.closest('#chat-menu-dropdown')) setShowMenu(false);
      if (showEmojis && emojiRef.current && !emojiRef.current.contains(e.target) && !e.target.closest('#btn-emoji')) setShowEmojis(false);
      if (reactionPickerMsgId && !e.target.closest('.quick-reaction-picker') && !e.target.closest('.msg-action-btn[data-react]')) setReactionPickerMsgId(null);
      if (mentionDropdown && !e.target.closest('.mention-dropdown') && !e.target.closest('.chat-textarea')) setMentionDropdown(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [showMenu, showEmojis, reactionPickerMsgId, mentionDropdown]);

  // ── Load templates on mount ───────────────────────────────────────
  useEffect(() => {
    const loadTemplates = async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      try {
        const { data } = await supabase.from('whatsapp_templates').select('*').order('name');
        setTemplates(data || []);
      } catch (_) {
        // Table may not exist — use fallback samples
        setTemplates([
          { id: 's1', name: 'saudacao_inicial', category: 'UTILITY', body: 'Olá {{1}}, tudo bem? Aqui é {{2}} da {{3}}. Como posso te ajudar hoje?' },
          { id: 's2', name: 'acompanhamento_pedido', category: 'UTILITY', body: 'Seu pedido #{{1}} foi atualizado. Status atual: {{2}}. Precisa de algo mais?' },
          { id: 's3', name: 'promocao_especial', category: 'MARKETING', body: '🎉 Oferta exclusiva para {{1}}! Aproveite {{2}}% de desconto até {{3}}.' },
        ]);
      }
    };
    loadTemplates();
  }, []);

  // ── Empty state ───────────────────────────────────────────────────
  if (!activeConversation) {
    return (
      <div id="chat-window" className="column-col3" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0', userSelect: 'none' }}>
        <div style={{ textAlign: 'center', maxWidth: '340px', padding: '32px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '22px', background: 'var(--accent-soft)', border: '1.5px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 32px var(--accent-glow)', animation: 'glowPulse 3s infinite' }}>
            <MessageSquare size={36} style={{ color: 'var(--accent)' }} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', marginBottom: '10px' }}>Nenhuma conversa selecionada</h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>Selecione uma conversa na lista ao lado para iniciar o atendimento, ou use <kbd style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 7px', fontSize: '11px', fontFamily: 'monospace' }}>Ctrl+K</kbd> para buscar.</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['WhatsApp', 'Instagram', 'Web Chat'].map(ch => (
              <span key={ch} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{ch}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const contact = activeConversation.contact || {};
  const inbox   = activeConversation.inbox   || {};

  // ── Status change ─────────────────────────────────────────────────
  const handleStatusChange = async (status) => {
    await updateConversationStatus(activeConversation.id, status);
    showToast(`Conversa marcada como ${status === 'resolved' ? 'resolvida' : status}!`, 'success');
    if (status === 'resolved' || status === 'pending' || status === 'snoozed') setActiveConversation(null);
    fetchConversationsList();
  };

  // ── Toggle bot ───────────────────────────────────────────────────
  const handleToggleBot = async () => {
    const nextVal = activeConversation.bot_active === false;
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('conversations').update({ bot_active: nextVal }).eq('id', activeConversation.id);
        activeConversation.bot_active = nextVal;
        showToast(nextVal ? 'Chatbot reativado!' : 'Chatbot pausado.', 'success');
        loadMessages();
      } catch (err) { showToast('Erro ao atualizar chatbot: ' + err.message, 'error'); }
    }
  };

  // ── Send message ──────────────────────────────────────────────────
  const handleSend = async () => {
    if (!inputValue.trim() && !selectedFile) return;
    if (!activeConversation) return;

    const text     = inputValue.trim();
    const replyRef = replyTo ? { id: replyTo.id, content: replyTo.content, sender_type: replyTo.sender_type, sender_id: replyTo.sender_id } : null;

    try {
      setInputValue('');
      setShowEmojis(false);
      setReplyTo(null);
      setMentionDropdown(false);

      let messageType = 'text';
      let mediaUrl    = null;
      let fileToUpload = selectedFile;
      setSelectedFile(null);

      if (fileToUpload) {
        showToast(`Fazendo upload de ${fileToUpload.name}...`, 'info');
        const uploadRes = await uploadFileToSupabase(fileToUpload);
        mediaUrl = uploadRes.publicUrl;
        messageType = 'file';
        if (fileToUpload.type.startsWith('image/')) messageType = 'image';
        else if (fileToUpload.type.startsWith('audio/')) messageType = 'audio';
      }

      const metadata = replyRef ? { replied_to: replyRef } : undefined;

      if (isNoteMode) {
        await sendAgentMessage({ conversationId: activeConversation.id, content: text || (fileToUpload ? fileToUpload.name : ''), messageType: 'note', mediaUrl, agentId: currentAgent?.id, metadata });
      } else {
        await sendAgentMessage({ conversationId: activeConversation.id, content: text || (fileToUpload ? fileToUpload.name : ''), messageType, mediaUrl, agentId: currentAgent?.id, metadata });
        let waContent = text || (fileToUpload ? fileToUpload.name : '');
        if (inbox.signature_enabled) waContent = `*${currentAgent?.name || 'Agente'}:*\n${waContent}`;
        if (inbox.is_connected) {
          await sendWaMessage({ sessionId: inbox.wa_session_id, phone: contact.phone, type: messageType, content: waContent, mediaUrl, conversationId: activeConversation.id });
        } else {
          showToast('Aviso: Caixa de entrada WhatsApp desconectada.', 'warning');
        }
      }

      // Handle @mention notifications
      const mentionedNames = [...(text.matchAll(/@([A-Za-zÀ-ÿ0-9_\- ]+?)(?=\s|$|[.,!?])/g))].map(m => m[1].trim().toLowerCase());
      if (mentionedNames.length > 0) {
        const supabase = getSupabase();
        if (supabase) {
          const mentionedAgents = agents.filter(a => mentionedNames.some(n => a.name?.toLowerCase().includes(n)));
          for (const ag of mentionedAgents) {
            await supabase.from('notifications').insert({ agent_id: ag.id, type: 'mention', message: `${currentAgent?.name || 'Agente'} mencionou você: "${text.substring(0, 80)}"`, conversation_id: activeConversation.id }).catch(() => {});
          }
        }
      }

      loadMessages();
      fetchConversationsList();
    } catch (err) {
      console.error(err);
      showToast('Erro ao enviar mensagem: ' + (err.message || err), 'error');
    }
  };

  // ── Reaction handler ──────────────────────────────────────────────
  const handleReaction = async (msgId, emoji) => {
    const supabase = getSupabase();
    setReactionPickerMsgId(null);
    setReactions(prev => {
      const msgReactions = { ...(prev[msgId] || {}) };
      const users = [...(msgReactions[emoji] || [])];
      const myId = currentAgent?.id;
      const idx = users.indexOf(myId);
      if (idx >= 0) users.splice(idx, 1); else users.push(myId);
      if (users.length === 0) delete msgReactions[emoji]; else msgReactions[emoji] = users;
      return { ...prev, [msgId]: msgReactions };
    });
    if (supabase) {
      try {
        const { data: msgData } = await supabase.from('messages').select('metadata').eq('id', msgId).maybeSingle();
        const currentMeta = msgData?.metadata || {};
        const currentReactions = { ...(currentMeta.reactions || {}) };
        const users = [...(currentReactions[emoji] || [])];
        const myId = currentAgent?.id;
        const idx = users.indexOf(myId);
        if (idx >= 0) users.splice(idx, 1); else users.push(myId);
        if (users.length === 0) delete currentReactions[emoji]; else currentReactions[emoji] = users;
        await supabase.from('messages').update({ metadata: { ...currentMeta, reactions: currentReactions } }).eq('id', msgId);
      } catch (err) { console.error('Reaction save error:', err); }
    }
  };

  // ── Edit/Delete handlers ──────────────────────────────────────────
  const handleStartEdit = (msg) => {
    setEditingMsgId(msg.id);
    setEditingContent(msg.content || '');
  };

  const handleSaveEdit = async (msgId) => {
    if (!editingContent.trim()) return;
    try {
      await updateMessage(msgId, editingContent.trim());
      setEditedMsgIds(prev => new Set([...prev, msgId]));
      setEditingMsgId(null);
      loadMessages();
      showToast('Mensagem editada!', 'success');
    } catch (err) { showToast('Erro ao editar: ' + err.message, 'error'); }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Deletar esta mensagem?')) return;
    try {
      await deleteMessage(msgId);
      loadMessages();
      showToast('Mensagem removida.', 'success');
    } catch (err) { showToast('Erro ao deletar: ' + err.message, 'error'); }
  };

  // ── Audio recording ───────────────────────────────────────────────
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        setSelectedFile(file);
        setIsRecording(false);
        clearInterval(recordingTimerRef.current);
        setRecordingTime(0);
        showToast('Áudio gravado — clique em Enviar para confirmar.', 'info');
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      showToast('Não foi possível acessar o microfone. Verifique as permissões.', 'error');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = () => {};
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
  };

  // ── Clipboard paste ───────────────────────────────────────────────
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          setSelectedFile(file);
          showToast('Imagem colada — pronta para enviar!', 'info');
        }
        return;
      }
    }
  }, []);

  // ── File handler ──────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    e.target.value = null;
  };

  // ── Emoji insert ──────────────────────────────────────────────────
  const insertEmoji = (emoji) => {
    setInputValue(prev => prev + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  // ── Drag & Drop ───────────────────────────────────────────────────
  const handleDragOver  = useCallback((e) => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragOver(false), []);
  const handleDrop      = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) { setSelectedFile(file); showToast(`Arquivo "${file.name}" pronto para enviar.`, 'info'); }
  }, []);

  // ── Canned + mentions ─────────────────────────────────────────────
  const handleInputChange = async (e) => {
    const val = e.target.value;
    setInputValue(val);
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([A-Za-zÀ-ÿ0-9_\- ]*)$/);
    if (atMatch) { setMentionSearch(atMatch[1]); setMentionDropdown(true); setMentionIndex(0); }
    else { setMentionDropdown(false); setMentionSearch(''); }
    if (val.startsWith('/') || val.includes(' /')) {
      const parts = val.split('/');
      const query = parts[parts.length - 1].toLowerCase();
      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase.from('canned_responses').select('*').ilike('shortcut', `%${query}%`).limit(5);
        setCannedList(data || []);
      }
    } else { setCannedList([]); }
  };

  const handleSelectCanned = (content) => {
    const slashIdx = inputValue.lastIndexOf('/');
    setInputValue(inputValue.substring(0, slashIdx) + content);
    setCannedList([]);
    inputRef.current?.focus();
  };

  // ── Mention select ────────────────────────────────────────────────
  const handleMentionSelect = (agent) => {
    const cursorPos = inputRef.current?.selectionStart ?? inputValue.length;
    const textBeforeCursor = inputValue.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([A-Za-zÀ-ÿ0-9_\- ]*)$/);
    if (atMatch) {
      const beforeAt = textBeforeCursor.substring(0, atMatch.index);
      const afterCursor = inputValue.substring(cursorPos);
      setInputValue(`${beforeAt}@${agent.name} ${afterCursor}`);
    } else {
      setInputValue(prev => `${prev}@${agent.name} `);
    }
    setMentionDropdown(false);
    setMentionSearch('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ── Keyboard nav for mention + enter to send ──────────────────────
  const handleTextareaKeyDown = (e) => {
    if (mentionDropdown && mentionAgents.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, mentionAgents.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); handleMentionSelect(mentionAgents[mentionIndex]); return; }
      if (e.key === 'Escape')  { setMentionDropdown(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── In-conv search navigation ─────────────────────────────────────
  const scrollToMatch = (idx) => {
    const matches = displayedMessages;
    if (!matches.length) return;
    const target = matches[idx % matches.length];
    const el = document.getElementById(`msg-${target.id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ── AI Copilot ────────────────────────────────────────────────────
  const handleAiCopilot = async () => {
    const waUrl = localStorage.getItem('WA_API_URL') || 'http://localhost:3009';
    const waKey = localStorage.getItem('WA_API_KEY') || '';
    if (!waUrl || !waKey) { showToast('Configure a conexão da API nas Configurações primeiro!', 'error'); return; }
    setAiLoading(true);
    try {
      const response = await fetch(`${waUrl}/api/ai/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': waKey },
        body: JSON.stringify({ conversationId: activeConversation.id })
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setInputValue(result.suggestion);
        inputRef.current?.focus();
        showToast('Sugestão da IA carregada!', 'success');
      } else { showToast(result.error || 'Erro ao gerar sugestão de IA.', 'error'); }
    } catch (err) {
      console.error(err);
      showToast('Falha na conexão com o Copilot IA.', 'error');
    } finally { setAiLoading(false); }
  };

  // ── Export transcript ─────────────────────────────────────────────
  const handleExportTranscript = async () => {
    showToast('Preparando transcrição...', 'info');
    try {
      const msgs = await getMessages(activeConversation.id);
      if (!msgs || msgs.length === 0) { showToast('Nenhuma mensagem para exportar.', 'warning'); return; }
      const clientName = contact.name || contact.phone || 'Cliente';
      const printWindow = window.open('', '_blank');
      const html = msgs.map(msg => {
        const sender = msg.sender_type === 'contact' ? clientName : (msg.sender_type === 'agent' ? 'Agente' : 'Sistema');
        const time = new Date(msg.created_at).toLocaleString('pt-BR');
        return `<div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #eee;font-family:sans-serif;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#666;margin-bottom:4px;"><strong>${sender}</strong><span>${time}</span></div>
          <div style="font-size:14px;color:#111;white-space:pre-wrap;">${msg.content || '[Mídia]'}${msg.media_url ? ` <a href="${msg.media_url}" target="_blank">🔗 Ver anexo</a>` : ''}</div>
        </div>`;
      }).join('');
      printWindow.document.write(`<!DOCTYPE html><html><head><title>Transcrição: ${clientName}</title></head><body style="font-family:sans-serif;padding:40px;max-width:800px;margin:0 auto;">
        <h1 style="margin-bottom:8px">Atendimento: ${clientName}</h1>
        <p style="color:#666;font-size:13px;">Exportado em ${new Date().toLocaleString('pt-BR')}</p>
        <hr style="margin:20px 0">${html}</body></html>`);
      printWindow.document.close();
      setShowMenu(false);
    } catch (err) { console.error(err); }
  };

  // ── Template select ───────────────────────────────────────────────
  const handleSelectTemplate = (tmpl) => {
    setInputValue(tmpl.body || '');
    setShowTemplates(false);
    inputRef.current?.focus();
  };

  // ── Status icon ───────────────────────────────────────────────────
  const renderStatus = (status) => {
    if (status === 'failed')    return <span className="msg-status-icon status-failed" title="Falha">✕</span>;
    if (status === 'read')      return <span className="msg-status-icon status-read" title="Lida"><CheckCheck size={14}/></span>;
    if (status === 'delivered') return <span className="msg-status-icon status-delivered" title="Entregue"><CheckCheck size={14}/></span>;
    return <span className="msg-status-icon status-sent" title="Enviada"><Check size={12}/></span>;
  };

  // ── Filtered templates for picker ─────────────────────────────────
  const filteredTemplates = templateSearch
    ? templates.filter(t => t.name?.toLowerCase().includes(templateSearch.toLowerCase()) || t.body?.toLowerCase().includes(templateSearch.toLowerCase()))
    : templates;

  // ────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────
  if (!activeConversation) {
    return (
      <section id="chat-window" className="column-col3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)' }}>
        <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
        <p>Selecione uma conversa para iniciar o atendimento</p>
      </section>
    );
  }

  return (
    <section
      id="chat-window"
      className="column-col3"
      style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 999, background: 'rgba(124,111,247,0.12)', backdropFilter: 'blur(2px)', border: '2px dashed var(--accent)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', pointerEvents: 'none' }}>
          <Upload size={40} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent)' }}>Solte o arquivo aqui</span>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="chat-header" style={{ position: 'relative' }}>
        <div className="chat-header-left" style={{ display: 'flex', alignItems: 'center' }}>
          <button className="toolbar-btn btn-close-chat" onClick={() => setActiveConversation(null)} title="Fechar" style={{ marginRight: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <ArrowLeft size={20} />
          </button>
          <div className="contact-avatar-big" style={{ width: '40px', height: '40px', fontSize: '14px', marginRight: '8px' }}>
            {contact.avatar_url ? (
              <img src={contact.avatar_url} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="Avatar" />
            ) : (contact.name || contact.phone || 'C').substring(0, 1).toUpperCase()}
          </div>
          <div className="chat-header-info">
            <span className="chat-header-name">{contact.name || contact.phone || 'Sem Nome'}</span>
            <div className="chat-header-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{contact.phone || ''}</span>
              {/* SLA Badge */}
              {slaInfo && activeConversation.status === 'open' && (
                <span className={`sla-badge ${slaInfo.tier}`} title={`Tempo aberto: ${slaInfo.label}`}>
                  <Clock size={10} /> {slaInfo.label}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="chat-header-right" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Bot toggle */}
          {inbox.bot_enabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
              {activeConversation.bot_active !== false ? (
                <>
                  <span style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: '10px', fontWeight: 600, padding: '4px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--accent)', borderRadius: '50%' }} />Robô Ativo
                  </span>
                  <button className="btn-cancel" onClick={handleToggleBot} style={{ fontSize: '11px', padding: '4px 8px', cursor: 'pointer' }}>Pausar Bot</button>
                </>
              ) : (
                <>
                  <span style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid #f59e0b', color: '#f59e0b', fontSize: '10px', fontWeight: 600, padding: '4px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', background: '#f59e0b', borderRadius: '50%' }} />Humano
                  </span>
                  <button className="btn-resolve" onClick={handleToggleBot} style={{ fontSize: '11px', padding: '4px 8px', cursor: 'pointer' }}>Ativar Bot</button>
                </>
              )}
            </div>
          )}

          {activeConversation.status === 'resolved' ? (
            <button className="btn-resolve" onClick={() => handleStatusChange('open')} style={{ background: 'var(--accent)' }}>
              <FolderOpen size={14} style={{ marginRight: '4px' }} /> Reabrir
            </button>
          ) : (
            <button className="btn-resolve" onClick={() => handleStatusChange('resolved')}>
              <Check size={14} style={{ marginRight: '4px' }} /> Resolver
            </button>
          )}

          {/* In-conv search toggle */}
          <button
            className="toolbar-btn"
            onClick={() => { setShowConvSearch(s => !s); setTimeout(() => convSearchRef.current?.focus(), 100); }}
            title="Buscar na conversa (Ctrl+F)"
            style={{ color: showConvSearch ? 'var(--accent)' : undefined }}
          >
            <Search size={18} />
          </button>

          <button className="toolbar-btn" onClick={() => setContactCollapsed(!contactCollapsed)} title="Informações do Contato">
            <User size={18} />
          </button>

          <button className="toolbar-btn" id="chat-header-menu" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}>
            <MoreVertical size={18} />
          </button>

          {/* Dropdown menu */}
          <div className={`header-dropdown ${showMenu ? 'active' : ''}`} id="chat-menu-dropdown"
            style={{ top: '50px', right: '16px', left: 'auto', width: '180px', display: showMenu ? 'block' : 'none' }}>
            <div className="avatar-dropdown-item" onClick={() => handleStatusChange('pending')}>Marcar como Pendente</div>
            <div className="avatar-dropdown-item" onClick={() => handleStatusChange('snoozed')}>Marcar como Suspensa</div>
            <div className="avatar-dropdown-item" onClick={() => { setShowTransfer(true); setShowMenu(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--warning)' }}>
              <ArrowRightLeft size={14} /> Transferir Conversa
            </div>
            <div className="avatar-dropdown-item" onClick={handleExportTranscript}
              style={{ borderTop: '1px solid var(--border-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={14} /> Exportar Transcrição
            </div>
          </div>
        </div>
      </header>

      {/* ── IN-CONVERSATION SEARCH BAR ── */}
      {showConvSearch && (
        <div className="in-conv-search-bar">
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={convSearchRef}
            className="in-conv-search-input"
            placeholder="Buscar nesta conversa..."
            value={convSearch}
            onChange={(e) => { setConvSearch(e.target.value); setSearchMatchIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { scrollToMatch(searchMatchIdx); setSearchMatchIdx(i => (i + 1) % Math.max(1, searchMatches)); }
              if (e.key === 'Escape') { setShowConvSearch(false); setConvSearch(''); }
            }}
          />
          {convSearch && (
            <span className="in-conv-search-count">
              {searchMatches === 0 ? 'Sem resultados' : `${Math.min(searchMatchIdx + 1, searchMatches)}/${searchMatches}`}
            </span>
          )}
          <div className="in-conv-search-nav">
            <button onClick={() => { setSearchMatchIdx(i => Math.max(0, i - 1)); scrollToMatch(Math.max(0, searchMatchIdx - 1)); }} disabled={!convSearch || searchMatches === 0}>↑</button>
            <button onClick={() => { const next = (searchMatchIdx + 1) % Math.max(1, searchMatches); setSearchMatchIdx(next); scrollToMatch(next); }} disabled={!convSearch || searchMatches === 0}>↓</button>
          </div>
          <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' }} onClick={() => { setShowConvSearch(false); setConvSearch(''); }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── MESSAGES TIMELINE ── */}
      <div className="chat-messages-area" id="chat-msg-scroller" ref={scrollerRef} style={{ flexGrow: 1, overflowY: 'auto' }}>
        {displayedMessages.map(msg => {
          const isLeft   = msg.sender_type === 'contact';
          const isCenter = msg.sender_type === 'system';
          const isNote   = msg.message_type === 'note';
          const isDeleted = msg.metadata?.deleted === true;
          const isAgentMsg = msg.sender_type === 'agent';
          const agent    = isAgentMsg ? agents.find(a => a.id === msg.sender_id) : null;
          const agentName = agent ? agent.name : 'Agente';
          const msgReactions = reactions[msg.id] || (msg.metadata?.reactions) || {};
          const hasReactions = Object.keys(msgReactions).length > 0;
          const repliedTo = msg.metadata?.replied_to || null;
          const isEditing = editingMsgId === msg.id;
          const wasEdited = editedMsgIds.has(msg.id);

          if (isCenter) {
            return (
              <div key={msg.id} className="bubble-container center">
                <div className="system-activity">{msg.content}</div>
              </div>
            );
          }

          if (isNote) {
            return (
              <div key={msg.id} className="bubble-container center">
                <div className="bubble-note">
                  <div className="note-header" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={12} /> Nota Interna
                  </div>
                  <div>{msg.content}</div>
                  <div className="bubble-footer">
                    <span className="bubble-time">{formatTime(msg.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`bubble-container ${isLeft ? 'left' : 'right'}`} id={`msg-${msg.id}`}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isLeft ? 'flex-start' : 'flex-end', maxWidth: '70%' }}>
                {!isLeft && isAgentMsg && (
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px', padding: '0 4px', fontWeight: 500 }}>{agentName}</span>
                )}

                <div className="msg-wrapper" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: isLeft ? 'flex-start' : 'flex-end' }}>

                  {/* ── Hover Actions ── */}
                  {!isDeleted && !isEditing && (
                    <div className={`msg-hover-actions ${isLeft ? 'left' : 'right'}`}>
                      <button className="msg-action-btn" title="Responder" onClick={() => setReplyTo({ id: msg.id, content: msg.content || (msg.media_url ? '[Mídia]' : ''), sender_type: msg.sender_type, sender_id: msg.sender_id, sender_name: isLeft ? (contact.name || contact.phone) : agentName })}>
                        <Reply size={14} />
                      </button>
                      <button className="msg-action-btn" data-react="true" title="Reagir" onClick={(e) => { e.stopPropagation(); setReactionPickerMsgId(prev => prev === msg.id ? null : msg.id); }}>
                        <Smile size={14} />
                      </button>
                      {/* Edit/Delete — only for agent messages */}
                      {isAgentMsg && (
                        <>
                          <button className="msg-action-btn" title="Editar mensagem" onClick={() => handleStartEdit(msg)}>
                            <Edit3 size={13} />
                          </button>
                          <button className="msg-action-btn" title="Deletar mensagem" onClick={() => handleDeleteMessage(msg.id)} style={{ color: 'var(--danger)' }}>
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}

                      {/* Quick reaction picker */}
                      {reactionPickerMsgId === msg.id && (
                        <div className={`quick-reaction-picker ${isLeft ? 'left' : 'right'}`} onClick={e => e.stopPropagation()}>
                          {QUICK_REACTIONS.map(emoji => (
                            <button key={emoji} className="quick-reaction-emoji" onClick={() => handleReaction(msg.id, emoji)}>{emoji}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Bubble ── */}
                  <div className="bubble" style={{ maxWidth: '100%', width: 'fit-content', minWidth: isEditing ? '260px' : undefined }}>

                    {/* Quote block */}
                    {repliedTo && (
                      <div className="msg-quote-block" onClick={() => {
                        const el = document.getElementById(`msg-${repliedTo.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}>
                        <div className="msg-quote-author">
                          ↩ {repliedTo.sender_type === 'contact' ? (contact.name || contact.phone || 'Cliente') : (agents.find(a => a.id === repliedTo.sender_id)?.name || 'Agente')}
                        </div>
                        <div className="msg-quote-text">{repliedTo.content || '[Mídia]'}</div>
                      </div>
                    )}

                    {/* Deleted message */}
                    {isDeleted ? (
                      <div className="msg-deleted">🚫 Mensagem removida</div>
                    ) : isEditing ? (
                      /* Edit mode */
                      <div>
                        <textarea
                          className="msg-edit-textarea"
                          value={editingContent}
                          onChange={e => setEditingContent(e.target.value)}
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(msg.id); } if (e.key === 'Escape') setEditingMsgId(null); }}
                        />
                        <div className="msg-edit-actions">
                          <button className="msg-edit-cancel" onClick={() => setEditingMsgId(null)}>Cancelar</button>
                          <button className="msg-edit-save" onClick={() => handleSaveEdit(msg.id)}>Salvar</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Media */}
                        {msg.media_url && (
                          <div className="bubble-media-wrapper">
                            {msg.message_type === 'image' ? (
                              <img src={msg.media_url} className="media-thumbnail" alt="Anexo" onClick={() => window.open(msg.media_url, '_blank')} style={{ cursor: 'pointer', maxWidth: '100%', borderRadius: '4px' }} />
                            ) : msg.message_type === 'audio' ? (
                              <audio controls className="audio-player-wrapper" style={{ maxWidth: '100%' }}>
                                <source src={msg.media_url} type={msg.media_mime_type || 'audio/ogg'} />
                              </audio>
                            ) : (
                              <a href={msg.media_url} target="_blank" className="media-file-card" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                                <FileText size={18} />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 600 }}>{msg.media_filename || 'arquivo.bin'}</span>
                                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Documento</span>
                                </div>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Text content with mentions + conv search highlights */}
                        {msg.content && (
                          <div
                            style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                            dangerouslySetInnerHTML={{ __html: renderWithMentions(highlightConvSearch(formatMessageText(msg.content))) }}
                          />
                        )}
                      </>
                    )}

                    {/* Footer */}
                    {!isEditing && (
                      <div className="bubble-footer" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        {wasEdited && <span className="msg-edited-tag">editada</span>}
                        <span className="bubble-time" style={{ fontSize: '9px', opacity: 0.7 }}>{formatTime(msg.created_at)}</span>
                        {!isLeft && renderStatus(msg.status)}
                      </div>
                    )}
                  </div>

                  {/* Reactions */}
                  {hasReactions && !isDeleted && (
                    <div className="msg-reactions-bar">
                      {Object.entries(msgReactions).map(([emoji, users]) => {
                        if (!users || users.length === 0) return null;
                        const isMine = users.includes(currentAgent?.id);
                        return (
                          <button key={emoji} className={`reaction-chip ${isMine ? 'mine' : ''}`} onClick={() => handleReaction(msg.id, emoji)}>
                            <span>{emoji}</span>
                            <span className="reaction-count">{users.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Typing indicator */}
      {clientTyping && (
        <div id="chat-typing-indicator" style={{ display: 'flex', padding: '6px 20px', fontSize: '11px', color: 'var(--success)', fontStyle: 'italic', background: 'rgba(34, 197, 94, 0.03)', borderTop: '1px solid var(--border)', alignItems: 'center', gap: '8px' }}>
          <span className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--success)', borderRadius: '50%', display: 'inline-block' }} />
          <span>{contact.name || contact.phone || 'Cliente'} está digitando...</span>
        </div>
      )}

      {/* ── INPUT AREA ── */}
      <div className="chat-input-container" style={{ position: 'relative' }}>
        {(activeConversation.status === 'unassigned' || !activeConversation.assigned_agent_id) ? (
          <div className="chat-input-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <button
              onClick={async () => {
                const supabase = getSupabase();
                if (supabase && currentAgent) {
                  await supabase.from('conversations').update({ assigned_agent_id: currentAgent.id }).eq('id', activeConversation.id);
                  setActiveConversation({ ...activeConversation, assigned_agent_id: currentAgent.id });
                  fetchConversationsList();
                  showToast('Conversa atribuída a você!', 'success');
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--accent)', color: '#fff', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
            >
              <User size={18} /><span>Atribuir a mim para responder</span>
            </button>
          </div>
        ) : (
          <div className="chat-input-box" id="chat-input-box-wrapper">

            {/* Recording indicator */}
            {isRecording && (
              <div className="recording-indicator">
                <div className="recording-pulse" />
                <div className="recording-waveform">
                  {[...Array(7)].map((_, i) => <span key={i} />)}
                </div>
                <div className="recording-timer">{fmtRecTime(recordingTime)}</div>
                <button className="recording-cancel" onClick={handleCancelRecording} title="Cancelar gravação"><X size={14} /></button>
              </div>
            )}

            {/* Reply preview */}
            {replyTo && (
              <div className="reply-preview-banner">
                <div className="reply-preview-bar" />
                <div className="reply-preview-content">
                  <div className="reply-preview-author">
                    ↩ Respondendo {replyTo.sender_type === 'contact' ? (contact.name || contact.phone || 'Cliente') : replyTo.sender_name || 'Agente'}
                  </div>
                  <div className="reply-preview-text">{replyTo.content || '[Mídia]'}</div>
                </div>
                <button className="reply-preview-close" onClick={() => setReplyTo(null)} title="Cancelar"><X size={14} /></button>
              </div>
            )}

            {/* Selected file chip */}
            {selectedFile && (
              <div className="selected-file-chip">
                <FileText size={14} style={{ flexShrink: 0 }} />
                <span className="selected-file-chip-name">{selectedFile.name}</span>
                <button className="selected-file-chip-remove" onClick={() => setSelectedFile(null)} title="Remover"><X size={13} /></button>
              </div>
            )}

            {/* Tabs */}
            <div className="chat-input-toolbar-top" style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
              <div className={`input-tab ${!isNoteMode ? 'active' : ''}`} onClick={() => setIsNoteMode(false)} style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Resposta</div>
              <div className={`input-tab ${isNoteMode ? 'active' : ''}`} onClick={() => setIsNoteMode(true)} style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Nota Interna</div>
            </div>

            {/* Textarea */}
            <textarea
              className="chat-textarea"
              ref={inputRef}
              placeholder={isNoteMode ? 'Nota interna...' : 'Resposta... (/ para atalhos, @ para mencionar, Ctrl+V para colar imagem)'}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleTextareaKeyDown}
              onPaste={handlePaste}
              maxLength={WA_CHAR_LIMIT}
              style={{ width: '100%', minHeight: '60px', padding: '12px', border: 'none', background: 'transparent', resize: 'none', outline: 'none', color: 'var(--text-primary)' }}
            />

            {/* Char counter */}
            {charCount > 0 && (
              <div style={{ textAlign: 'right', padding: '0 14px 4px', fontSize: '10px', color: charCount > WA_CHAR_LIMIT * 0.9 ? 'var(--warning)' : 'var(--text-muted)', fontFamily: 'monospace' }}>
                {charCount}/{WA_CHAR_LIMIT}
              </div>
            )}

            {/* Bottom toolbar */}
            <div className="chat-input-toolbar-bottom" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', alignItems: 'center' }}>
              <div className="toolbar-actions" style={{ display: 'flex', gap: '6px', position: 'relative' }}>
                <button className="toolbar-btn" id="btn-emoji" onClick={() => setShowEmojis(!showEmojis)} title="Emojis"><Smile size={18} /></button>
                <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()} title="Anexar arquivo"><Paperclip size={18} /></button>
                <button
                  className={`toolbar-btn recording-btn ${isRecording ? 'active' : ''}`}
                  title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                >
                  {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button className="toolbar-btn" title="Mencionar agente (@)" onClick={() => {
                  const cur = inputRef.current;
                  if (cur) {
                    const pos = cur.selectionStart;
                    setInputValue(v => v.substring(0, pos) + '@' + v.substring(pos));
                    setMentionDropdown(true);
                    setMentionSearch('');
                    setTimeout(() => { cur.focus(); cur.setSelectionRange(pos + 1, pos + 1); }, 10);
                  }
                }}>
                  <AtSign size={18} />
                </button>
                <button
                  className="toolbar-btn"
                  title="Templates WhatsApp (HSM)"
                  onClick={() => setShowTemplates(!showTemplates)}
                  style={{ color: showTemplates ? 'var(--accent)' : undefined }}
                >
                  <LayoutTemplate size={18} />
                </button>
                <button className="toolbar-btn" onClick={handleAiCopilot} disabled={aiLoading} title="Sugerir por IA" style={{ color: 'var(--accent)' }}>
                  <Sparkles size={18} className={aiLoading ? 'shimmer-pulse' : ''} />
                </button>

                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

                {/* Emoji Picker */}
                {showEmojis && (
                  <div ref={emojiRef}>
                    <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmojis(false)} />
                  </div>
                )}

                {/* @Mention dropdown */}
                {mentionDropdown && mentionAgents.length > 0 && (
                  <div className="mention-dropdown" onClick={e => e.stopPropagation()}>
                    {mentionAgents.map((ag, idx) => (
                      <div
                        key={ag.id}
                        className={`mention-item ${idx === mentionIndex ? 'selected' : ''}`}
                        onClick={() => handleMentionSelect(ag)}
                        onMouseEnter={() => setMentionIndex(idx)}
                      >
                        <div className="mention-item-avatar" style={{ background: getAvatarColor(ag.name) }}>
                          {ag.avatar_url ? <img src={ag.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (ag.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="mention-item-name">{ag.name}</div>
                          <div className="mention-item-role">{ag.role || 'agente'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="btn-send"
                onClick={handleSend}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                <span>Enviar</span><Send size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Canned dropdown */}
        {cannedList.length > 0 && (
          <div className="canned-dropdown active" style={{ position: 'absolute', left: '16px', bottom: 'calc(100% - 10px)', width: 'calc(100% - 32px)', maxHeight: '180px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', overflowY: 'auto', zIndex: 600, boxShadow: 'var(--shadow-lg)' }}>
            {cannedList.map(item => (
              <div key={item.id} className="canned-item" onClick={() => handleSelectCanned(item.content)}
                style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>/{item.shortcut}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{item.content.substring(0, 45)}...</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── TEMPLATES HSM MODAL ── */}
      {showTemplates && (
        <div className="templates-modal-overlay" onClick={() => setShowTemplates(false)}>
          <div className="templates-modal" onClick={e => e.stopPropagation()}>
            <div className="templates-modal-header">
              <LayoutTemplate size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Templates WhatsApp (HSM)</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mensagens aprovadas para contato fora da janela de 24h</div>
              </div>
              <button onClick={() => setShowTemplates(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <input
                className="templates-modal-search"
                placeholder="Buscar template..."
                value={templateSearch}
                onChange={e => setTemplateSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="templates-list">
              {filteredTemplates.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  {templates.length === 0 ? 'Nenhum template cadastrado ainda.\nAdicione templates na tabela whatsapp_templates do Supabase.' : 'Nenhum template encontrado para esta busca.'}
                </div>
              ) : (
                filteredTemplates.map(tmpl => (
                  <div key={tmpl.id} className="template-card" onClick={() => handleSelectTemplate(tmpl)}>
                    <div className="template-card-name">
                      {tmpl.name}
                      <span className="template-cat-badge">{tmpl.category || 'UTILITY'}</span>
                    </div>
                    <div className="template-card-body">
                      {(tmpl.body || '').replace(/\{\{(\d+)\}\}/g, (_, n) => `[var ${n}]`)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <TransferModal
          conversation={activeConversation}
          onClose={() => setShowTransfer(false)}
          onTransferred={() => {
            setShowTransfer(false);
            fetchConversationsList();
            loadMessages();
          }}
        />
      )}
    </section>
  );
}
