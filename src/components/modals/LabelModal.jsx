import React, { useState, useEffect } from 'react';
import { useApp } from '../../AppContext';
import { getSupabase } from '../../supabase';
import { showToast } from '../../utils';
import { X } from 'lucide-react';

export default function LabelModal({ conversationId, onClose, onLabelsUpdated }) {
  const { labels } = useApp();
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchActiveLabels() {
      const supabase = getSupabase();
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('conversation_labels')
          .select('label_id')
          .eq('conversation_id', conversationId);

        if (error) throw error;
        if (data) {
          setSelectedLabels(data.map(item => item.label_id));
        }
      } catch (err) {
        console.error('Erro ao buscar etiquetas ativas:', err);
      }
    }

    if (conversationId) {
      fetchActiveLabels();
    }
  }, [conversationId]);

  const handleCheckboxChange = (labelId) => {
    setSelectedLabels(current => {
      if (current.includes(labelId)) {
        return current.filter(id => id !== labelId);
      } else {
        return [...current, labelId];
      }
    });
  };

  const handleSave = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    setLoading(true);
    try {
      // 1. Delete all current labels for this conversation
      const { error: deleteError } = await supabase
        .from('conversation_labels')
        .delete()
        .eq('conversation_id', conversationId);

      if (deleteError) throw deleteError;

      // 2. Insert new checked labels
      if (selectedLabels.length > 0) {
        const rows = selectedLabels.map(labelId => ({
          conversation_id: conversationId,
          label_id: labelId
        }));
        const { error: insertError } = await supabase
          .from('conversation_labels')
          .insert(rows);

        if (insertError) throw insertError;
      }

      showToast('Etiquetas atualizadas!', 'success');
      if (onLabelsUpdated) onLabelsUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar etiquetas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="modal-title">Etiquetas da Conversa</h3>
          <button className="modal-close" onClick={onClose} disabled={loading}>
            <X size={16} />
          </button>
        </div>

        <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Selecione as etiquetas que deseja anexar a esta conversa:
        </div>

        <div 
          id="labels-checkbox-list" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px', 
            maxHeight: '220px', 
            overflowY: 'auto', 
            padding: '4px', 
            marginBottom: '20px' 
          }}
        >
          {labels.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
              Nenhuma etiqueta cadastrada.
            </div>
          ) : (
            labels.map(l => (
              <label 
                key={l.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  cursor: 'pointer', 
                  fontSize: '13px', 
                  color: 'var(--text-primary)' 
                }}
              >
                <input 
                  type="checkbox" 
                  value={l.id} 
                  checked={selectedLabels.includes(l.id)}
                  onChange={() => handleCheckboxChange(l.id)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                  disabled={loading}
                />
                <span 
                  style={{ 
                    background: l.color, 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%' 
                  }}
                />
                {l.name}
              </label>
            ))
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            type="button" 
            className="btn-cancel" 
            onClick={onClose} 
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            type="button" 
            className="btn-resolve" 
            onClick={handleSave} 
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar Etiquetas'}
          </button>
        </div>
      </div>
    </div>
  );
}
