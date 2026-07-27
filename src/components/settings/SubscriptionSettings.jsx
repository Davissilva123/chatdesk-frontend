import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../supabase';
import { showToast } from '../../utils';
import { CreditCard, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useApp } from '../../AppContext';

export default function SubscriptionSettings() {
  const { currentAgent } = useApp();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const loadCompany = async () => {
    const supabase = getSupabase();
    if (!supabase || !currentAgent) return;

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', currentAgent.company_id)
        .single();

      if (error) throw error;
      setCompany(data);
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar dados da empresa.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompany();
  }, [currentAgent]);

  if (loading) {
    return <div style={{ padding: '24px', color: 'var(--text-muted)' }}>Carregando dados da assinatura...</div>;
  }

  if (!company) {
    return <div style={{ padding: '24px', color: 'var(--text-muted)' }}>Empresa não encontrada.</div>;
  }

  const status = company.subscription_status || 'trial';
  const endsAt = company.subscription_ends_at ? new Date(company.subscription_ends_at) : null;
  const plan = company.plan_name || 'Pro';

  const isExpired = endsAt && endsAt < new Date();

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    const waUrl = localStorage.getItem('WA_API_URL') || 'http://localhost:3009';
    try {
      const response = await fetch(`${waUrl}/api/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id })
      });
      const data = await response.json();
      if (data.success && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        showToast(data.error || 'Erro ao gerar pagamento.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Falha na comunicação com o servidor financeiro.', 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleMockPay = async () => {
    const waUrl = localStorage.getItem('WA_API_URL') || 'http://localhost:3009';
    try {
      const response = await fetch(`${waUrl}/api/billing/mock-pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id })
      });
      const data = await response.json();
      if (data.success) {
        showToast('Pagamento simulado (Aprovado)!', 'success');
        loadCompany();
      } else {
        showToast(data.error || 'Erro no mock', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Assinatura e Pagamento</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Gerencie seu plano e visualize informações de faturamento.</p>
      </div>

      <div style={{ 
        background: 'var(--bg-secondary)', 
        border: '1px solid var(--border)', 
        borderRadius: '12px', 
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '600px'
      }}>
        {/* Status Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: 600 }}>
              Plano Atual
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {plan}
              {status === 'active' && <span style={{ fontSize: '10px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', padding: '4px 8px', borderRadius: '12px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> Ativo</span>}
              {status === 'trial' && <span style={{ fontSize: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)', padding: '4px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>Em Teste</span>}
              {(status === 'past_due' || isExpired) && <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '4px 8px', borderRadius: '12px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12} /> Inadimplente</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
              R$ 97,00<span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>/mês</span>
            </div>
          </div>
        </div>

        <hr style={{ borderColor: 'var(--border-light)', margin: 0 }} />

        {/* Details */}
        <div>
          {endsAt && (
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
              {isExpired ? 'Sua assinatura expirou em ' : 'Sua assinatura é válida até '}
              <strong style={{ color: 'var(--text-primary)' }}>{endsAt.toLocaleDateString('pt-BR')}</strong>.
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn-resolve"
              style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              onClick={handleCheckout}
              disabled={checkoutLoading}
            >
              <CreditCard size={18} />
              {checkoutLoading ? 'Gerando Link...' : (isExpired ? 'Regularizar Assinatura' : 'Assinar Agora')}
            </button>
            <button 
              className="btn-cancel"
              style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              onClick={handleMockPay}
              title="Apenas para desenvolvedores testarem a liberação do sistema"
            >
              Simular Pagamento
            </button>
          </div>
        </div>

        {/* Secure badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px' }}>
          <ShieldCheck size={14} /> Pagamento seguro processado via MercadoPago
        </div>

      </div>
    </div>
  );
}
