import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../supabase';
import { showToast } from '../../utils';
import { Plus, Trash2, X, Edit3, Zap, ChevronDown, CheckCircle2, XCircle, Filter, Play } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   Inline scoped styles – keeps the component self-contained
───────────────────────────────────────────────────────────────────────────── */
const css = `
.aut-root { display: flex; flex-direction: column; gap: 24px; }

/* ── Header ── */
.aut-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.aut-header-text h2 { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
.aut-header-text p  { font-size: 13px; color: var(--text-secondary); margin: 0; }
.aut-btn-create {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 20px; font-size: 13px; font-weight: 600;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff; border: none; border-radius: var(--radius-sm);
  cursor: pointer; transition: opacity .2s, transform .1s; white-space: nowrap;
  box-shadow: 0 4px 14px rgba(99,102,241,.35);
}
.aut-btn-create:hover { opacity: .9; transform: translateY(-1px); }

/* ── Empty state ── */
.aut-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 60px 24px;
  border: 2px dashed var(--border); border-radius: var(--radius-lg);
  background: rgba(99,102,241,.03);
}
.aut-empty-icon { width: 52px; height: 52px; background: rgba(99,102,241,.12); border-radius: 50%;
  display: flex; align-items: center; justify-content: center; color: var(--accent); }
.aut-empty h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
.aut-empty p  { font-size: 13px; color: var(--text-secondary); margin: 0; text-align: center; }

/* ── Cards grid ── */
.aut-grid { display: flex; flex-direction: column; gap: 12px; }
.aut-card {
  background: var(--bg-secondary); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 0;
  transition: border-color .2s, box-shadow .2s; overflow: hidden;
}
.aut-card:hover { border-color: rgba(99,102,241,.4); box-shadow: 0 4px 20px rgba(0,0,0,.15); }
.aut-card-header {
  display: flex; align-items: center; gap: 14px; padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}
.aut-card-icon {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(99,102,241,.2), rgba(139,92,246,.2));
  color: #818cf8;
}
.aut-card-title { flex: 1; min-width: 0; }
.aut-card-title strong { display: block; font-size: 14px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.aut-card-title span   { font-size: 12px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.aut-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
  padding: 3px 8px; border-radius: 20px;
}
.aut-badge-trigger { background: rgba(14,165,233,.15); color: #38bdf8; }
.aut-badge-active  { background: rgba(34,197,94,.15); color: #4ade80; }
.aut-badge-inactive{ background: rgba(107,114,128,.15); color: #9ca3af; }
.aut-card-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.aut-icon-btn {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border: none; border-radius: 8px; cursor: pointer; transition: background .15s, color .15s;
  background: transparent;
}
.aut-icon-btn:hover { background: var(--bg-hover); }
.aut-icon-btn.danger { color: var(--danger); }
.aut-icon-btn.edit   { color: var(--text-secondary); }
.aut-icon-btn.danger:hover { background: rgba(239,68,68,.12); color: #f87171; }
.aut-icon-btn.edit:hover   { background: rgba(99,102,241,.12); color: var(--accent); }

.aut-card-footer {
  display: flex; align-items: center; gap: 20px; padding: 10px 20px;
  background: rgba(0,0,0,.08);
}
.aut-card-stat { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); }
.aut-toggle { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary); margin-left: auto; cursor: pointer; }
.aut-toggle label { cursor: pointer; }

/* ── Modal overlay ── */
.aut-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,.65); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.aut-modal {
  background: var(--bg-primary); border: 1px solid var(--border);
  border-radius: var(--radius-xl, 16px); width: 760px; max-width: 100%;
  max-height: 90vh; display: flex; flex-direction: column;
  box-shadow: 0 24px 64px rgba(0,0,0,.5);
}
.aut-modal-head {
  display: flex; align-items: center; gap: 12px; padding: 20px 24px;
  border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.aut-modal-head-icon {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff;
}
.aut-modal-head h3 { flex: 1; font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; }
.aut-modal-close {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  background: var(--bg-hover); border: none; border-radius: 8px;
  color: var(--text-secondary); cursor: pointer; transition: background .15s;
}
.aut-modal-close:hover { background: var(--border); }

.aut-modal-body {
  flex: 1; overflow-y: auto; padding: 24px;
  display: flex; flex-direction: column; gap: 20px;
}

/* ── Form fields ── */
.aut-field { display: flex; flex-direction: column; gap: 6px; }
.aut-field label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: .06em; }
.aut-input {
  height: 40px; padding: 0 12px; width: 100%;
  background: var(--bg-input); border: 1px solid var(--border);
  border-radius: var(--radius); color: var(--text-primary); font-size: 13px;
  transition: border-color .15s; box-sizing: border-box;
}
.aut-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
.aut-select {
  height: 40px; padding: 0 12px; width: 100%;
  background: var(--bg-input); border: 1px solid var(--border);
  border-radius: var(--radius); color: var(--text-primary); font-size: 13px;
  transition: border-color .15s; cursor: pointer; box-sizing: border-box;
  -webkit-appearance: none; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%236b7280' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center;
  padding-right: 34px;
}
.aut-select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
.aut-textarea {
  width: 100%; padding: 10px 12px; min-height: 80px; resize: vertical;
  background: var(--bg-input); border: 1px solid var(--border);
  border-radius: var(--radius); color: var(--text-primary); font-size: 13px;
  font-family: inherit; transition: border-color .15s; box-sizing: border-box;
}
.aut-textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(99,102,241,.12); }

/* ── Section box ── */
.aut-section {
  border: 1px solid var(--border); border-radius: var(--radius-lg);
  overflow: hidden;
}
.aut-section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; background: rgba(0,0,0,.12);
  border-bottom: 1px solid var(--border);
}
.aut-section-title { display: flex; align-items: center; gap: 8px; }
.aut-section-title span { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.aut-section-badge {
  width: 20px; height: 20px; border-radius: 50%; font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  background: rgba(99,102,241,.2); color: var(--accent);
}
.aut-section-body { padding: 16px; display: flex; flex-direction: column; gap: 10px; background: var(--bg-secondary); }
.aut-btn-add {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px;
  font-size: 12px; font-weight: 600; color: var(--accent); cursor: pointer;
  background: rgba(99,102,241,.08); border: 1px dashed rgba(99,102,241,.35);
  border-radius: var(--radius-sm); transition: background .15s, border-color .15s;
  width: 100%;  justify-content: center;
}
.aut-btn-add:hover { background: rgba(99,102,241,.14); border-color: rgba(99,102,241,.6); }

/* ── Condition row ── */
.aut-cond-row {
  display: grid; grid-template-columns: 200px 140px 1fr 32px;
  gap: 8px; align-items: center;
  background: var(--bg-input); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 10px 12px;
}
.aut-cond-row:hover { border-color: rgba(99,102,241,.3); }
.aut-remove-btn {
  width: 28px; height: 28px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  background: transparent; border: none; border-radius: 6px;
  color: var(--text-muted); cursor: pointer; transition: background .15s, color .15s;
}
.aut-remove-btn:hover { background: rgba(239,68,68,.12); color: #f87171; }

/* ── Action row ── */
.aut-action-row {
  display: flex; flex-direction: column; gap: 8px;
  background: var(--bg-input); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 12px;
}
.aut-action-row:hover { border-color: rgba(99,102,241,.3); }
.aut-action-head { display: flex; align-items: center; gap: 8px; }
.aut-action-num {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(99,102,241,.2); color: var(--accent);
  font-size: 10px; font-weight: 700;
}

/* ── Footer ── */
.aut-modal-footer {
  display: flex; justify-content: flex-end; align-items: center; gap: 10px;
  padding: 16px 24px; border-top: 1px solid var(--border); flex-shrink: 0;
}
.aut-btn-cancel {
  padding: 9px 20px; font-size: 13px; font-weight: 600;
  background: var(--bg-hover); border: 1px solid var(--border);
  color: var(--text-secondary); border-radius: var(--radius-sm); cursor: pointer;
  transition: background .15s;
}
.aut-btn-cancel:hover { background: var(--border); }
.aut-btn-save {
  padding: 9px 24px; font-size: 13px; font-weight: 600;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer;
  transition: opacity .2s; box-shadow: 0 4px 14px rgba(99,102,241,.3);
}
.aut-btn-save:hover { opacity: .9; }
.aut-btn-save:disabled, .aut-btn-cancel:disabled { opacity: .5; cursor: not-allowed; }

/* ── Inline select: no wrapper div workaround ── */
.aut-cond-value { display: contents; }
`;

/* ── Helper: trigger label ── */
const triggerLabel = (t) => {
  const map = {
    conversation_created: 'Conversa Criada',
    message_created: 'Mensagem Criada',
    conversation_opened: 'Conversa Aberta',
  };
  return map[t] || t;
};

export default function AutomationsSettings() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [labels, setLabels] = useState([]);
  const [inboxes, setInboxes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('conversation_created');
  const [conditions, setConditions] = useState([]);
  const [actions, setActions] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('automations').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setRules(data || []);
    } catch (err) {
      showToast('Erro ao buscar regras de automação.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxLists = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const [agentsRes, teamsRes, labelsRes, inboxesRes] = await Promise.all([
        supabase.from('agents').select('*').order('name', { ascending: true }),
        supabase.from('teams').select('*').order('name', { ascending: true }),
        supabase.from('labels').select('*').order('name', { ascending: true }),
        supabase.from('inboxes').select('*').order('name', { ascending: true }),
      ]);
      setAgents(agentsRes.data || []);
      setTeams(teamsRes.data || []);
      setLabels(labelsRes.data || []);
      setInboxes(inboxesRes.data || []);
    } catch {}
  };

  useEffect(() => { fetchRules(); fetchAuxLists(); }, []);

  const handleToggleActive = async (rule, isActive) => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('automations').update({ is_active: isActive }).eq('id', rule.id);
      if (error) throw error;
      showToast(isActive ? 'Automação ativada!' : 'Automação desativada.', 'success');
      fetchRules();
    } catch { showToast('Erro ao salvar status.', 'error'); }
  };

  const handleDeleteRule = async (rule) => {
    if (!window.confirm(`Excluir a regra "${rule.name}"?`)) return;
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('automations').delete().eq('id', rule.id);
      if (error) throw error;
      showToast('Regra excluída!', 'success');
      fetchRules();
    } catch (err) { showToast('Erro ao remover: ' + err.message, 'error'); }
  };

  const getConditionAttributes = (trigger) => {
    if (trigger === 'message_created' || trigger === 'message_received') {
      return [
        { value: 'message_type', label: 'Tipo da Mensagem' },
        { value: 'message_contains', label: 'Mensagem Contém' },
        { value: 'message_exact', label: 'Mensagem Exata' },
        { value: 'email', label: 'Email do Contato' },
        { value: 'inbox_id', label: 'Canal' },
        { value: 'phone_number', label: 'Telefone' },
      ];
    }
    return [
      { value: 'status', label: 'Status da Conversa' },
      { value: 'priority', label: 'Prioridade' },
      { value: 'email', label: 'Email do Contato' },
      { value: 'inbox_id', label: 'Canal' },
      { value: 'phone_number', label: 'Telefone' },
    ];
  };

  const handleOpenCreateModal = () => {
    setName(''); setDescription(''); setTriggerType('conversation_created');
    setConditions([]); setActions([]); setSelectedRule(null); setModalOpen('create');
  };

  const handleOpenEditModal = (rule) => {
    setSelectedRule(rule); setName(rule.name || ''); setDescription(rule.description || '');
    setTriggerType(rule.trigger_type || 'conversation_created');
    setConditions(rule.conditions || []); setActions(rule.actions || []); setModalOpen('edit');
  };

  const handleAddCondition = () => {
    const attrs = getConditionAttributes(triggerType);
    setConditions(prev => [...prev, { attribute: attrs[0].value, operator: 'equal_to', value: '' }]);
  };
  const handleRemoveCondition = (i) => setConditions(prev => prev.filter((_, idx) => idx !== i));
  const handleConditionChange = (i, key, val) => setConditions(prev => {
    const updated = [...prev];
    updated[i] = { ...updated[i], [key]: val };
    if (key === 'attribute') updated[i].value = '';
    return updated;
  });

  const handleAddAction = () => setActions(prev => [...prev, { type: 'assign_agent', value: '' }]);
  const handleRemoveAction = (i) => setActions(prev => prev.filter((_, idx) => idx !== i));
  const handleActionChange = (i, key, val) => setActions(prev => {
    const updated = [...prev];
    updated[i] = { ...updated[i], [key]: val };
    return updated;
  });

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    if (conditions.length === 0) { showToast('Adicione ao menos uma condição.', 'error'); return; }
    if (actions.length === 0) { showToast('Adicione ao menos uma ação.', 'error'); return; }
    const noValRequired = ['resolve_conv', 'mute_conversation', 'snooze_conversation'];
    if (conditions.some(c => !c.value) || actions.some(a => !noValRequired.includes(a.type) && !a.value)) {
      showToast('Preencha todos os campos de condições e ações.', 'error'); return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description.trim(), trigger_type: triggerType, conditions, actions };
      if (modalOpen === 'create') {
        const { error } = await supabase.from('automations').insert({ ...payload, is_active: true });
        if (error) throw error;
        showToast('Automação criada com sucesso!', 'success');
      } else {
        const { error } = await supabase.from('automations').update(payload).eq('id', selectedRule.id);
        if (error) throw error;
        showToast('Automação salva com sucesso!', 'success');
      }
      setModalOpen(false); fetchRules();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  /* ── Condition value field ── */
  const ConditionValueField = ({ cond, index }) => {
    const selStyle = { height: '32px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px', width: '100%', padding: '0 8px', boxSizing: 'border-box' };
    const inpStyle = { height: '32px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px', width: '100%', padding: '0 8px', boxSizing: 'border-box' };
    if (cond.attribute === 'inbox_id') return (
      <select value={cond.value} onChange={e => handleConditionChange(index, 'value', e.target.value)} required style={selStyle}>
        <option value="">Selecione o canal...</option>
        {inboxes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
      </select>
    );
    if (cond.attribute === 'status') return (
      <select value={cond.value} onChange={e => handleConditionChange(index, 'value', e.target.value)} required style={selStyle}>
        <option value="">Selecione o status...</option>
        <option value="open">Aberta</option><option value="pending">Pendente</option>
        <option value="resolved">Resolvida</option><option value="snoozed">Suspensa</option>
      </select>
    );
    if (cond.attribute === 'priority') return (
      <select value={cond.value} onChange={e => handleConditionChange(index, 'value', e.target.value)} required style={selStyle}>
        <option value="">Selecione a prioridade...</option>
        <option value="none">Nenhuma</option><option value="low">Baixa</option>
        <option value="medium">Média</option><option value="high">Alta</option><option value="urgent">Urgente</option>
      </select>
    );
    if (cond.attribute === 'message_type') return (
      <select value={cond.value} onChange={e => handleConditionChange(index, 'value', e.target.value)} required style={selStyle}>
        <option value="">Selecione o tipo...</option>
        <option value="incoming">Recebida</option><option value="outgoing">Enviada</option>
      </select>
    );
    return <input type="text" value={cond.value} onChange={e => handleConditionChange(index, 'value', e.target.value)} placeholder="Digite o valor..." required style={inpStyle} />;
  };

  /* ── Action value field ── */
  const ActionValueField = ({ act, index }) => {
    const selStyle = { height: '36px', width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px', padding: '0 10px', boxSizing: 'border-box' };
    const noVal = ['resolve_conv', 'mute_conversation', 'snooze_conversation'];
    if (noVal.includes(act.type)) return <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum parâmetro necessário.</p>;
    if (act.type === 'assign_agent') return (
      <select value={act.value} onChange={e => handleActionChange(index, 'value', e.target.value)} required style={selStyle}>
        <option value="">Selecione o agente...</option>
        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
    );
    if (act.type === 'assign_team') return (
      <select value={act.value} onChange={e => handleActionChange(index, 'value', e.target.value)} required style={selStyle}>
        <option value="">Selecione a equipe...</option>
        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    );
    if (act.type === 'add_label' || act.type === 'remove_label') return (
      <select value={act.value} onChange={e => handleActionChange(index, 'value', e.target.value)} required style={selStyle}>
        <option value="">Selecione a etiqueta...</option>
        {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
    );
    if (act.type === 'change_priority') return (
      <select value={act.value} onChange={e => handleActionChange(index, 'value', e.target.value)} required style={selStyle}>
        <option value="">Selecione a prioridade...</option>
        <option value="none">Nenhuma</option><option value="low">Baixa</option>
        <option value="medium">Média</option><option value="high">Alta</option><option value="urgent">Urgente</option>
      </select>
    );
    if (act.type === 'send_message') return (
      <textarea rows="3" value={act.value} onChange={e => handleActionChange(index, 'value', e.target.value)}
        placeholder="Escreva a mensagem automática aqui..." required
        className="aut-textarea" />
    );
    return <input type="text" value={act.value} onChange={e => handleActionChange(index, 'value', e.target.value)}
      placeholder="Parâmetro..." required className="aut-input" />;
  };

  const inlineSelectStyle = { height: '32px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px', padding: '0 8px', boxSizing: 'border-box', width: '100%' };

  return (
    <>
      <style>{css}</style>
      <div className="aut-root">
        {/* Header */}
        <div className="aut-header">
          <div className="aut-header-text">
            <h2>Regras de Automação</h2>
            <p>Defina ações automáticas baseadas em gatilhos de eventos. Economize tempo e reduza tarefas repetitivas.</p>
          </div>
          <button className="aut-btn-create" onClick={handleOpenCreateModal}>
            <Plus size={15} /> Criar Automação
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '13px' }}>Carregando automações...</div>
        ) : rules.length === 0 ? (
          <div className="aut-empty">
            <div className="aut-empty-icon"><Zap size={22} /></div>
            <h3>Nenhuma automação criada</h3>
            <p>Crie sua primeira regra para automatizar o atendimento ao cliente.</p>
            <button className="aut-btn-create" onClick={handleOpenCreateModal}><Plus size={14} /> Criar Automação</button>
          </div>
        ) : (
          <div className="aut-grid">
            {rules.map(r => (
              <div className="aut-card" key={r.id}>
                <div className="aut-card-header">
                  <div className="aut-card-icon"><Zap size={16} /></div>
                  <div className="aut-card-title">
                    <strong>{r.name}</strong>
                    <span>{r.description || 'Sem descrição'}</span>
                  </div>
                  <span className="aut-badge aut-badge-trigger">{triggerLabel(r.trigger_type)}</span>
                  <span className={`aut-badge ${r.is_active ? 'aut-badge-active' : 'aut-badge-inactive'}`}>
                    {r.is_active ? <><CheckCircle2 size={10} /> Ativa</> : <><XCircle size={10} /> Inativa</>}
                  </span>
                  <div className="aut-card-actions">
                    <button className="aut-icon-btn edit" onClick={() => handleOpenEditModal(r)} title="Editar"><Edit3 size={15} /></button>
                    <button className="aut-icon-btn danger" onClick={() => handleDeleteRule(r)} title="Excluir"><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="aut-card-footer">
                  <div className="aut-card-stat"><Filter size={11} />{(r.conditions || []).length} condição(ões)</div>
                  <div className="aut-card-stat"><Play size={11} />{(r.actions || []).length} ação(ões)</div>
                  <div className="aut-toggle">
                    <span style={{ fontSize: '11px' }}>{r.is_active ? 'Ativa' : 'Inativa'}</span>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={r.is_active} onChange={e => handleToggleActive(r, e.target.checked)} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <div className="aut-overlay" onClick={e => { if (e.target === e.currentTarget && !saving) setModalOpen(false); }}>
            <div className="aut-modal">
              {/* Modal Header */}
              <div className="aut-modal-head">
                <div className="aut-modal-head-icon"><Zap size={18} /></div>
                <h3>{modalOpen === 'create' ? 'Nova Regra de Automação' : 'Editar Automação'}</h3>
                <button className="aut-modal-close" onClick={() => setModalOpen(false)} disabled={saving}><X size={16} /></button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleFormSubmit} style={{ display: 'contents' }}>
                <div className="aut-modal-body">

                  {/* Name + Description */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div className="aut-field">
                      <label htmlFor="aut-name">Nome da Regra *</label>
                      <input id="aut-name" className="aut-input" type="text" value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Ex: Suporte – Mensagem de Boas-vindas" required />
                    </div>
                    <div className="aut-field">
                      <label htmlFor="aut-desc">Descrição</label>
                      <input id="aut-desc" className="aut-input" type="text" value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Breve descrição do objetivo..." />
                    </div>
                  </div>

                  {/* Trigger */}
                  <div className="aut-field">
                    <label htmlFor="aut-trigger">Evento (Gatilho) *</label>
                    <select id="aut-trigger" className="aut-select" value={triggerType}
                      onChange={e => { setTriggerType(e.target.value); setConditions([]); }}>
                      <option value="conversation_created">Conversa Criada (Conversation Created)</option>
                      <option value="message_created">Mensagem Recebida/Criada (Message Created)</option>
                      <option value="conversation_opened">Conversa Aberta (Conversation Opened)</option>
                    </select>
                  </div>

                  {/* Conditions */}
                  <div className="aut-section">
                    <div className="aut-section-header">
                      <div className="aut-section-title">
                        <Filter size={14} style={{ color: 'var(--accent)' }} />
                        <span>Condições</span>
                        {conditions.length > 0 && <div className="aut-section-badge">{conditions.length}</div>}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Todas as condições devem ser verdadeiras</span>
                    </div>
                    <div className="aut-section-body">
                      {conditions.length === 0 && (
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                          Nenhuma condição adicionada. A regra será sempre aplicada.
                        </p>
                      )}
                      {conditions.map((cond, i) => {
                        const attrs = getConditionAttributes(triggerType);
                        return (
                          <div key={i} className="aut-cond-row">
                            {/* Attribute */}
                            <select value={cond.attribute} onChange={e => handleConditionChange(i, 'attribute', e.target.value)} style={inlineSelectStyle}>
                              {attrs.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                            </select>
                            {/* Operator */}
                            <select value={cond.operator} onChange={e => handleConditionChange(i, 'operator', e.target.value)} style={inlineSelectStyle}>
                              <option value="equal_to">Igual a</option>
                              <option value="not_equal_to">Diferente de</option>
                            </select>
                            {/* Value */}
                            <ConditionValueField cond={cond} index={i} />
                            {/* Remove */}
                            <button type="button" className="aut-remove-btn" onClick={() => handleRemoveCondition(i)} title="Remover condição">
                              <X size={13} />
                            </button>
                          </div>
                        );
                      })}
                      <button type="button" className="aut-btn-add" onClick={handleAddCondition}>
                        <Plus size={13} /> Adicionar condição
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="aut-section">
                    <div className="aut-section-header">
                      <div className="aut-section-title">
                        <Play size={14} style={{ color: 'var(--accent)' }} />
                        <span>Ações</span>
                        {actions.length > 0 && <div className="aut-section-badge">{actions.length}</div>}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Executadas em ordem quando as condições são verdadeiras</span>
                    </div>
                    <div className="aut-section-body">
                      {actions.length === 0 && (
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                          Nenhuma ação adicionada. Adicione uma ação a ser executada.
                        </p>
                      )}
                      {actions.map((act, i) => (
                        <div key={i} className="aut-action-row">
                          <div className="aut-action-head">
                            <div className="aut-action-num">{i + 1}</div>
                            <select value={act.type} onChange={e => handleActionChange(i, 'type', e.target.value)}
                              style={{ flex: 1, height: '36px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px', padding: '0 10px', boxSizing: 'border-box' }}>
                              <option value="assign_agent">Atribuir Agente</option>
                              <option value="assign_team">Atribuir Equipe</option>
                              <option value="add_label">Adicionar Etiqueta</option>
                              <option value="remove_label">Remover Etiqueta</option>
                              <option value="change_priority">Alterar Prioridade</option>
                              <option value="send_message">Enviar Mensagem</option>
                              <option value="resolve_conv">Resolver Conversa</option>
                              <option value="snooze_conversation">Suspender Conversa</option>
                              <option value="mute_conversation">Silenciar Conversa</option>
                            </select>
                            <button type="button" className="aut-remove-btn" onClick={() => handleRemoveAction(i)} title="Remover ação">
                              <X size={13} />
                            </button>
                          </div>
                          <ActionValueField act={act} index={i} />
                        </div>
                      ))}
                      <button type="button" className="aut-btn-add" onClick={handleAddAction}>
                        <Plus size={13} /> Adicionar ação
                      </button>
                    </div>
                  </div>

                </div>

                {/* Modal Footer */}
                <div className="aut-modal-footer">
                  <button type="button" className="aut-btn-cancel" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button>
                  <button type="submit" className="aut-btn-save" disabled={saving}>
                    {saving ? 'Salvando...' : modalOpen === 'create' ? 'Criar Automação' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
