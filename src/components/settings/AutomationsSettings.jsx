import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../supabase';
import { showToast } from '../../utils';
import { Plus, Trash2, X, Edit3, PlusCircle } from 'lucide-react';

export default function AutomationsSettings() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Aux databases
  const [agents, setAgents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [labels, setLabels] = useState([]);
  const [inboxes, setInboxes] = useState([]);

  // Modal editor states
  const [modalOpen, setModalOpen] = useState(false); // false | 'create' | 'edit'
  const [selectedRule, setSelectedRule] = useState(null);
  
  // Editor form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('conversation_created');
  const [conditions, setConditions] = useState([]); // list of { attribute, operator, value }
  const [actions, setActions] = useState([]); // list of { type, value }
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (err) {
      console.error(err);
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
        supabase.from('inboxes').select('*').order('name', { ascending: true })
      ]);

      setAgents(agentsRes.data || []);
      setTeams(teamsRes.data || []);
      setLabels(labelsRes.data || []);
      setInboxes(inboxesRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchAuxLists();
  }, []);

  const handleToggleActive = async (rule, isActive) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('automations')
        .update({ is_active: isActive })
        .eq('id', rule.id);

      if (error) throw error;

      showToast(isActive ? 'Automação ativada!' : 'Automação desativada.', 'success');
      fetchRules();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar status.', 'error');
    }
  };

  const handleDeleteRule = async (rule) => {
    if (!window.confirm(`Você deseja realmente excluir a regra de automação "${rule.name}"?`)) {
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', rule.id);

      if (error) throw error;

      showToast('Regra excluída!', 'success');
      fetchRules();
    } catch (err) {
      console.error(err);
      showToast('Erro ao remover automação: ' + err.message, 'error');
    }
  };

  const handleOpenCreateModal = () => {
    setName('');
    setDescription('');
    setTriggerType('conversation_created');
    setConditions([]);
    setActions([]);
    setSelectedRule(null);
    setModalOpen('create');
  };

  const handleOpenEditModal = (rule) => {
    setSelectedRule(rule);
    setName(rule.name || '');
    setDescription(rule.description || '');
    setTriggerType(rule.trigger_type || 'conversation_created');
    setConditions(rule.conditions || []);
    setActions(rule.actions || []);
    setModalOpen('edit');
  };

  // Conditions builder handlers
  const getConditionAttributes = (trigger) => {
    if (trigger === 'message_created' || trigger === 'message_received') {
      return [
        { value: 'message_type', label: 'Tipo da Mensagem (incoming/outgoing)' },
        { value: 'message_contains', label: 'Mensagem Contém (Qualquer parte)' },
        { value: 'message_exact', label: 'Mensagem é Exatamente' },
        { value: 'email', label: 'Email do Contato' },
        { value: 'inbox_id', label: 'Canal (Caixa de Entrada)' },
        { value: 'phone_number', label: 'Telefone' }
      ];
    }
    return [
      { value: 'status', label: 'Status da Conversa' },
      { value: 'priority', label: 'Prioridade' },
      { value: 'email', label: 'Email do Contato' },
      { value: 'inbox_id', label: 'Canal (Caixa de Entrada)' },
      { value: 'phone_number', label: 'Telefone' }
    ];
  };

  const handleAddCondition = () => {
    const attrs = getConditionAttributes(triggerType);
    setConditions(prev => [...prev, { attribute: attrs[0].value, operator: 'equal_to', value: '' }]);
  };

  const handleRemoveCondition = (index) => {
    setConditions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleConditionChange = (index, key, val) => {
    setConditions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: val };
      if (key === 'attribute') {
        updated[index].value = ''; // Reset value if attribute changes
      }
      return updated;
    });
  };

  // Actions builder handlers
  const handleAddAction = () => {
    setActions(prev => [...prev, { type: 'assign_agent', value: '' }]);
  };

  const handleRemoveAction = (index) => {
    setActions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleActionChange = (index, key, val) => {
    setActions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: val };
      return updated;
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    if (conditions.length === 0) {
      showToast('Por favor, defina ao menos uma condição.', 'error');
      return;
    }

    if (actions.length === 0) {
      showToast('Por favor, adicione ao menos uma ação.', 'error');
      return;
    }

    // Validation
    const invalidCond = conditions.some(c => !c.value);
    const invalidAct = actions.some(a => {
      const noValRequired = ['resolve_conv', 'mute_conversation', 'snooze_conversation'];
      return !noValRequired.includes(a.type) && !a.value;
    });

    if (invalidCond || invalidAct) {
      showToast('Por favor, preencha todos os campos das condições e ações.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (modalOpen === 'create') {
        const { error } = await supabase
          .from('automations')
          .insert({
            name: name.trim(),
            description: description.trim(),
            trigger_type: triggerType,
            conditions,
            actions,
            is_active: true
          });

        if (error) throw error;
        showToast('Regra de automação criada com sucesso!', 'success');
      } else if (modalOpen === 'edit' && selectedRule) {
        const { error } = await supabase
          .from('automations')
          .update({
            name: name.trim(),
            description: description.trim(),
            trigger_type: triggerType,
            conditions,
            actions
          })
          .eq('id', selectedRule.id);

        if (error) throw error;
        showToast('Regra de automação salva com sucesso!', 'success');
      }

      setModalOpen(false);
      fetchRules();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar regra: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Regras de Automação</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Defina ações automáticas baseadas em gatilhos específicos de eventos</p>
        </div>
        <button className="btn-resolve" onClick={handleOpenCreateModal}>
          <Plus size={16} /> Criar Regra
        </button>
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <table className="ui-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Nome</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Descrição</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600', width: '160px' }}>Gatilho</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600', width: '80px' }}>Ativo</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600', width: '140px' }}>Métricas</th>
              <th style={{ width: '120px', textAlign: 'center', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Buscando regras...
                </td>
              </tr>
            ) : rules.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Nenhuma regra de automação cadastrada.
                </td>
              </tr>
            ) : (
              rules.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.description}>
                    {r.description || '-'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', textTransform: 'uppercase', background: 'var(--bg-hover)', color: 'var(--info)', padding: '2px 6px', borderRadius: '4px' }}>
                      {r.trigger_type === 'conversation_created' ? 'Conversa Criada' : r.trigger_type === 'message_created' ? 'Mensagem Criada' : r.trigger_type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={r.is_active}
                        onChange={(e) => handleToggleActive(r, e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {(r.conditions || []).length} cond. / {(r.actions || []).length} ação(ões)
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        className="toolbar-btn" 
                        onClick={() => handleOpenEditModal(r)} 
                        style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }} 
                        title="Editar regra"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        className="toolbar-btn" 
                        onClick={() => handleDeleteRule(r)} 
                        style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }} 
                        title="Excluir regra"
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

      {/* Editor Modal Overlay */}
      {modalOpen && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-card" style={{ width: '740px', maxWidth: '95%' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalOpen === 'create' ? 'Criar Regra de Automação' : 'Editar Regra de Automação'}
              </h3>
              <button className="modal-close" onClick={() => setModalOpen(false)} disabled={saving}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '6px' }}>
              <div className="form-field">
                <label htmlFor="aut-name">Nome da Regra</label>
                <input 
                  type="text" 
                  id="aut-name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Distribuir Suporte, Mensagem Fora de Horário" 
                  required 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="aut-desc">Descrição</label>
                <input 
                  type="text" 
                  id="aut-desc" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Resumo sobre o objetivo desta automação..." 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="aut-trigger">Evento (Gatilho)</label>
                <select 
                  id="aut-trigger"
                  value={triggerType}
                  onChange={(e) => {
                    setTriggerType(e.target.value);
                    setConditions([]); // Reset conditions when trigger changes
                  }}
                  style={{ width: '100%', height: '38px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                >
                  <option value="conversation_created">Conversa Criada (Conversation Created)</option>
                  <option value="message_created">Mensagem Recebida/Criada (Message Created)</option>
                  <option value="conversation_opened">Conversa Aberta (Conversation Opened)</option>
                </select>
              </div>

              {/* Conditions Section */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', background: '#131622', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Condições</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {conditions.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', margin: 0 }}>
                      Nenhuma condição configurada. Adicione uma para filtrar os eventos.
                    </p>
                  ) : (
                    conditions.map((cond, index) => {
                      const attrs = getConditionAttributes(triggerType);
                      return (
                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '180px 140px 1fr auto', gap: '10px', alignItems: 'center' }}>
                          <select 
                            value={cond.attribute}
                            onChange={(e) => handleConditionChange(index, 'attribute', e.target.value)}
                            style={{ height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px' }}
                          >
                            {attrs.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                          </select>

                          <select 
                            value={cond.operator}
                            onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
                            style={{ height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px' }}
                          >
                            <option value="equal_to">Igual a</option>
                            <option value="not_equal_to">Diferente de</option>
                          </select>

                          {cond.attribute === 'inbox_id' ? (
                            <select 
                              value={cond.value}
                              onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                              required
                              style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px' }}
                            >
                              <option value="">Selecione o canal...</option>
                              {inboxes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                          ) : cond.attribute === 'status' ? (
                            <select 
                              value={cond.value}
                              onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                              required
                              style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px' }}
                            >
                              <option value="">Selecione o status...</option>
                              <option value="open">Aberta</option>
                              <option value="pending">Pendente</option>
                              <option value="resolved">Resolvida</option>
                              <option value="snoozed">Suspensa</option>
                            </select>
                          ) : cond.attribute === 'priority' ? (
                            <select 
                              value={cond.value}
                              onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                              required
                              style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px' }}
                            >
                              <option value="">Selecione a prioridade...</option>
                              <option value="none">Nenhuma</option>
                              <option value="low">Baixa</option>
                              <option value="medium">Média</option>
                              <option value="high">Alta</option>
                              <option value="urgent">Urgente</option>
                            </select>
                          ) : cond.attribute === 'message_type' ? (
                            <select 
                              value={cond.value}
                              onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                              required
                              style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px' }}
                            >
                              <option value="">Selecione o tipo...</option>
                              <option value="incoming">Incoming (Recebida)</option>
                              <option value="outgoing">Outgoing (Enviada)</option>
                            </select>
                          ) : (
                            <input 
                              type="text" 
                              value={cond.value}
                              onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                              placeholder="Digite o valor..." 
                              required
                              style={{ width: '100%', height: '34px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px' }}
                            />
                          )}

                          <button 
                            type="button" 
                            onClick={() => handleRemoveCondition(index)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <button 
                  type="button" 
                  onClick={handleAddCondition}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--accent)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', width: 'fit-content', fontWeight: '600' }}
                >
                  + Adicionar condição
                </button>
              </div>

              {/* Actions Section */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', background: '#131622', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Ações</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {actions.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', margin: 0 }}>
                      Nenhuma ação definida. Adicione uma ação a ser disparada.
                    </p>
                  ) : (
                    actions.map((act, index) => (
                      <div key={index} style={{ background: '#0d0f14', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <select 
                            value={act.type}
                            onChange={(e) => handleActionChange(index, 'type', e.target.value)}
                            style={{ flex: 1, height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px' }}
                          >
                            <option value="assign_agent">Atribuir Agente (Assign to Agent)</option>
                            <option value="assign_team">Atribuir Equipe (Assign a Team)</option>
                            <option value="add_label">Anexar Etiqueta (Add a Label)</option>
                            <option value="remove_label">Remover Etiqueta (Remove a Label)</option>
                            <option value="change_priority">Alterar Prioridade (Change Priority)</option>
                            <option value="send_message">Enviar Mensagem (Send a Message)</option>
                            <option value="resolve_conv">Resolver Conversa (Resolve Conversation)</option>
                            <option value="snooze_conversation">Suspender Conversa (Snooze Conversation)</option>
                            <option value="mute_conversation">Silenciar Conversa (Mute Conversation)</option>
                          </select>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveAction(index)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <div>
                          {act.type === 'assign_agent' ? (
                            <select 
                              value={act.value}
                              onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                              required
                              style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px' }}
                            >
                              <option value="">Selecione o agente...</option>
                              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                          ) : act.type === 'assign_team' ? (
                            <select 
                              value={act.value}
                              onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                              required
                              style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px' }}
                            >
                              <option value="">Selecione a equipe...</option>
                              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          ) : (act.type === 'add_label' || act.type === 'remove_label') ? (
                            <select 
                              value={act.value}
                              onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                              required
                              style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px' }}
                            >
                              <option value="">Selecione a etiqueta...</option>
                              {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                          ) : act.type === 'change_priority' ? (
                            <select 
                              value={act.value}
                              onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                              required
                              style={{ width: '100%', height: '34px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px' }}
                            >
                              <option value="">Selecione a prioridade...</option>
                              <option value="none">Nenhuma</option>
                              <option value="low">Baixa</option>
                              <option value="medium">Média</option>
                              <option value="high">Alta</option>
                              <option value="urgent">Urgente</option>
                            </select>
                          ) : act.type === 'send_message' ? (
                            <textarea 
                              rows="3" 
                              value={act.value}
                              onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                              placeholder="Escreva a resposta automática aqui..." 
                              required
                              style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical' }}
                            />
                          ) : ['resolve_conv', 'mute_conversation', 'snooze_conversation'].includes(act.type) ? (
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Nenhum parâmetro necessário.</span>
                          ) : (
                            <input 
                              type="text" 
                              value={act.value}
                              onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                              placeholder="Digite o parâmetro..." 
                              required
                              style={{ width: '100%', height: '34px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '12px' }}
                            />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <button 
                  type="button" 
                  onClick={handleAddAction}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--accent)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', width: 'fit-content', fontWeight: '600' }}
                >
                  + Adicionar ação
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
                <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn-resolve" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Regra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
