function getWaApiConfig() {
  const url = localStorage.getItem('WA_API_URL') || 'http://localhost:3009';
  const key = localStorage.getItem('WA_API_KEY') || '';
  return { url, key };
}

export async function checkApiHealth() {
  const { url } = getWaApiConfig();
  try {
    const res = await fetch(`${url}/api/health`);
    if (!res.ok) throw new Error('API offline');
    return await res.json();
  } catch (err) {
    console.error('Erro no health check da API:', err);
    throw err;
  }
}

export async function startWaSession(sessionId, inboxId) {
  const { url, key } = getWaApiConfig();
  try {
    const res = await fetch(`${url}/api/session/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key
      },
      body: JSON.stringify({ sessionId, inboxId })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Erro ao iniciar sessão no Baileys');
    }
    return await res.json();
  } catch (err) {
    console.error('Erro ao iniciar sessão:', err);
    throw err;
  }
}

export async function sendWaMessage({ sessionId, phone, type = 'text', content, mediaUrl = null, conversationId = null, messageId = null }) {
  const { url, key } = getWaApiConfig();
  try {
    const res = await fetch(`${url}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key
      },
      body: JSON.stringify({
        sessionId,
        phone,
        type,
        content,
        mediaUrl,
        conversationId,
        messageId
      })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Falha ao enviar mensagem pelo WhatsApp');
    }
    return await res.json();
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    throw err;
  }
}

export async function getQRCode(sessionId) {
  const { url, key } = getWaApiConfig();
  try {
    const res = await fetch(`${url}/api/qrcode/${sessionId}`, {
      headers: {
        'x-api-key': key
      }
    });
    if (!res.ok) throw new Error('Erro ao buscar QR code');
    return await res.json(); // { status, qrcode }
  } catch (err) {
    console.error('Erro ao obter QR Code:', err);
    throw err;
  }
}

export async function getConnectionStatus(sessionId) {
  const { url, key } = getWaApiConfig();
  try {
    const res = await fetch(`${url}/api/status/${sessionId}`, {
      headers: {
        'x-api-key': key
      }
    });
    if (!res.ok) throw new Error('Erro ao buscar status');
    return await res.json(); // { sessionId, status, phone, connectedAt }
  } catch (err) {
    console.error('Erro ao obter status da conexão:', err);
    throw err;
  }
}

export async function disconnectWaSession(sessionId) {
  const { url, key } = getWaApiConfig();
  try {
    const res = await fetch(`${url}/api/disconnect/${sessionId}`, {
      method: 'POST',
      headers: {
        'x-api-key': key
      }
    });
    if (!res.ok) throw new Error('Erro ao desconectar sessão');
    return await res.json();
  } catch (err) {
    console.error('Erro ao desconectar sessão:', err);
    throw err;
  }
}
