import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../supabase';
import { showToast } from '../../utils';
import { Plus, Trash2, X } from 'lucide-react';

export default function CustomAttributesSettings() {
  const [activeTab, setActiveTab] = useState('conversation'); // conversation | contact
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [saving, setSaving] = useState(false);

  const fetchAttributes = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_attributes')
        .select('*')
        .eq('entity_type', activeTab)
        .order('name', { ascending: true });

      if (error) throw error;
      setAttributes(data || []);
    } catch (err) {
      console.error(err);
      showToast('Erro ao buscar atributos personalizados.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes();
  }, [activeTab]);

  const handleDeleteAttribute = async (attr) => {
    if (!window.confirm(`Você deseja excluir o atributo personalizado "${attr.name}"? Isso apagará todos os valores salvos dele.`)) {
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('custom_attributes')
        .delete()
        .eq('id', attr.id);

      if (error) throw error;

      showToast('Atributo excluído!', 'success');
      fetchAttributes();
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir atributo: ' + err.message, 'error');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    // Sanitize key (alphanumeric + underscore only)
    let cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!cleanKey) {
      showToast('Chave de integração inválida.', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('custom_attributes')
        .insert({
          name: name.trim(),
          key: cleanKey,
          field_type: fieldType,
          entity_type: activeTab
        });

      if (error) throw error;

      showToast('Campo personalizado criado!', 'success');
      setModalOpen(false);
      setName('');
      setKey('');
      setFieldType('text');
      fetchAttributes();
    } catch (err) {
      console.error(err);
      showToast('Erro ao criar campo: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Atributos Personalizados</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Adicione campos adicionais estruturados às conversas ou contatos</p>
        </div>
        <button className="btn-resolve" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Novo Campo
        </button>
      </div>

      <div className="col2-tabs" style={{ display: 'flex', gap: '8px', maxWidth: '300px', marginBottom: '20px', background: 'rgba(0,0,0,0.15)', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
        <button 
          onClick={() => setActiveTab('conversation')}
          className={`col2-tab-btn ${activeTab === 'conversation' ? 'active' : ''}`}
          style={{ flex: 1, border: 'none', background: activeTab === 'conversation' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px 0', fontSize: '13px', fontWeight: activeTab === 'conversation' ? '600' : 'normal', borderRadius: 'var(--radius-sm)' }}
        >
          Conversas
        </button>
        <button 
          onClick={() => setActiveTab('contact')}
          className={`col2-tab-btn ${activeTab === 'contact' ? 'active' : ''}`}
          style={{ flex: 1, border: 'none', background: activeTab === 'contact' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px 0', fontSize: '13px', fontWeight: activeTab === 'contact' ? '600' : 'normal', borderRadius: 'var(--radius-sm)' }}
        >
          Contatos
        </button>
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <table className="ui-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Nome</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Chave de Integração</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Tipo do Campo</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Criado em</th>
              <th style={{ width: '80px', textAlign: 'center', padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '600' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Buscando campos...
                </td>
              </tr>
            ) : attributes.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  Nenhum atributo cadastrado nesta aba.
                </td>
              </tr>
            ) : (
              attributes.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{a.name}</td>
                  <td style={{ padding: '12px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--accent)' }}>{a.key}</td>
                  <td style={{ padding: '12px 16px', textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-primary)' }}>{a.field_type}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {new Date(a.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button 
                      className="toolbar-btn" 
                      onClick={() => handleDeleteAttribute(a)} 
                      style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }} 
                      title="Excluir atributo"
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

      {/* Add Custom Attribute Modal Overlay */}
      {modalOpen && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Novo Campo Personalizado</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)} disabled={saving}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-field">
                <label htmlFor="attr-name">Nome do Campo</label>
                <input 
                  type="text" 
                  id="attr-name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Código do Cliente, Data de Venda" 
                  required 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="attr-key">Chave de Integração (Slug)</label>
                <input 
                  type="text" 
                  id="attr-key" 
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="Ex: cod_cliente, data_venda" 
                  required 
                  style={{ width: '100%', height: '38px', padding: '0 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="attr-type">Tipo do Campo</label>
                <select 
                  id="attr-type"
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value)}
                  style={{ width: '100%', height: '38px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)' }}
                >
                  <option value="text">Texto Simples (Text)</option>
                  <option value="number">Número (Number)</option>
                  <option value="date">Data (Date)</option>
                  <option value="boolean">Caixa de Seleção (Boolean)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn-resolve" disabled={saving}>
                  {saving ? 'Criando...' : 'Criar Campo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
