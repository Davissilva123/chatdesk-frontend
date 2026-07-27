import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../AppContext';
import { getSupabase } from '../supabase';
import { showToast } from '../utils';
import { 
  Bot, Plus, Play, Pause, Trash2, Edit3, Save, X, 
  Zap, MessageSquare, GitBranch, Settings2, Flag, ArrowRight
} from 'lucide-react';

// Node type definitions
const NODE_TYPES = {
  start:     { label: 'Início',    color: 'var(--success)',  icon: '▶', description: 'Gatilho de início do fluxo' },
  message:   { label: 'Mensagem', color: 'var(--accent)',   icon: '💬', description: 'Enviar uma mensagem ao cliente' },
  condition: { label: 'Condição', color: 'var(--warning)',  icon: '⚡', description: 'Bifurcar baseado em condição' },
  action:    { label: 'Ação',     color: '#8b5cf6',         icon: '⚙️', description: 'Atribuir agente, label, resolver' },
  end:       { label: 'Fim',      color: 'var(--danger)',   icon: '⏹', description: 'Encerrar o fluxo' },
};

const INITIAL_NODES = [
  { id: 'start-1', type: 'start', x: 60, y: 60, data: { trigger: 'new_conversation' } },
  { id: 'msg-1', type: 'message', x: 320, y: 60, data: { text: 'Olá {{nome}}! Como posso ajudar?' } },
  { id: 'end-1', type: 'end', x: 580, y: 60, data: {} },
];
const INITIAL_EDGES = [
  { id: 'e1', from: 'start-1', to: 'msg-1' },
  { id: 'e2', from: 'msg-1', to: 'end-1' },
];

function FlowBuilder({ flow, onSave, onClose }) {
  const [nodes, setNodes] = useState(flow?.nodes?.length ? flow.nodes : INITIAL_NODES);
  const [edges, setEdges] = useState(flow?.edges?.length ? flow.edges : INITIAL_EDGES);
  const [selectedNode, setSelectedNode] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef(null);
  const nodeRefs = useRef({});

  const handleMouseDown = (e, nodeId) => {
    e.stopPropagation();
    const nodeEl = nodeRefs.current[nodeId];
    if (!nodeEl) return;
    const rect = nodeEl.getBoundingClientRect();
    const canvasRect = canvasRef.current.getBoundingClientRect();
    setDragging(nodeId);
    setSelectedNode(nodeId);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left - dragOffset.x;
    const y = e.clientY - canvasRect.top - dragOffset.y;
    setNodes(prev => prev.map(n => n.id === dragging ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n));
  }, [dragging, dragOffset]);

  const handleMouseUp = useCallback(() => { setDragging(null); }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const addNode = (type) => {
    const id = `${type}-${Date.now()}`;
    setNodes(prev => [...prev, { id, type, x: 100 + Math.random() * 200, y: 100 + Math.random() * 200, data: {} }]);
  };

  const removeNode = (nodeId) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId));
    if (selectedNode === nodeId) setSelectedNode(null);
  };

  const selectedNodeData = nodes.find(n => n.id === selectedNode);

  const updateNodeData = (key, value) => {
    setNodes(prev => prev.map(n => n.id === selectedNode ? { ...n, data: { ...n.data, [key]: value } } : n));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(nodes, edges);
    } finally {
      setSaving(false);
    }
  };

  // Get center bottom/top port position for SVG connections
  const getPortPos = (node, port = 'bottom') => {
    const W = 200, H = 90;
    if (port === 'bottom') return { x: node.x + W / 2, y: node.y + H };
    return { x: node.x + W / 2, y: node.y };
  };

  const CANVAS_H = 560;

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '15px' }}>✏️ Editor de Fluxo: {flow?.name || 'Novo Fluxo'}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onClose} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '6px 14px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={14} />{saving ? 'Salvando...' : 'Salvar Fluxo'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Node palette */}
        <div className="node-palette">
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '4px' }}>Adicionar nó</div>
          {Object.entries(NODE_TYPES).filter(([k]) => k !== 'start').map(([type, def]) => (
            <div
              key={type}
              className="node-palette-item"
              onClick={() => addNode(type)}
              style={{ color: def.color, borderColor: `${def.color}40` }}
            >
              <span style={{ fontSize: '14px' }}>{def.icon}</span>
              <span>{def.label}</span>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'auto' }}>
          <div
            ref={canvasRef}
            className="flow-builder-canvas"
            style={{ minWidth: '900px', minHeight: `${CANVAS_H}px`, position: 'relative' }}
            onClick={() => setSelectedNode(null)}
          >
            {/* SVG edges */}
            <svg className="flow-connections-svg" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
              {edges.map(edge => {
                const fromNode = nodes.find(n => n.id === edge.from);
                const toNode = nodes.find(n => n.id === edge.to);
                if (!fromNode || !toNode) return null;
                const from = getPortPos(fromNode, 'bottom');
                const to = getPortPos(toNode, 'top');
                const mx = (from.x + to.x) / 2;
                const my = (from.y + to.y) / 2;
                return (
                  <path
                    key={edge.id}
                    className="flow-connection-path"
                    d={`M ${from.x} ${from.y} C ${from.x} ${from.y + 60}, ${to.x} ${to.y - 60}, ${to.x} ${to.y}`}
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map(node => {
              const def = NODE_TYPES[node.type] || NODE_TYPES.message;
              return (
                <div
                  key={node.id}
                  ref={el => nodeRefs.current[node.id] = el}
                  className={`flow-node node-${node.type} ${selectedNode === node.id ? 'selected' : ''}`}
                  style={{ left: node.x, top: node.y, position: 'absolute' }}
                  onMouseDown={e => handleMouseDown(e, node.id)}
                  onClick={e => { e.stopPropagation(); setSelectedNode(node.id); }}
                >
                  {/* Top port */}
                  {node.type !== 'start' && (
                    <div className="flow-node-port flow-node-port-top" style={{ color: def.color }} />
                  )}

                  <div className="flow-node-header" style={{ color: def.color }}>
                    <span style={{ fontSize: '14px' }}>{def.icon}</span>
                    <span>{def.label}</span>
                    {node.type !== 'start' && node.type !== 'end' && (
                      <button
                        onClick={e => { e.stopPropagation(); removeNode(node.id); }}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0', opacity: 0.6 }}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {node.type === 'start' && <span>Gatilho: {node.data.trigger === 'new_conversation' ? '🆕 Nova conversa' : '💬 Mensagem recebida'}</span>}
                    {node.type === 'message' && <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.data.text || 'Clique para editar...'}</span>}
                    {node.type === 'condition' && <span>{node.data.attribute || 'Condição não definida'}</span>}
                    {node.type === 'action' && <span>{node.data.actionType || 'Ação não definida'}</span>}
                    {node.type === 'end' && <span>Fim do fluxo</span>}
                  </div>

                  {/* Bottom port */}
                  {node.type !== 'end' && (
                    <div className="flow-node-port flow-node-port-bottom" style={{ color: def.color }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Node editor panel */}
        {selectedNodeData && (
          <div style={{ width: '240px', background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', padding: '16px', overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: NODE_TYPES[selectedNodeData.type]?.color }}>
              <span>{NODE_TYPES[selectedNodeData.type]?.icon}</span>
              <span>Editar {NODE_TYPES[selectedNodeData.type]?.label}</span>
            </div>

            {selectedNodeData.type === 'start' && (
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                Gatilho
                <select value={selectedNodeData.data.trigger || 'new_conversation'} onChange={e => updateNodeData('trigger', e.target.value)}
                  style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}>
                  <option value="new_conversation">Nova conversa</option>
                  <option value="message_received">Mensagem recebida</option>
                  <option value="keyword">Palavra-chave</option>
                </select>
              </label>
            )}

            {selectedNodeData.type === 'message' && (
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                Texto da mensagem
                <textarea value={selectedNodeData.data.text || ''} onChange={e => updateNodeData('text', e.target.value)}
                  placeholder="Use {{nome}} para personalizar..."
                  style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical', minHeight: '80px', fontFamily: 'Inter, sans-serif' }}
                />
                <div style={{ fontSize: '10px', color: 'var(--accent)', marginTop: '4px' }}>💡 Use: {'{{nome}}'}, {'{{telefone}}'}</div>
              </label>
            )}

            {selectedNodeData.type === 'condition' && (
              <>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                  Atributo
                  <select value={selectedNodeData.data.attribute || ''} onChange={e => updateNodeData('attribute', e.target.value)}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}>
                    <option value="">Selecione...</option>
                    <option value="message_contains">Mensagem contém</option>
                    <option value="priority">Prioridade</option>
                    <option value="status">Status</option>
                  </select>
                </label>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, marginTop: '8px' }}>
                  Valor
                  <input type="text" value={selectedNodeData.data.value || ''} onChange={e => updateNodeData('value', e.target.value)}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
                  />
                </label>
              </>
            )}

            {selectedNodeData.type === 'action' && (
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                Tipo de ação
                <select value={selectedNodeData.data.actionType || ''} onChange={e => updateNodeData('actionType', e.target.value)}
                  style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}>
                  <option value="">Selecione...</option>
                  <option value="assign_agent">Atribuir agente</option>
                  <option value="add_label">Adicionar etiqueta</option>
                  <option value="resolve_conversation">Resolver conversa</option>
                  <option value="change_priority">Mudar prioridade</option>
                </select>
              </label>
            )}

            <div style={{ marginTop: '16px', padding: '10px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              {NODE_TYPES[selectedNodeData.type]?.description}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatbotView() {
  const { inboxes } = useApp();
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFlow, setEditingFlow] = useState(null);
  const [showNewFlowForm, setShowNewFlowForm] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowInbox, setNewFlowInbox] = useState('');

  const fetchFlows = async () => {
    const supabase = getSupabase();
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chatbot_flows')
        .select('*, inbox:inboxes(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setFlows(data || []);
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar fluxos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFlows(); }, []);

  const handleToggleActive = async (flow) => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('chatbot_flows')
        .update({ is_active: !flow.is_active })
        .eq('id', flow.id);
      if (error) throw error;
      showToast(flow.is_active ? 'Fluxo pausado.' : 'Fluxo ativado!', 'success');
      fetchFlows();
    } catch (err) {
      showToast('Erro ao atualizar fluxo.', 'error');
    }
  };

  const handleCreateFlow = async () => {
    if (!newFlowName.trim()) { showToast('Dê um nome ao fluxo.', 'warning'); return; }
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('chatbot_flows')
        .insert({ name: newFlowName.trim(), inbox_id: newFlowInbox || null, nodes: INITIAL_NODES, edges: INITIAL_EDGES })
        .select().single();
      if (error) throw error;
      showToast('Fluxo criado!', 'success');
      setShowNewFlowForm(false);
      setNewFlowName('');
      setNewFlowInbox('');
      setEditingFlow(data);
    } catch (err) {
      showToast('Erro ao criar fluxo: ' + err.message, 'error');
    }
  };

  const handleDeleteFlow = async (flowId) => {
    if (!window.confirm('Tem certeza que deseja excluir este fluxo?')) return;
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('chatbot_flows').delete().eq('id', flowId);
      if (error) throw error;
      showToast('Fluxo excluído.', 'success');
      fetchFlows();
    } catch (err) {
      showToast('Erro ao excluir fluxo.', 'error');
    }
  };

  const handleSaveFlow = async (nodes, edges) => {
    const supabase = getSupabase();
    if (!supabase || !editingFlow) return;
    try {
      const { error } = await supabase
        .from('chatbot_flows')
        .update({ nodes, edges })
        .eq('id', editingFlow.id);
      if (error) throw error;
      showToast('Fluxo salvo com sucesso!', 'success');
      setEditingFlow(null);
      fetchFlows();
    } catch (err) {
      showToast('Erro ao salvar fluxo: ' + err.message, 'error');
    }
  };

  // If editing a flow, show the full builder
  if (editingFlow) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <FlowBuilder
          flow={editingFlow}
          onSave={handleSaveFlow}
          onClose={() => setEditingFlow(null)}
        />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '28px 32px', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
              <Bot size={22} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Chatbot & Fluxos</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '52px' }}>
            Crie fluxos automatizados para atender clientes sem intervenção humana.
          </p>
        </div>
        <button
          onClick={() => setShowNewFlowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: 'white', padding: '10px 18px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}
        >
          <Plus size={16} /> Novo Fluxo
        </button>
      </div>

      {/* New Flow Form */}
      {showNewFlowForm && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nome do fluxo</label>
            <input
              autoFocus
              type="text"
              value={newFlowName}
              onChange={e => setNewFlowName(e.target.value)}
              placeholder="Ex: Atendimento inicial"
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateFlow(); }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '160px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Inbox (opcional)</label>
            <select value={newFlowInbox} onChange={e => setNewFlowInbox(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px' }}>
              <option value="">Todas as inboxes</option>
              {inboxes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowNewFlowForm(false)} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
            <button onClick={handleCreateFlow} style={{ padding: '8px 14px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>Criar &amp; Editar</button>
          </div>
        </div>
      )}

      {/* Flow list */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando fluxos...</div>
      ) : flows.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: '16px' }}>
          <Bot size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Nenhum fluxo criado</div>
          <div style={{ fontSize: '13px' }}>Clique em "Novo Fluxo" para criar seu primeiro chatbot automatizado.</div>
        </div>
      ) : (
        <div className="chatbot-flow-list">
          {flows.map(flow => (
            <div key={flow.id} className={`chatbot-flow-card ${flow.is_active ? 'active-flow' : ''}`}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: flow.is_active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${flow.is_active ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                🤖
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{flow.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span>📦 {(flow.nodes || []).length} nós</span>
                  <span>🔗 {(flow.edges || []).length} conexões</span>
                  {flow.inbox?.name && <span>📥 {flow.inbox.name}</span>}
                </div>
              </div>

              {/* Active badge */}
              <div style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: flow.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', color: flow.is_active ? 'var(--success)' : 'var(--text-muted)', border: `1px solid ${flow.is_active ? 'rgba(16,185,129,0.3)' : 'var(--border)'}` }}>
                {flow.is_active ? '● Ativo' : '○ Inativo'}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setEditingFlow(flow)} title="Editar fluxo"
                  style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit3 size={14} />
                </button>
                <button onClick={() => handleToggleActive(flow)} title={flow.is_active ? 'Pausar' : 'Ativar'}
                  style={{ width: '34px', height: '34px', borderRadius: '8px', background: flow.is_active ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${flow.is_active ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`, color: flow.is_active ? 'var(--warning)' : 'var(--success)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {flow.is_active ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button onClick={() => handleDeleteFlow(flow.id)} title="Excluir"
                  style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div style={{ marginTop: '24px', padding: '16px 20px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--accent)' }}>💡 Como funciona:</strong> Os fluxos são executados automaticamente quando o gatilho é acionado (nova conversa ou mensagem recebida). 
        Adicione a tabela <code style={{ background: 'rgba(99,102,241,0.15)', padding: '1px 4px', borderRadius: '3px' }}>chatbot_flows</code> ao seu schema Supabase para ativar esta funcionalidade.
        <br />
        <a href="#" onClick={e => { e.preventDefault(); navigator.clipboard.writeText(`CREATE TABLE chatbot_flows (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), inbox_id UUID REFERENCES inboxes(id) ON DELETE CASCADE, name TEXT NOT NULL, is_active BOOLEAN DEFAULT false, nodes JSONB NOT NULL DEFAULT '[]', edges JSONB NOT NULL DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT NOW()); CREATE POLICY "chatbot_flows_policy" ON chatbot_flows FOR ALL USING (auth.role() = 'authenticated'); ALTER TABLE chatbot_flows ENABLE ROW LEVEL SECURITY;`); showToast('SQL copiado!', 'success'); }} style={{ color: 'var(--accent)', cursor: 'pointer' }}>📋 Copiar SQL para criar a tabela</a>
      </div>
    </div>
  );
}
