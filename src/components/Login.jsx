import React, { useState, useEffect } from 'react';
import { getSupabase } from '../supabase';
import { showToast } from '../utils';
import { Mail, Lock, Settings, Database, Key, Link as LinkIcon, X, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLoginSuccess, onGoToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Settings Panel State
  const [showSettings, setShowSettings] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('SUPABASE_URL') || '');
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('SUPABASE_ANON_KEY') || '');
  const [waUrl, setWaUrl] = useState(localStorage.getItem('WA_API_URL') || '');
  const [waKey, setWaKey] = useState(localStorage.getItem('WA_API_KEY') || '');

  // Handle Login submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const supabase = getSupabase();
    if (!supabase) {
      showToast('Por favor, configure as credenciais do Supabase no painel superior.', 'error');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        showToast('Falha no login: ' + error.message, 'error');
      } else {
        showToast('Login realizado com sucesso!', 'success');
        if (onLoginSuccess) onLoginSuccess();
      }
    } catch (err) {
      console.error(err);
      showToast('Erro interno ao tentar fazer login.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Save Connection Configs
  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('SUPABASE_URL', supabaseUrl.trim());
    localStorage.setItem('SUPABASE_ANON_KEY', supabaseKey.trim());
    localStorage.setItem('WA_API_URL', waUrl.trim());
    localStorage.setItem('WA_API_KEY', waKey.trim());
    
    showToast('Configurações salvas! Recarregando sistema...', 'success');
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div style={{
      background: 'radial-gradient(circle at 50% 50%, #151820 0%, #0d0f14 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw',
      margin: 0,
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
      position: 'relative'
    }}>
      {/* Ambient glows */}
      <div className="glow-1"></div>
      <div className="glow-2"></div>
      <div className="glow-circle glow-circle-1"></div>
      <div className="glow-circle glow-circle-2"></div>

      {/* Settings Gear trigger */}
      <button 
        onClick={() => setShowSettings(true)}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border)',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          zIndex: 100,
          transition: 'all 0.2s'
        }}
        title="Configurações de Acesso"
      >
        <Settings size={20} />
      </button>

      {/* Main Login Form Container */}
      <div className="login-container">
        <div className="logo-area">
          <div className="logo-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <span className="logo-text">ChatDesk</span>
        </div>
        <p className="tagline">Painel de Atendimento Omnichannel</p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">E-mail Corporativo</label>
            <div className="input-wrapper">
              <Mail size={16} />
              <input 
                type="email" 
                id="email" 
                placeholder="Ex: agente@chatdesk.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha de Acesso</label>
            <div className="input-wrapper">
              <Lock size={16} />
              <input 
                type={showPassword ? 'text' : 'password'} 
                id="password" 
                placeholder="••••••••••••" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '44px' }}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-resolve" 
            style={{
              width: '100%', 
              padding: '12px', 
              fontSize: '14px', 
              fontWeight: 600,
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar no Painel'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Ainda não tem uma conta?{' '}
            <button 
              type="button" 
              onClick={onGoToRegister}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
            >
              Crie uma conta corporativa
            </button>
          </p>
        </div>
      </div>

      {/* Connection settings Drawer */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '100%',
          maxWidth: '440px',
          height: '100vh',
          background: '#151824',
          borderLeft: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1000,
          padding: '30px',
          boxSizing: 'border-box',
          overflowY: 'auto',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px', fontWeight: 700 }}>Conexão do Servidor</h3>
            <button 
              onClick={() => setShowSettings(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label>Supabase URL</label>
              <div className="input-wrapper">
                <Database size={16} />
                <input 
                  type="url" 
                  value={supabaseUrl} 
                  onChange={(e) => setSupabaseUrl(e.target.value)} 
                  placeholder="https://suaprojeto.supabase.co" 
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Supabase Anon Key</label>
              <div className="input-wrapper">
                <Key size={16} />
                <input 
                  type="text" 
                  value={supabaseKey} 
                  onChange={(e) => setSupabaseKey(e.target.value)} 
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..." 
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>WhatsApp API URL</label>
              <div className="input-wrapper">
                <LinkIcon size={16} />
                <input 
                  type="url" 
                  value={waUrl} 
                  onChange={(e) => setWaUrl(e.target.value)} 
                  placeholder="https://api-wa.suaempresa.com" 
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>WhatsApp API Key</label>
              <div className="input-wrapper">
                <Key size={16} />
                <input 
                  type="password" 
                  value={waKey} 
                  onChange={(e) => setWaKey(e.target.value)} 
                  placeholder="Chave secreta de acesso à API" 
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button 
                type="button" 
                className="btn-cancel" 
                onClick={() => setShowSettings(false)}
                style={{ flex: 1, padding: '10px', fontSize: '13px' }}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn-resolve"
                style={{ flex: 1, padding: '10px', fontSize: '13px' }}
              >
                Salvar Configurações
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
