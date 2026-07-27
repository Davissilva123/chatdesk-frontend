import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { getSupabase } from '../supabase';
import { showToast } from '../utils';
import { Star, Send, CheckCircle, Frown, Meh, Smile, X } from 'lucide-react';

// CSAT Modal — shown after resolving a conversation
export function CsatModal({ conversation, onClose }) {
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === null) { showToast('Selecione uma avaliação.', 'warning'); return; }
    const supabase = getSupabase();
    if (!supabase) { setSubmitted(true); return; }
    setSubmitting(true);
    try {
      await supabase.from('csat_responses').insert({
        conversation_id: conversation.id,
        contact_id: conversation.contact?.id,
        rating,
        comment: comment.trim() || null,
        agent_id: conversation.assigned_agent_id,
        inbox_id: conversation.inbox_id,
      });
      setSubmitted(true);
    } catch (e) {
      console.error('CSAT save error:', e);
      setSubmitted(true); // Still close gracefully
    } finally { setSubmitting(false); }
  };

  const ratingOptions = [
    { value: 1, icon: Frown, label: 'Ruim', color: 'var(--danger)' },
    { value: 3, icon: Meh, label: 'Regular', color: 'var(--warning)' },
    { value: 5, icon: Smile, label: 'Ótimo', color: 'var(--success)' },
  ];

  if (submitted) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '380px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Obrigado!</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginBottom: '20px' }}>Sua avaliação foi registrada e vai nos ajudar a melhorar.</p>
        <button onClick={onClose} className="btn-resolve" style={{ width: '100%', justifyContent: 'center' }}>Fechar</button>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Como foi o atendimento?</h3>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
          Avalie o atendimento com <strong style={{ color: 'var(--text-secondary)' }}>{conversation.contact?.name || conversation.contact?.phone}</strong>.
        </p>

        {/* Rating buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', justifyContent: 'center' }}>
          {ratingOptions.map(opt => {
            const Icon = opt.icon;
            const selected = rating === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setRating(opt.value)}
                style={{
                  flex: 1, padding: '16px 12px', borderRadius: 'var(--radius)',
                  border: `2px solid ${selected ? opt.color : 'var(--border)'}`,
                  background: selected ? `${opt.color}15` : 'transparent',
                  color: selected ? opt.color : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'all var(--transition)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                  transform: selected ? 'scale(1.04)' : 'scale(1)',
                }}
              >
                <Icon size={28} />
                <span style={{ fontSize: '11.5px', fontWeight: 600 }}>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Comment */}
        <div className="form-field">
          <label>Comentário (opcional)</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Conte-nos mais sobre sua experiência..."
            rows={3}
            style={{ padding: '10px 13px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '13px', width: '100%', resize: 'none', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button onClick={onClose} className="btn-cancel" style={{ flex: 1, justifyContent: 'center' }}>Pular</button>
          <button onClick={handleSubmit} disabled={submitting || rating === null} className="btn-resolve" style={{ flex: 1, justifyContent: 'center' }}>
            <Send size={13} />
            {submitting ? 'Enviando...' : 'Enviar Avaliação'}
          </button>
        </div>
      </div>
    </div>
  );
}

// CSAT View — report of all ratings
export default function CsatView() {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ avg: 0, total: 0, good: 0, neutral: 0, bad: 0 });

  useEffect(() => { loadCsat(); }, []);

  const loadCsat = async () => {
    const supabase = getSupabase();
    if (!supabase) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from('csat_responses')
        .select('*, contact:contacts(name, phone), agent:agents(name)')
        .order('created_at', { ascending: false })
        .limit(100);

      const list = data || [];
      setResponses(list);
      const total = list.length;
      const avg = total ? (list.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : 0;
      setStats({
        avg, total,
        good: list.filter(r => r.rating >= 4).length,
        neutral: list.filter(r => r.rating === 3).length,
        bad: list.filter(r => r.rating <= 2).length,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const ratingIcon = (r) => r >= 4 ? '😊' : r === 3 ? '😐' : '😞';
  const ratingColor = (r) => r >= 4 ? 'var(--success)' : r === 3 ? 'var(--warning)' : 'var(--danger)';
  const ratingBg = (r) => r >= 4 ? 'var(--success-soft)' : r === 3 ? 'var(--warning-soft)' : 'var(--danger-soft)';

  return (
    <div style={{ padding: '28px 32px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Star size={22} style={{ color: 'var(--warning)' }} /> CSAT — Satisfação do Cliente
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Avaliações coletadas após resolução de conversas</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
        {[
          { label: 'Nota Média', value: `${stats.avg}/5`, icon: '⭐', color: 'var(--warning)' },
          { label: 'Ótimo (4-5)', value: stats.good, icon: '😊', color: 'var(--success)' },
          { label: 'Regular (3)', value: stats.neutral, icon: '😐', color: 'var(--warning)' },
          { label: 'Ruim (1-2)', value: stats.bad, icon: '😞', color: 'var(--danger)' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '22px' }}>{s.icon}</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{loading ? '—' : s.value}</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* List */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Avaliações Recentes</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>{stats.total} total</span>
        </div>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>
        ) : responses.length === 0 ? (
          <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Star size={32} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Nenhuma avaliação ainda</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>As avaliações aparecem após resolução de conversas</div>
          </div>
        ) : (
          <table className="ui-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Contato</th>
                <th>Agente</th>
                <th>Nota</th>
                <th>Comentário</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {responses.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.contact?.name || r.contact?.phone || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{r.agent?.name || '—'}</td>
                  <td>
                    <span style={{ background: ratingBg(r.rating), color: ratingColor(r.rating), padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      {ratingIcon(r.rating)} {r.rating}/5
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.comment || <span style={{ opacity: 0.4 }}>—</span>}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '11px' }}>
                    {new Date(r.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
