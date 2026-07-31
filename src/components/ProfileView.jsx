import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { getSupabase, logAuditAction } from '../supabase';
import { showToast } from '../utils';
import { User, Mail, Phone, Camera, Save, Lock, Eye, EyeOff, Shield, Activity, Clock, MessageSquare } from 'lucide-react';

export default function ProfileView() {
  const { currentAgent, setCurrentAgent, theme, setTheme } = useApp();
  const [tab, setTab] = useState('profile'); // profile | security | activity

  // Profile fields
  const [name, setName] = useState(currentAgent?.name || '');
  const [email] = useState(currentAgent?.email || '');
  const [phone, setPhone] = useState(currentAgent?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(currentAgent?.avatar_url || '');
  const [saving, setSaving] = useState(false);

  // Password fields
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  // Activity
  const [activity, setActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const fileRef = useRef(null);

  useEffect(() => {
    if (tab === 'activity') loadActivity();
  }, [tab]);

  const loadActivity = async () => {
    const supabase = getSupabase();
    if (!supabase || !currentAgent) return;
    setLoadingActivity(true);
    try {
      const { data } = await supabase
        .from('messages')
        .select('id, content, created_at, conversation:conversations(contact:contacts(name, phone))')
        .eq('sender_type', 'agent')
        .eq('sender_id', currentAgent.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setActivity(data || []);
    } catch (e) { console.error(e); }
    finally { setLoadingActivity(false); }
  };

  const handleSaveProfile = async () => {
    const supabase = getSupabase();
    if (!supabase || !currentAgent) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('agents')
        .update({ name: name.trim(), phone: phone.trim(), avatar_url: avatarUrl.trim() })
        .eq('id', currentAgent.id);
      if (error) throw error;
      setCurrentAgent(prev => ({ ...prev, name: name.trim(), phone: phone.trim(), avatar_url: avatarUrl.trim() }));
      showToast('Perfil atualizado!', 'success');
    } catch (e) {
      showToast('Erro ao salvar: ' + e.message, 'error');
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!newPw || newPw.length < 6) { showToast('A senha deve ter ao menos 6 caracteres.', 'error'); return; }
    if (newPw !== confirmPw) { showToast('As senhas não coincidem.', 'error'); return; }
    const supabase = getSupabase();
    if (!supabase) return;
    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      showToast('Senha alterada com sucesso!', 'success');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e) {
      showToast('Erro ao alterar senha: ' + e.message, 'error');
    } finally { setChangingPw(false); }
  };

  const avatarDisplay = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || 'agent')}`;
  const roleLabel = { superadmin: 'Super Admin', admin: 'Administrador', agent: 'Agente' }[currentAgent?.role] || currentAgent?.role;

  const tabStyle = (active) => ({
    padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
    background: 'none', border: 'none', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    transition: 'all var(--transition-fast)', fontFamily: 'inherit'
  });

  return (
    <div style={{ padding: '32px', maxWidth: '720px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px', padding: '24px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        {/* Avatar */}
        <div style={{ position: 'relative' }}>
          <img src={avatarDisplay} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-border)', boxShadow: '0 0 20px var(--accent-glow)' }} />
          <button onClick={() => fileRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: '26px', height: '26px', borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg-card)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Camera size={12} />
          </button>
          <input ref={fileRef} type="text" style={{ display: 'none' }} />
        </div>
        
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px', marginBottom: '4px' }}>{currentAgent?.name}</h2>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>{currentAgent?.email}</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '3px 10px', borderRadius: '20px', background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              {roleLabel}
            </span>
            <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '3px 10px', borderRadius: '20px', background: currentAgent?.status === 'online' ? 'var(--success-soft)' : 'rgba(255,255,255,0.05)', color: currentAgent?.status === 'online' ? 'var(--success)' : 'var(--text-muted)' }}>
              {currentAgent?.status}
            </span>
          </div>
        </div>

        {/* Theme Toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tema</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>☀️</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={theme === 'dark'} onChange={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
              <span className="toggle-slider" />
            </label>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>🌙</span>
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px', gap: '4px' }}>
        <button style={tabStyle(tab === 'profile')} onClick={() => setTab('profile')}>Perfil</button>
        <button style={tabStyle(tab === 'security')} onClick={() => setTab('security')}>Segurança</button>
        <button style={tabStyle(tab === 'activity')} onClick={() => setTab('activity')}>Atividade</button>
      </div>

      {/* Tab: Profile */}
      {tab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-field">
            <label>Nome completo</label>
            <div className="input-wrapper">
              <User size={15} />
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
            </div>
          </div>
          <div className="form-field">
            <label>E-mail</label>
            <div className="input-wrapper">
              <Mail size={15} />
              <input type="email" value={email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>
          </div>
          <div className="form-field">
            <label>Telefone</label>
            <div className="input-wrapper">
              <Phone size={15} />
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+55 11 99999-9999" />
            </div>
          </div>
          <div className="form-field">
            <label>URL do Avatar (imagem)</label>
            <div className="input-wrapper">
              <Camera size={15} />
              <input type="url" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <button onClick={handleSaveProfile} disabled={saving} className="btn-resolve" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>
            <Save size={15} />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      )}

      {/* Tab: Security */}
      {tab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '14px 16px', background: 'var(--accent-soft)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-border)', display: 'flex', gap: '10px' }}>
            <Shield size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '1px' }} />
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Alterar sua senha afeta apenas o acesso a este painel. Use uma senha forte com pelo menos 8 caracteres.
            </p>
          </div>
          <div className="form-field">
            <label>Nova Senha</label>
            <div className="input-wrapper">
              <Lock size={15} />
              <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPw(p => !p)}>{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            </div>
          </div>
          <div className="form-field">
            <label>Confirmar Nova Senha</label>
            <div className="input-wrapper">
              <Lock size={15} />
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <button onClick={handleChangePassword} disabled={changingPw} className="btn-resolve" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>
            <Lock size={15} />
            {changingPw ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </div>
      )}

      {/* Tab: Activity */}
      {tab === 'activity' && (
        <div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>Suas últimas 20 mensagens enviadas</p>
          {loadingActivity ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1,2,3,4].map(i => <div key={i} style={{ height: '52px', background: 'var(--border)', borderRadius: 'var(--radius-sm)', animation: 'shimmer-pulse 1.5s infinite' }} />)}
            </div>
          ) : activity.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 0', fontSize: '13px' }}>
              <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <div>Nenhuma atividade registrada</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {activity.map(msg => (
                <div key={msg.id} style={{ padding: '12px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <MessageSquare size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                      Para: <strong style={{ color: 'var(--text-secondary)' }}>{msg.conversation?.contact?.name || msg.conversation?.contact?.phone || 'Contato'}</strong>
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.content}</div>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'monospace' }}>
                    {new Date(msg.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
