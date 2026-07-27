import React, { useState } from 'react';
import { 
  Users, 
  UserSquare, 
  Inbox, 
  Tags, 
  MessageSquare, 
  Database, 
  PlayCircle, 
  Zap, 
  Link2, 
  Clock, 
  FileText,
  CreditCard
} from 'lucide-react';

import AgentsSettings from './settings/AgentsSettings';
import TeamsSettings from './settings/TeamsSettings';
import InboxesSettings from './settings/InboxesSettings';
import LabelsSettings from './settings/LabelsSettings';
import CannedResponsesSettings from './settings/CannedResponsesSettings';
import CustomAttributesSettings from './settings/CustomAttributesSettings';
import MacrosSettings from './settings/MacrosSettings';
import AutomationsSettings from './settings/AutomationsSettings';
import IntegrationsSettings from './settings/IntegrationsSettings';
import SlaSettings from './settings/SlaSettings';
import AuditSettings from './settings/AuditSettings';
import SubscriptionSettings from './settings/SubscriptionSettings';

export default function SettingsView() {
  const [activeSec, setActiveSec] = useState('agents'); // agents | teams | inboxes | labels | canned | attributes | macros | automations | integrations | sla | audit | subscription

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '32px', minHeight: '80vh', alignItems: 'start' }}>
        
        {/* Settings Sub-Navigation Sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderRight: '1px solid var(--border)', paddingRight: '20px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', paddingLeft: '8px', marginBottom: '12px' }}>
            Configurações
          </h3>
          
          <button 
            onClick={() => setActiveSec('agents')}
            className={`col2-tab-btn ${activeSec === 'agents' ? 'active' : ''}`} 
            style={{ textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: activeSec === 'agents' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', padding: '10px 12px', fontSize: '13px', borderRadius: '4px', fontWeight: activeSec === 'agents' ? '600' : 'normal' }}
          >
            <Users size={16} /> Agentes
          </button>
          <button 
            onClick={() => setActiveSec('teams')}
            className={`col2-tab-btn ${activeSec === 'teams' ? 'active' : ''}`} 
            style={{ textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: activeSec === 'teams' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', padding: '10px 12px', fontSize: '13px', borderRadius: '4px', fontWeight: activeSec === 'teams' ? '600' : 'normal' }}
          >
            <UserSquare size={16} /> Equipes
          </button>
          <button 
            onClick={() => setActiveSec('inboxes')}
            className={`col2-tab-btn ${activeSec === 'inboxes' ? 'active' : ''}`} 
            style={{ textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: activeSec === 'inboxes' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', padding: '10px 12px', fontSize: '13px', borderRadius: '4px', fontWeight: activeSec === 'inboxes' ? '600' : 'normal' }}
          >
            <Inbox size={16} /> Caixas de Entrada
          </button>
          <button 
            onClick={() => setActiveSec('labels')}
            className={`col2-tab-btn ${activeSec === 'labels' ? 'active' : ''}`} 
            style={{ textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: activeSec === 'labels' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', padding: '10px 12px', fontSize: '13px', borderRadius: '4px', fontWeight: activeSec === 'labels' ? '600' : 'normal' }}
          >
            <Tags size={16} /> Etiquetas
          </button>
          <button 
            onClick={() => setActiveSec('canned')}
            className={`col2-tab-btn ${activeSec === 'canned' ? 'active' : ''}`} 
            style={{ textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: activeSec === 'canned' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', padding: '10px 12px', fontSize: '13px', borderRadius: '4px', fontWeight: activeSec === 'canned' ? '600' : 'normal' }}
          >
            <MessageSquare size={16} /> Respostas Prontas
          </button>
          <button 
            onClick={() => setActiveSec('attributes')}
            className={`col2-tab-btn ${activeSec === 'attributes' ? 'active' : ''}`} 
            style={{ textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: activeSec === 'attributes' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', padding: '10px 12px', fontSize: '13px', borderRadius: '4px', fontWeight: activeSec === 'attributes' ? '600' : 'normal' }}
          >
            <Database size={16} /> Atributos Pers.
          </button>
          <button 
            onClick={() => setActiveSec('macros')}
            className={`col2-tab-btn ${activeSec === 'macros' ? 'active' : ''}`} 
            style={{ textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: activeSec === 'macros' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', padding: '10px 12px', fontSize: '13px', borderRadius: '4px', fontWeight: activeSec === 'macros' ? '600' : 'normal' }}
          >
            <PlayCircle size={16} /> Macros
          </button>
          <button 
            onClick={() => setActiveSec('automations')}
            className={`col2-tab-btn ${activeSec === 'automations' ? 'active' : ''}`} 
            style={{ textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: activeSec === 'automations' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', padding: '10px 12px', fontSize: '13px', borderRadius: '4px', fontWeight: activeSec === 'automations' ? '600' : 'normal' }}
          >
            <Zap size={16} /> Automações
          </button>
          <button 
            onClick={() => setActiveSec('integrations')}
            className={`col2-tab-btn ${activeSec === 'integrations' ? 'active' : ''}`} 
            style={{ textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: activeSec === 'integrations' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', padding: '10px 12px', fontSize: '13px', borderRadius: '4px', fontWeight: activeSec === 'integrations' ? '600' : 'normal' }}
          >
            <Link2 size={16} /> Integrações
          </button>
          <button 
            onClick={() => setActiveSec('sla')}
            className={`col2-tab-btn ${activeSec === 'sla' ? 'active' : ''}`} 
            style={{ textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: activeSec === 'sla' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', padding: '10px 12px', fontSize: '13px', borderRadius: '4px', fontWeight: activeSec === 'sla' ? '600' : 'normal' }}
          >
            <Clock size={16} /> SLA
          </button>
          <button 
            onClick={() => setActiveSec('audit')}
            className={`col2-tab-btn ${activeSec === 'audit' ? 'active' : ''}`} 
            style={{ textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: activeSec === 'audit' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', padding: '10px 12px', fontSize: '13px', borderRadius: '4px', fontWeight: activeSec === 'audit' ? '600' : 'normal' }}
          >
            <FileText size={16} /> Auditoria
          </button>
          <button 
            onClick={() => setActiveSec('subscription')}
            className={`col2-tab-btn ${activeSec === 'subscription' ? 'active' : ''}`} 
            style={{ textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: activeSec === 'subscription' ? 'var(--bg-secondary)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', padding: '10px 12px', fontSize: '13px', borderRadius: '4px', fontWeight: activeSec === 'subscription' ? '600' : 'normal' }}
          >
            <CreditCard size={16} /> Assinatura
          </button>
        </aside>

        {/* Settings Sub-Content Panels Area */}
        <section style={{ minWidth: 0, width: '100%' }}>
          {activeSec === 'agents' && <AgentsSettings />}
          {activeSec === 'teams' && <TeamsSettings />}
          {activeSec === 'inboxes' && <InboxesSettings />}
          {activeSec === 'labels' && <LabelsSettings />}
          {activeSec === 'canned' && <CannedResponsesSettings />}
          {activeSec === 'attributes' && <CustomAttributesSettings />}
          {activeSec === 'macros' && <MacrosSettings />}
          {activeSec === 'automations' && <AutomationsSettings />}
          {activeSec === 'integrations' && <IntegrationsSettings />}
          {activeSec === 'sla' && <SlaSettings />}
          {activeSec === 'audit' && <AuditSettings />}
          {activeSec === 'subscription' && <SubscriptionSettings />}
        </section>

      </div>
    </div>
  );
}
