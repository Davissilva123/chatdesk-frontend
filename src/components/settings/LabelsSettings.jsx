import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../supabase';
import { showToast } from '../../utils';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

export default function LabelsSettings() {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false); // false | 'create' | 'edit'
  const [selectedLabel, setSelectedLabel] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);

  const fetchLabels = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setLabels(data || []);
    } catch (err) {
      console.error(err);
      showToast('Erro ao buscar etiquetas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  const handleOpenCreateModal = () => {
    setName('');
    setColor('#6366f1');
    setSelectedLabel(null);
    setModalOpen('create');
  };

  const handleOpenEditModal = (label) => {
    setSelectedLabel(label);
    setName(label.name || '');
    setColor(label.color || '#6366f1');
    setModalOpen('edit');
  };

  const handleDeleteLabel = async (label) => {
    if (!window.confirm(`Deseja excluir a etiqueta "${label.name}"? Ela será removida de todas as conversas.`)) {
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('labels')
        .delete()
        .eq('id', label.id);

      if (error) throw error;

      showToast('Etiqueta excluída com sucesso!', 'success');
      fetchLabels();
    } catch (err) {
      console.error(err);
      showToast('Erro ao remover etiqueta: ' + err.message, 'error');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    setSaving(true);
    try {
      if (modalOpen === 'create') {
        const { error } = await supabase
          .from('labels')
          .insert({
            name: name.trim(),
            color
          });

        if (error) throw error;
        showToast('Etiqueta criada!', 'success');
      } else if (modalOpen === 'edit' && selectedLabel) {
        const { error } = await supabase
          .from('labels')
          .update({
            name: name.trim(),
            color
          })
          .eq('id', selectedLabel.id);

        if (error) throw error;
        showToast('Etiqueta atualizada!', 'success');
      }

      setModalOpen(false);
      fetchLabels();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar etiqueta: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Etiquetas (Tags)</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Classifique conversas para organizar fluxos de atendimento</p>
        </div>
        <button className="btn-resolve" onClick={handleOpenCreateModal}>
          <Plus size={16} /> Nova Etiqueta
        </button>
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <table className="ui-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600', width: '80px' }}>Cor</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Nome da Etiqueta</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Criada em</th>
              <th style={{ width: '120px', textAlign: 'center', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Buscando etiquetas...
                </td>
              </tr>
            ) : labels.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Nenhuma etiqueta cadastrada.
                </td>
              </tr>
            ) : (
              labels.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: l.color, width: '20px', height: '20px', borderRadius: '50%', display: 'inline-block', border: '1px solid var(--border)' }}></span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{l.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {new Date(l.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        className="toolbar-btn" 
                        onClick={() => handleOpenEditModal(l)} 
                        style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }} 
                        title="Editar etiqueta"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        className="toolbar-btn" 
                        onClick={() => handleDeleteLabel(l)} 
                        style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }} 
                        title="Excluir etiqueta"
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

      {/* Add / Edit Modal Overlay */}
      {modalOpen && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">
                {modalOpen === 'create' ? 'Nova Etiqueta' : 'Editar Etiqueta'}
              </h3>
              <button className="modal-close" onClick={() => setModalOpen(false)} disabled={saving}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="form-field">
                <label htmlFor="label-name">Nome da Etiqueta</label>
                <input 
                  type="text" 
                  id="label-name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Urgente, Suporte N2" 
                  required 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="label-color">Cor de Exibição</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    id="label-color" 
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    style={{ width: '50px', height: '38px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'transparent', cursor: 'pointer', padding: 0 }}
                  />
                  <input 
                    type="text" 
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    style={{ width: '100px', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn-resolve" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Etiqueta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
