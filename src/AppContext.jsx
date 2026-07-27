import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { 
  getSupabase, 
  getCurrentAgent, 
  getAgentsList, 
  getTeamsList, 
  getInboxesList, 
  getLabelsList,
  getConversations
} from './supabase';
import { playNotificationSound, showToast } from './utils';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [currentAgent, setCurrentAgentState] = useState(null);
  const [activeView, setActiveView] = useState('conversations'); // conversations | contacts | reports | settings | profile
  const [activeConversation, setActiveConversation] = useState(null);
  const activeConversationRef = useRef(null);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);
  const [conversations, setConversations] = useState([]);
  const [agents, setAgents] = useState([]);
  const prevAssignmentsRef = useRef(new Map());
  const [teams, setTeams] = useState([]);
  const [inboxes, setInboxes] = useState([]);
  const [labels, setLabels] = useState([]);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('open'); // open | pending | resolved | snoozed
  const [filterAgent, setFilterAgent] = useState('mine'); // mine | unassigned | all
  const [filterSidebar, setFilterSidebar] = useState({ type: 'all', id: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Layout Collapsed States
  const [filtersCollapsed, setFiltersCollapsed] = useState(
    localStorage.getItem('filters-sidebar-collapsed') === 'true'
  );
  const [contactCollapsed, setContactCollapsed] = useState(
    localStorage.getItem('contact-panel-collapsed') === 'true'
  );
  
  // Global theme
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  // Loading state
  const [loading, setLoading] = useState(true);
  
  // Notifications state (local + from DB)
  const [notifications, setNotifications] = useState([]);

  // Toggle layout collapsible panels
  useEffect(() => {
    localStorage.setItem('filters-sidebar-collapsed', filtersCollapsed);
    localStorage.setItem('contact-panel-collapsed', contactCollapsed);
  }, [filtersCollapsed, contactCollapsed]);

  // Handle Theme
  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [theme]);

  // Load initial configuration data on mount / auth
  const loadBaseData = async (forcedSession = null) => {
    try {
      let agent = await getCurrentAgent();

      // Fallback de emerência: se o banco não responder, usa dados da sessão Auth
      if (!agent) {
        const supabase = getSupabase();
        const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: forcedSession } };
        if (session?.user) {
          agent = {
            id: null,
            user_id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
            email: session.user.email,
            role: 'agent',
            status: 'online',
            company_id: null,
            _fallback: true
          };
        }
      }

      if (!agent) {
        setLoading(false);
        return;
      }
      setCurrentAgentState(agent);

      // Redireciona o SuperAdmin direto para o seu painel ao invés de conversas
      if (agent.role === 'superadmin' || agent.email === 'sdavi6790@gmail.com') {
        setActiveView('superadmin');
      }

      // Carrega listas auxiliares - sem bloquear se falharem
      const [agentsList, teamsList, inboxesList, labelsList] = await Promise.allSettled([
        getAgentsList(),
        getTeamsList(),
        getInboxesList(),
        getLabelsList()
      ]);

      setAgents(agentsList.status === 'fulfilled' ? agentsList.value : []);
      setTeams(teamsList.status === 'fulfilled' ? teamsList.value : []);
      setInboxes(inboxesList.status === 'fulfilled' ? inboxesList.value : []);
      setLabels(labelsList.status === 'fulfilled' ? labelsList.value : []);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar dados iniciais:', err);
      setLoading(false);
    }
  };

  // Refresh conversation list dynamically when filters or query changes
  const fetchConversationsList = async () => {
    try {
      const params = { status: filterStatus, limit: 500 };
      if (filterSidebar.type === 'unassigned') {
        params.unassigned = true;
      } else if (filterSidebar.type === 'team') {
        params.teamId = filterSidebar.id;
      } else if (filterSidebar.type === 'inbox') {
        params.inboxId = filterSidebar.id;
      }

      const baseList = await getConversations(params);

      // Client-side filtering (labels, mentions, search query)
      let filtered = baseList;

      if (filterSidebar.type === 'label' && filterSidebar.id) {
        filtered = filtered.filter(c => 
          c.labels && c.labels.some(l => l.label && l.label.id === filterSidebar.id)
        );
      } else if (filterSidebar.type === 'mentions' && currentAgent) {
        const mentionTag = `@${currentAgent.name.toLowerCase()}`;
        filtered = filtered.filter(c => {
          const preview = (c.last_message_preview || '').toLowerCase();
          return preview.includes(mentionTag);
        });
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(c => {
          const name = c.contact?.name?.toLowerCase() || '';
          const lastMsg = c.last_message_preview?.toLowerCase() || '';
          const phone = c.contact?.phone || '';
          return name.includes(q) || lastMsg.includes(q) || phone.includes(q);
        });
      }

      setConversations(filtered);
      filtered.forEach(c => prevAssignmentsRef.current.set(c.id, c.assigned_agent_id));
    } catch (err) {
      console.error('Erro ao carregar lista de conversas:', err);
    }
  };

  // Trigger conversations reload on filter adjustments or realtime updates
  useEffect(() => {
    if (currentAgent) {
      fetchConversationsList();
    }
  }, [filterStatus, filterSidebar, searchQuery, currentAgent, refreshTrigger]);

  // Realtime Supabase change listener (CDC)
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !currentAgent) return;

    console.log('[Realtime] Inscrevendo nos canais de tempo real...');

    // 1. Mensagens (INSERT, UPDATE)
    const msgChan = supabase.channel('new-messages-react')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;
        const current = activeConversationRef.current;
        
        if (current && msg.conversation_id === current.id) {
          // Tocar som de nova mensagem de cliente
          if (msg.sender_type === 'contact') {
            playNotificationSound();
            if (Notification.permission === 'granted') {
              const name = current.contact?.name || current.contact?.phone || 'Cliente';
              new Notification(`Nova mensagem de ${name}`, { body: msg.content || `[${msg.message_type}]` });
            }
          }
        } else {
          // Nova mensagem em conversa inativa
          if (msg.sender_type === 'contact') {
            playNotificationSound();
            showToast('Nova mensagem recebida!', 'info');
            if (Notification.permission === 'granted') {
              new Notification('Nova mensagem recebida', { body: msg.content || `[${msg.message_type}]` });
            }
          }
        }

        // Força atualização da listagem via trigger para evitar stale closures
        setRefreshTrigger(prev => prev + 1);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
        setRefreshTrigger(prev => prev + 1);
      })
      .subscribe();

    // 2. Conversas (UPDATE, INSERT, DELETE)
    const convChan = supabase.channel('conversation-updates-react')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, (payload) => {
        const item = payload.new;
        
        // Se a conversa alterada for a conversa ativa
        setActiveConversation(current => {
          if (current && item && item.id === current.id) {
            // Mesclar modificações da conversa
            return { ...current, ...item };
          }
          return current;
        });

        // Se atribuída a mim
        if (item) {
          const prevAgentId = prevAssignmentsRef.current.get(item.id);
          
          if (item.assigned_agent_id === currentAgent.id && prevAgentId !== currentAgent.id) {
            if (prevAgentId !== undefined) {
              showToast('Uma nova conversa foi atribuída a você!', 'success');
              if (Notification.permission === 'granted') {
                new Notification('Conversa Atribuída', { body: 'Uma nova conversa foi atribuída a você no ChatDesk.' });
              }
            }
          }
          
          prevAssignmentsRef.current.set(item.id, item.assigned_agent_id);
        }

        setRefreshTrigger(prev => prev + 1);
      })
      .subscribe();

    // 3. Status de Agentes
    const agentChan = supabase.channel('agent-status-react')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'agents' }, (payload) => {
        const updatedAgent = payload.new;
        setAgents(current => current.map(a => a.id === updatedAgent.id ? updatedAgent : a));
        
        if (updatedAgent.id === currentAgent.id) {
          setCurrentAgentState(updatedAgent);
        }
      })
      .subscribe();

    // 4. Presence/Typing
    const presenceChan = supabase.channel('chatdesk-presence-react')
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (window.onPresenceTyping) {
          window.onPresenceTyping(payload.payload);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChan);
      supabase.removeChannel(convChan);
      supabase.removeChannel(agentChan);
      supabase.removeChannel(presenceChan);
      console.log('[Realtime] Desinscrito de todos os canais.');
    };
  }, [currentAgent]);

  // Carregar dados na montagem do app + escutar mudanças de autenticação
  useEffect(() => {
    // 1. Carrega dados na montagem
    loadBaseData();

    // 2. Pede permissão de notificações
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // 3. Escuta mudanças de estado de autenticação do Supabase
    // Isso garante que após login/logout o app reaja automaticamente
    const supabase = getSupabase();
    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Usuário acabou de fazer login — carrega todos os dados, passando sessão como backup
        await loadBaseData(session);
      } else if (event === 'SIGNED_OUT') {
        // Usuário deslogou — limpa o estado
        setCurrentAgentState(null);
        setConversations([]);
        setAgents([]);
        setTeams([]);
        setInboxes([]);
        setLabels([]);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <AppContext.Provider value={{
      currentAgent,
      setCurrentAgent: setCurrentAgentState,
      activeView,
      setActiveView,
      activeConversation,
      setActiveConversation,
      conversations,
      setConversations,
      agents,
      setAgents,
      teams,
      setTeams,
      inboxes,
      setInboxes,
      labels,
      setLabels,
      filterStatus,
      setFilterStatus,
      filterAgent,
      setFilterAgent,
      filterSidebar,
      setFilterSidebar,
      searchQuery,
      setSearchQuery,
      filtersCollapsed,
      setFiltersCollapsed,
      contactCollapsed,
      setContactCollapsed,
      theme,
      setTheme,
      loading,
      setLoading,
      refreshTrigger,
      setRefreshTrigger,
      notifications,
      setNotifications,
      loadBaseData,
      fetchConversationsList
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
