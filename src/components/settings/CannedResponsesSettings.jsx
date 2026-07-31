import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../supabase';
import { showToast } from '../../utils';
import { Plus, Trash2, X, MessageSquare, Hash } from 'lucide-react';
import './settings.css';

export default function CannedResponsesSettings() {
  const [canned, setCanned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [shortcut, setShortcut] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCanned = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('canned_responses').select('*').order('shortcut', { ascending: true });
      if (error) throw error;
      setCanned(data || []);
    } catch { showToast('Erro ao buscar respostas prontas.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCanned(); }, []);

  const handleDelete = async (item) => {
    if (!window.confirm(`Excluir o atalho "/${item.shortcut}"?`)) return;
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('canned_responses').delete().eq('id', item.id);
      if (error) throw error;
      showToast('Atalho removido!', 'success'); fetchCanned();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    const cleanShortcut = shortcut.trim().replace(/^\//, '');
    if (!cleanShortcut) { showToast('Atalho inválido.', 'error'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('canned_responses').insert({ shortcut: cleanShortcut, content: content.trim() });
      if (error) throw error;
      showToast('Resposta rápida criada!', 'success');
      setModalOpen(false); setShortcut(''); setContent(''); fetchCanned();
    } catch (err) { showToast('Erro: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="s-root">
      <div className="s-header">
        <div className="s-header-text">
          <h2>Respostas Prontas</h2>
          <p>Configure atalhos com "/" para inserir respostas frequentes rapidamente no chat.</p>
        </div>
        <button className="s-btn-primary" onClick={() => setModalOpen(true)}><Plus size={15} /> Novo Atalho</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '13px' }}>Carregando...</div>
      ) : canned.length === 0 ? (
        <div className="s-empty-state">
          <div className="s-empty-state-icon"><MessageSquare size={24} /></div>
          <h3>Nenhuma resposta pronta</h3>
          <p>Crie atalhos para agilizar o atendimento com textos frequentes.</p>
          <button className="s-btn-primary" onClick={() => setModalOpen(true)}><Plus size={14} /> Novo Atalho</button>
        </div>
      ) : (
        <div className="s-table-wrap">
          <table className="s-table">
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Atalho</th>
                <th>Conteúdo da Resposta</th>
                <th style={{ textAlign: 'center', width: '70px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {canned.map(item => (
                <tr key={item.id}>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', background: 'rgba(99,102,241,.12)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,.2)' }}>
                      <Hash size={11} />/{item.shortcut}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.content}>
                    {item.content}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="s-icon-btn danger" onClick={() => handleDelete(item)} title="Excluir"><Trash2 size={14} /></button>
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
              <div className="s-modal-head-icon"><MessageSquare size={16} /></div>
              <h3>Novo Atalho Rápido</h3>
              <button className="s-modal-close" onClick={() => setModalOpen(false)} disabled={saving}><X size={15} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <div className="s-modal-body">
                <div className="s-field">
                  <label className="s-label" htmlFor="can-shortcut">Atalho <span style={{ fontWeight: 400, textTransform: 'none' }}>(sem a barra "/")</span> *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 700, fontSize: '14px', pointerEvents: 'none' }}>/</span>
                    <input id="can-shortcut" className="s-input" type="text" value={shortcut} onChange={e => setShortcut(e.target.value)} placeholder="ola, suporte, financeiro" required style={{ paddingLeft: '22px', fontFamily: 'monospace' }} />
                  </div>
                </div>
                <div className="s-field">
                  <label className="s-label" htmlFor="can-content">Conteúdo da Mensagem *</label>
                  <textarea id="can-content" className="s-textarea" rows="5" value={content} onChange={e => setContent(e.target.value)} placeholder="Texto completo que será inserido automaticamente ao digitar o atalho..." required />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{content.length} caracteres</span>
                </div>
              </div>
              <div className="s-modal-footer">
                <button type="button" className="s-btn-cancel" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className="s-btn-save" disabled={saving}>{saving ? 'Salvando...' : 'Criar Atalho'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
