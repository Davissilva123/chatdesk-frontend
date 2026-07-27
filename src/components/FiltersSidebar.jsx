import React from 'react';
import { useApp } from '../AppContext';
import { 
  ChevronLeft, 
  MessageSquare, 
  UserMinus, 
  AtSign, 
  Users, 
  Smartphone,
  ChevronRight
} from 'lucide-react';

export default function FiltersSidebar() {
  const {
    teams,
    inboxes,
    labels,
    filterSidebar,
    setFilterSidebar,
    filtersCollapsed,
    setFiltersCollapsed,
    conversations
  } = useApp();

  const handleFilterClick = (type, id = null) => {
    setFilterSidebar({ type, id });
  };

  if (filtersCollapsed) return null;

  return (
    <section id="filters-sidebar" className="column-filters">
      {/* Header */}
      <div className="filters-header">
        <span className="filters-title">Filtros</span>
        <button 
          className="toolbar-btn" 
          onClick={() => setFiltersCollapsed(true)} 
          title="Recolher Filtros"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Main List Scroll */}
      <div className="filters-scroll">
        
        {/* Section 1: Filtros Principais */}
        <div className="filters-section">
          <span className="filters-section-title">Conversas</span>
          
          <div 
            className={`filter-item ${filterSidebar.type === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterClick('all')}
          >
            <MessageSquare size={16} />
            <span>Todas conversas</span>
          </div>

          <div 
            className={`filter-item ${filterSidebar.type === 'unassigned' ? 'active' : ''}`}
            onClick={() => handleFilterClick('unassigned')}
          >
            <UserMinus size={16} />
            <span>Não atendidas</span>
          </div>

          <div 
            className={`filter-item ${filterSidebar.type === 'mentions' ? 'active' : ''}`}
            onClick={() => handleFilterClick('mentions')}
          >
            <AtSign size={16} />
            <span>Menções</span>
          </div>
        </div>

        {/* Section 2: Equipes */}
        <div className="filters-section">
          <span className="filters-section-title">Equipes</span>
          {teams.length === 0 ? (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '12px' }}>Nenhuma cadastrada</span>
          ) : (
            teams.map(t => (
              <div 
                key={t.id}
                className={`filter-item ${filterSidebar.type === 'team' && filterSidebar.id === t.id ? 'active' : ''}`}
                onClick={() => handleFilterClick('team', t.id)}
              >
                <Users size={16} />
                <span>{t.name}</span>
              </div>
            ))
          )}
        </div>

        {/* Section 3: Caixas de Entrada (Canais) */}
        <div className="filters-section">
          <span className="filters-section-title">Canais / Caixas</span>
          {inboxes.length === 0 ? (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '12px' }}>Nenhuma cadastrada</span>
          ) : (
            inboxes.map(i => (
              <div 
                key={i.id}
                className={`filter-item ${filterSidebar.type === 'inbox' && filterSidebar.id === i.id ? 'active' : ''}`}
                onClick={() => handleFilterClick('inbox', i.id)}
              >
                <Smartphone size={16} />
                <span>{i.name}</span>
              </div>
            ))
          )}
        </div>

        {/* Section 4: Etiquetas */}
        <div className="filters-section">
          <span className="filters-section-title">Etiquetas</span>
          {labels.length === 0 ? (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '12px' }}>Nenhuma cadastrada</span>
          ) : (
            labels.map(l => {
              const labelCount = (conversations || []).filter(c =>
                c.labels?.some(cl => cl.label?.id === l.id)
              ).length;
              return (
                <div 
                  key={l.id}
                  className={`filter-item ${filterSidebar.type === 'label' && filterSidebar.id === l.id ? 'active' : ''}`}
                  onClick={() => handleFilterClick('label', l.id)}
                  style={{ justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: l.color || '#6366f1', display: 'inline-block', flexShrink: 0 }}></span>
                    <span>{l.name}</span>
                  </div>
                  {labelCount > 0 && (
                    <span style={{ fontSize: '9.5px', fontWeight: 700, background: 'rgba(255,255,255,0.07)', color: 'var(--text-muted)', padding: '1px 6px', borderRadius: '10px', minWidth: '18px', textAlign: 'center' }}>
                      {labelCount}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </section>
  );
}
