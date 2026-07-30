import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

// InicializaÃ§Ã£o dinÃ¢mica baseada nas configuraÃ§Ãµes salvas no localStorage
export function initSupabase() {
  let url = localStorage.getItem('SUPABASE_URL');
  let key = localStorage.getItem('SUPABASE_ANON_KEY');
  
  // Fallbacks padrÃ£o do projeto se nÃ£o estiverem configurados
  if (!url) {
    url = 'https://hkqznvekxcmxarupfklg.supabase.co';
    localStorage.setItem('SUPABASE_URL', url);
  }
  if (!key) {
    key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXpudmVreGNteGFydXBma2xnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NjUxODgsImV4cCI6MjA5NzU0MTE4OH0.2vy6s4OC-nWmCNt2rhd7-A4jr2_vzLFg63IdUCR2p80';
    localStorage.setItem('SUPABASE_ANON_KEY', key);
  }
  


  if (url && key) {
    try {
      supabaseClient = createClient(url, key);
    } catch (err) {
      console.error('Falha ao inicializar o cliente Supabase:', err);
      supabaseClient = null;
    }
  }
}

// Inicializa no import
initSupabase();

let adminSupabaseClient = null;

export function getAdminSupabase() {
  if (!adminSupabaseClient) {
    const url = localStorage.getItem('SUPABASE_URL') || 'https://hkqznvekxcmxarupfklg.supabase.co';
    // Utilizando a chave Service Role (recuperada do backend) para contornar RLS no painel SuperAdmin local
    const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXpudmVreGNteGFydXBma2xnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk2NTE4OCwiZXhwIjoyMDk3NTQxMTg4fQ.laDHtdvd-MR2In1AV-LgS8FUV2Y53B4i-KfLfXSeGss';
    adminSupabaseClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }
  return adminSupabaseClient;
}

export function getSupabase() {
  if (!supabaseClient) {
    initSupabase();
  }
  return supabaseClient;
}

// Helper para verificar se estÃ¡ logado
export async function getActiveSession() {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data: { session } } = await client.auth.getSession();
    return session;
  } catch (err) {
    console.error('Erro ao verificar sessÃ£o ativa:', err);
    return null;
  }
}

// Consultar o perfil do agente logado
export async function getCurrentAgent() {
  const client = getSupabase();
  if (!client) return null;
  
  const session = await getActiveSession();
  if (!session) return null;

  // Usa funÃ§Ã£o RPC com SECURITY DEFINER para ignorar o RLS
  // e sempre conseguir ler o prÃ³prio perfil do agente.
  try {
    const { data: agent, error } = await client.rpc('get_current_agent');

    if (!error && agent) {
      return agent;
    }
  } catch (rpcErr) {
    console.warn('RPC get_current_agent falhou, usando fallback direto:', rpcErr?.message);
  }

  // Fallback: query direta (pode falhar com RLS ativo)
  const { data: agent, error } = await client.rpc('get_current_agent');

  if (error) {
    console.error('Erro ao consultar agente:', error);
    // Ãšltimo recurso: retorna objeto mÃ­nimo para nÃ£o travar o login
    return {
      id: null,
      user_id: session.user.id,
      name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'UsuÃ¡rio',
      email: session.user.email,
      role: 'agent',
      status: 'online',
      company_id: null,
      _fallback: true
    };
  }

  // Se nÃ£o existir perfil na tabela agents, tentar criar (apenas se tiver empresa disponÃ­vel)
  if (!agent) {
    // Para novos registros no modelo SaaS, buscar a Empresa PadrÃ£o
    const { data: defaultCompany } = await client.from('companies').select('id').limit(1).single();

    if (!defaultCompany?.id) {
      // NÃ£o conseguiu achar empresa (RLS bloqueando ou ainda nÃ£o criada).
      // Retorna null para nÃ£o tentar inserir com company_id nulo.
      console.warn('NÃ£o foi possÃ­vel determinar empresa para criar agente automaticamente.');
      return null;
    }

    const { data: newAgent, error: createError } = await client
      .from('agents')
      .insert({
        user_id: session.user.id,
        name: session.user.user_metadata?.name || session.user.email.split('@')[0],
        email: session.user.email,
        role: 'agent',
        status: 'online',
        company_id: defaultCompany.id
      })
      .select()
      .single();

    if (createError) {
      console.error('Erro ao criar perfil de agente automÃ¡tico:', createError);
      return null;
    }
    return newAgent;
  }

  return agent;
}


// Listagem de Conversas com filtros
export async function getConversations({ agentId, unassigned, status, teamId, inboxId, limit = 50 }) {
  const client = getSupabase();
  if (!client) return [];

  let query = client
    .from('conversations')
    .select(`
      *,
      contact:contacts(*),
      agent:agents(*),
      inbox:inboxes(*),
      labels:conversation_labels(label:labels(*))
    `);

  if (status) {
    query = query.eq('status', status);
  } else {
    query = query.neq('status', 'resolved'); // por padrÃ£o oculta resolvidas
  }

  if (unassigned) {
    query = query.is('assigned_agent_id', null);
  } else if (agentId) {
    query = query.eq('assigned_agent_id', agentId);
  }

  if (teamId) {
    query = query.eq('team_id', teamId);
  }

  if (inboxId) {
    query = query.eq('inbox_id', inboxId);
  }

  query = query.order('last_message_at', { ascending: false }).limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error('Erro ao consultar conversas:', error);
    return [];
  }
  return data || [];
}

// Consultar mensagens de uma conversa
export async function getMessages(conversationId) {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao consultar mensagens:', error);
    return [];
  }
  return data || [];
}

// Enviar mensagem como agente
export async function sendAgentMessage({ conversationId, content, messageType = 'text', mediaUrl = null, agentId = null, metadata = null, companyId = null }) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase não configurado');

  let finalCompanyId = companyId;
  if (!finalCompanyId) {
    try {
      const agentRes = await client.rpc('get_current_agent');
      if (agentRes.data && agentRes.data.company_id) {
        finalCompanyId = agentRes.data.company_id;
      }
    } catch (e) { console.error('Fallback company_id error', e); }
  }

  const insertPayload = {
    conversation_id: conversationId,
    sender_type: 'agent',
    sender_id: agentId,
    content,
    message_type: messageType,
    media_url: mediaUrl,
    status: 'sent'
  };

  if (finalCompanyId) {
    insertPayload.company_id = finalCompanyId;
  }

  // Only include metadata if provided (backwards compatible)
  if (metadata) {
    insertPayload.metadata = metadata;
  }

  const { data, error } = await client
    .from('messages')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('Erro ao inserir mensagem do agente:', error);
    throw error;
  }

  // Desativar chatbot automaticamente ao responder
  try {
    await client
      .from('conversations')
      .update({ bot_active: false })
      .eq('id', conversationId);
  } catch (err) {
    console.error('Erro ao desativar bot na conversa:', err);
  }

  return data;
}


// Editar conteÃºdo de uma mensagem
export async function updateMessage(messageId, newContent) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase nÃ£o configurado');
  const { data, error } = await client
    .from('messages')
    .update({ content: newContent })
    .eq('id', messageId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Deletar mensagem (soft delete via metadata)
export async function deleteMessage(messageId) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase nÃ£o configurado');
  // First get current metadata
  const { data: existing } = await client.from('messages').select('metadata').eq('id', messageId).maybeSingle();
  const meta = { ...(existing?.metadata || {}), deleted: true };
  const { error } = await client
    .from('messages')
    .update({ content: '', metadata: meta })
    .eq('id', messageId);
  if (error) throw error;
}

// AÃ§Ãµes em lote em conversas
export async function bulkUpdateConversations(ids, updates) {
  const client = getSupabase();
  if (!client || !ids?.length) return;
  const { error } = await client
    .from('conversations')
    .update(updates)
    .in('id', ids);
  if (error) throw error;
}

// Atualizar status de uma conversa

export async function updateConversationStatus(conversationId, status) {
  const client = getSupabase();
  if (!client) return;

  const { error } = await client
    .from('conversations')
    .update({ status })
    .eq('id', conversationId);

  if (error) {
    console.error('Erro ao atualizar status da conversa:', error);
  }
}

// Atribuir agente a conversa
export async function assignConversationAgent(conversationId, agentId) {
  const client = getSupabase();
  if (!client) return;

  const { error } = await client
    .from('conversations')
    .update({ assigned_agent_id: agentId })
    .eq('id', conversationId);

  if (error) {
    console.error('Erro ao atribuir agente:', error);
    throw error;
  }
}

// Atribuir equipe a conversa
export async function assignConversationTeam(conversationId, teamId) {
  const client = getSupabase();
  if (!client) return;

  const { error } = await client
    .from('conversations')
    .update({ team_id: teamId, bot_active: false })
    .eq('id', conversationId);

  if (error) {
    console.error('Erro ao atribuir equipe:', error);
  }
}

// Atualizar prioridade da conversa
export async function updateConversationPriority(conversationId, priority) {
  const client = getSupabase();
  if (!client) return;

  const { error } = await client
    .from('conversations')
    .update({ priority })
    .eq('id', conversationId);

  if (error) {
    console.error('Erro ao definir prioridade:', error);
  }
}

// Listar todos os agentes cadastrados
export async function getAgentsList() {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from('agents')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Erro ao listar agentes:', error);
    return [];
  }
  return data || [];
}

// Listar todas as equipes
export async function getTeamsList() {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from('teams')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Erro ao listar equipes:', error);
    return [];
  }
  return data || [];
}

// Listar todas as inboxes
export async function getInboxesList() {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from('inboxes')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Erro ao listar inboxes:', error);
    return [];
  }
  return data || [];
}

// Listar todas as etiquetas
export async function getLabelsList() {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from('labels')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Erro ao listar etiquetas:', error);
    return [];
  }
  return data || [];
}

// Resetar contagem de mensagens nÃ£o lidas
export async function resetUnreadCount(conversationId) {
  const client = getSupabase();
  if (!client) return;

  const { error } = await client
    .from('conversations')
    .update({ unread_count: 0 })
    .eq('id', conversationId);

  if (error) {
    console.error('Erro ao resetar unread count:', error);
  }
}

// Enviar arquivo para storage do Supabase a partir do frontend
export async function uploadFileToSupabase(file) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase nÃ£o configurado');

  const ext = file.name.split('.').pop();
  const filename = `${Math.random().toString(36).substring(2)}-${Date.now()}.${ext}`;
  const path = `attachments/${filename}`;

  const { data, error } = await client.storage
    .from('chatdesk-media')
    .upload(path, file);

  if (error) throw error;

  const { data: publicData } = client.storage
    .from('chatdesk-media')
    .getPublicUrl(path);

  return {
    publicUrl: publicData.publicUrl,
    filename: file.name,
    mimeType: file.type
  };
}

// â”€â”€ Audit Logs Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function logAuditAction(action, metadata = {}, entity_id = null) {
  const agent = await getCurrentAgent();
  if (!agent) return;
  const supabase = getSupabase();
  if (!supabase) return;
  
  try {
    await supabase.from('audit_logs').insert([{
      agent_id: agent.id,
      action: action,
      entity_id: entity_id,
      metadata: metadata
    }]);
  } catch (err) {
    console.error('Failed to log audit action', err);
  }
}


