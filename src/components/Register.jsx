import React, { useState } from 'react';
import { getSupabase } from '../supabase';
import { showToast } from '../utils';
import { Mail, Lock, User, Building, ArrowLeft } from 'lucide-react';

export default function Register({ onBackToLogin, onRegisterSuccess }) {
  const [companyName, setCompanyName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    const waUrl = localStorage.getItem('WA_API_URL') || 'http://localhost:3009';

    try {
      // Chama a rota pública do backend que lida com o registro multi-tenant
      const response = await fetch(`${waUrl}/api/tenant/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyName,
          userName,
          email,
          password
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast('Conta criada com sucesso! Você ganhou 7 dias de acesso Pro grátis.', 'success');
        
        // Faz o login imediatamente
        const supabase = getSupabase();
        if (supabase) {
          await supabase.auth.signInWithPassword({
            email,
            password
          });
        }
        
        if (onRegisterSuccess) onRegisterSuccess();
      } else {
        showToast(result.error || 'Erro ao criar conta', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao se conectar ao servidor.', 'error');
    } finally {
      setLoading(false);
    }
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

      {/* Main Register Form Container */}
      <div className="login-container" style={{ padding: '30px 40px', maxWidth: '440px', width: '90%' }}>
        <button 
          onClick={onBackToLogin}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-secondary)', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            marginBottom: '20px',
            padding: 0
          }}
        >
          <ArrowLeft size={14} /> Voltar ao Login
        </button>

        <div className="logo-area" style={{ marginBottom: '10px' }}>
          <div className="logo-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <span className="logo-text">ChatDesk</span>
        </div>
        <p className="tagline" style={{ marginBottom: '24px' }}>Crie sua conta corporativa e teste grátis</p>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="companyName">Nome da Empresa</label>
            <div className="input-wrapper">
              <Building size={16} />
              <input 
                type="text" 
                id="companyName" 
                placeholder="Sua Empresa LTDA" 
                required 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="userName">Seu Nome Completo</label>
            <div className="input-wrapper">
              <User size={16} />
              <input 
                type="text" 
                id="userName" 
                placeholder="João da Silva" 
                required 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">E-mail Corporativo</label>
            <div className="input-wrapper">
              <Mail size={16} />
              <input 
                type="email" 
                id="email" 
                placeholder="voce@suaempresa.com.br" 
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
                type="password" 
                id="password" 
                placeholder="Mínimo 6 caracteres" 
                required 
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
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
              marginTop: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            disabled={loading}
          >
            {loading ? 'Criando Conta...' : 'Começar a usar o ChatDesk'}
          </button>
        </form>
      </div>
    </div>
  );
}
