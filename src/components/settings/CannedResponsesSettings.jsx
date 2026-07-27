import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../supabase';
import { showToast } from '../../utils';
import { Plus, Trash2, X } from 'lucide-react';

export default function CannedResponsesSettings() {
  const [canned, setCanned] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [shortcut, setShortcut] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCanned = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('canned_responses')
        .select('*')
        .order('shortcut', { ascending: true });

      if (error) throw error;
      setCanned(data || []);
    } catch (err) {
      console.error(err);
      showToast('Erro ao buscar respostas prontas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCanned();
  }, []);

  const handleDeleteCanned = async (item) => {
    if (!window.confirm(`Deseja realmente excluir o atalho "/${item.shortcut}"?`)) {
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('canned_responses')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      showToast('Atalho removido com sucesso!', 'success');
      fetchCanned();
    } catch (err) {
      console.error(err);
      showToast('Erro ao remover: ' + err.message, 'error');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    // Remove leading slash if typed
    let cleanShortcut = shortcut.trim().replace(/^\//, '');

    if (!cleanShortcut) {
      showToast('Atalho inválido.', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('canned_responses')
        .insert({
          shortcut: cleanShortcut,
          content: content.trim()
        });

      if (error) throw error;

      showToast('Resposta rápida cadastrada!', 'success');
      setModalOpen(false);
      setShortcut('');
      setContent('');
      fetchCanned();
    } catch (err) {
      console.error(err);
      showToast('Erro ao criar atalho: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Respostas Prontas</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Configure atalhos rápidos com barra (ex: /ola) para digitar respostas frequentes</p>
        </div>
        <button className="btn-resolve" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Novo Atalho
        </button>
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <table className="ui-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600', width: '180px' }}>Atalho</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Conteúdo da Resposta</th>
              <th style={{ width: '80px', textAlign: 'center', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Buscando atalhos...
                </td>
              </tr>
            ) : canned.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Nenhuma resposta rápida cadastrada.
                </td>
              </tr>
            ) : (
              canned.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: 'var(--accent)' }}>
                    /{item.shortcut}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.content}>
                    {item.content}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button 
                      className="toolbar-btn" 
                      onClick={() => handleDeleteCanned(item)} 
                      style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }} 
                      title="Excluir atalho"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Canned Response Modal Overlay */}
      {modalOpen && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Novo Atalho Rápido</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)} disabled={saving}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-field">
                <label htmlFor="canned-shortcut">Atalho (Sem a barra "/")</label>
                <input 
                  type="text" 
                  id="canned-shortcut" 
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                  placeholder="Ex: ola, suporte, financeiro" 
                  required 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="canned-content">Conteúdo da Mensagem</label>
                <textarea 
                  id="canned-content" 
                  rows="4" 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Texto completo que será inserido..." 
                  required
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn-resolve" disabled={saving}>
                  {saving ? 'Salvando...' : 'Cadastrar Atalho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
