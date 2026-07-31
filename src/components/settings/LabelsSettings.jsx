import React, { useState, useEffect } from 'react';
import { useApp } from '../../AppContext';
import { getSupabase } from '../../supabase';
import { showToast } from '../../utils';
import { Plus, Pencil, Trash2, X, Tag } from 'lucide-react';
import './settings.css';

const PRESET_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444','#f59e0b',
  '#10b981','#0ea5e9','#14b8a6','#64748b','#f97316',
];

export default function LabelsSettings() {
  const { currentAgent } = useApp();
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);

  const fetchLabels = async () => {
    const supabase = getSupabase();
    if (!supabase || !currentAgent) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('labels').select('*').eq('company_id', currentAgent.company_id).order('name', { ascending: true });
      if (error) throw error;
      setLabels(data || []);
    } catch { showToast('Erro ao buscar etiquetas.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (currentAgent) fetchLabels(); }, [currentAgent]);

  const handleOpenCreate = () => { setName(''); setColor('#6366f1'); setSelectedLabel(null); setModalOpen(true); };
  const handleOpenEdit = (l) => { setSelectedLabel(l); setName(l.name || ''); setColor(l.color || '#6366f1'); setModalOpen(true); };

  const handleDelete = async (l) => {
    if (!window.confirm(`Excluir a etiqueta "${l.name}"?`)) return;
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('labels').delete().eq('id', l.id);
      if (error) throw error;
      showToast('Etiqueta excluída!', 'success'); fetchLabels();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setSaving(true);
    try {
      if (!selectedLabel) {
        const { error } = await supabase.from('labels').insert({ company_id: currentAgent?.company_id, name: name.trim(), color });
        if (error) throw error;
        showToast('Etiqueta criada!', 'success');
      } else {
        const { error } = await supabase.from('labels').update({ name: name.trim(), color }).eq('id', selectedLabel.id);
        if (error) throw error;
        showToast('Etiqueta atualizada!', 'success');
      }
      setModalOpen(false); fetchLabels();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="s-root">
      <div className="s-header">
        <div className="s-header-text">
          <h2>Etiquetas</h2>
          <p>Classifique e organize conversas com etiquetas coloridas.</p>
        </div>
        <button className="s-btn-primary" onClick={handleOpenCreate}><Plus size={15} /> Nova Etiqueta</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '13px' }}>Carregando etiquetas...</div>
      ) : labels.length === 0 ? (
        <div className="s-empty-state">
          <div className="s-empty-state-icon"><Tag size={24} /></div>
          <h3>Nenhuma etiqueta criada</h3>
          <p>Crie etiquetas para classificar e filtrar conversas.</p>
          <button className="s-btn-primary" onClick={handleOpenCreate}><Plus size={14} /> Nova Etiqueta</button>
        </div>
      ) : (
        <div className="s-table-wrap">
          <table className="s-table">
            <thead>
              <tr>
                <th>Etiqueta</th>
                <th>Criada em</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {labels.map(l => (
                <tr key={l.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: l.color, flexShrink: 0, boxShadow: `0 0 8px ${l.color}66` }} />
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: `${l.color}22`, color: l.color, border: `1px solid ${l.color}44` }}>
                        {l.name}
                      </span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{new Date(l.created_at).toLocaleDateString('pt-BR')}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                      <button className="s-icon-btn edit" onClick={() => handleOpenEdit(l)} title="Editar"><Pencil size={14} /></button>
                      <button className="s-icon-btn danger" onClick={() => handleDelete(l)} title="Excluir"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="s-overlay" onClick={e => { if (e.target === e.currentTarget && !saving) setModalOpen(false); }}>
          <div className="s-modal">
            <div className="s-modal-head">
              <div className="s-modal-head-icon"><Tag size={16} /></div>
              <h3>{selectedLabel ? 'Editar Etiqueta' : 'Nova Etiqueta'}</h3>
              <button className="s-modal-close" onClick={() => setModalOpen(false)} disabled={saving}><X size={15} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <div className="s-modal-body">
                <div className="s-field">
                  <label className="s-label" htmlFor="label-name">Nome da Etiqueta *</label>
                  <input id="label-name" className="s-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Urgente, Suporte N2" required />
                </div>
                <div className="s-field">
                  <label className="s-label">Cor de Exibição</label>
                  {/* Presets */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {PRESET_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setColor(c)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, border: color === c ? `3px solid white` : `2px solid transparent`, cursor: 'pointer', boxShadow: color === c ? `0 0 0 2px ${c}` : 'none', transition: 'all .15s' }} />
                    ))}
                  </div>
                  <div className="s-color-row">
                    <div className="s-color-swatch"><input type="color" value={color} onChange={e => setColor(e.target.value)} /></div>
                    <input className="s-input" type="text" value={color} onChange={e => setColor(e.target.value)} style={{ fontFamily: 'monospace', flex: 1 }} />
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: color, border: '1px solid var(--border)', flexShrink: 0 }} />
                  </div>
                </div>
                {/* Preview */}
                <div className="s-field">
                  <label className="s-label">Pré-visualização</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: `${color}22`, color: color, border: `1px solid ${color}44` }}>
                      {name || 'Nome da etiqueta'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="s-modal-footer">
                <button type="button" className="s-btn-cancel" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className="s-btn-save" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Etiqueta'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
