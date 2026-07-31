import React, { useState, useEffect } from 'react';
import { getSupabase, logAuditAction } from '../supabase';
import { showToast } from '../utils';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLoginSuccess, onGoToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        await logAuditAction('LOGIN', { email });
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

  return (
    <div style={{
      background: 'var(--bg-primary)',
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
        <p className="tagline">Painel de Atendimento</p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <div className="input-wrapper">
              <Mail size={16} />
              <input 
                type="email" 
                id="email" 
                placeholder="Ex: agente@chatdesk.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '40px' }}
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
                style={{ paddingLeft: '40px', paddingRight: '44px' }}
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
              Crie uma conta
            </button>
          </p>
        </div>
      </div>

    </div>
  );
}
