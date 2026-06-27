document.addEventListener('DOMContentLoaded', () => {
  // Init Lucide icons
  lucide.createIcons();

  // Tab State
  let activeTab = 'dashboard';

  // Platform Icon helper (resolves Lucide brand icon missing bundle issue)
  function getPlatformIcon(platform, size = 14) {
    if (platform === 'facebook') {
      return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:#1877f2; display:inline-block; vertical-align:middle; margin-right:4px;"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>`;
    }
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color:#0088cc; display:inline-block; vertical-align:middle; margin-right:4px;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
  }

  // Helper to show Supabase Table Setup warning banner with copyable SQL script
  function showDbSchemaError(err) {
    if (!err.message.includes("schema cache") && !err.message.includes("public.clients") && !err.message.includes("relation")) {
      return;
    }
    const alertBanner = document.getElementById('connection-alert');
    if (!alertBanner) return;
    
    alertBanner.style.display = 'flex';
    alertBanner.style.flexDirection = 'column';
    alertBanner.style.alignItems = 'flex-start';
    alertBanner.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="#f59e0b" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <span><strong>Supabase Table Setup Required:</strong> The database tables were not found. Copy the SQL script below, run it in your Supabase SQL Editor, and refresh this page.</span>
      </div>
      <div style="width:100%; margin-top:12px;">
        <button class="btn btn-secondary btn-sm" id="btn-toggle-sql" style="padding: 4px 8px; font-size:11px;">Show SQL Script</button>
        <textarea id="warning-sql-code" readonly style="display:none; width:100%; font-family:monospace; font-size:11px; margin-top:8px; background:rgba(0,0,0,0.5); border:1px solid var(--border-glow); padding:10px; border-radius:8px; color:#a2a2c2; height:150px; resize:none; outline:none;">-- Create Clients Table
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  telegram_token TEXT,
  telegram_channel_id TEXT,
  facebook_page_token TEXT,
  facebook_page_id TEXT,
  facebook_app_secret TEXT,
  facebook_verify_token TEXT,
  ai_persona TEXT NOT NULL,
  knowledge_base TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Chat Logs Table
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  username TEXT,
  platform TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);</textarea>
      </div>
    `;
    
    document.getElementById('btn-toggle-sql').addEventListener('click', (e) => {
      e.preventDefault();
      const area = document.getElementById('warning-sql-code');
      if (area.style.display === 'none') {
        area.style.display = 'block';
        e.target.textContent = 'Hide SQL Script';
      } else {
        area.style.display = 'none';
        e.target.textContent = 'Show SQL Script';
      }
    });
  }

  // Modal State
  const modal = document.getElementById('client-modal');
  const clientForm = document.getElementById('client-form');
  const modalTitle = document.getElementById('modal-title');
  const formAction = document.getElementById('form-action');
  
  // Accordion Logic inside Modal
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.parentElement;
      section.classList.toggle('active');
    });
  });

  // Tab Switch Logic
  window.switchTab = (tabId) => {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      if (content.id === `tab-${tabId}`) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    activeTab = tabId;

    // Update headers
    const titleMap = {
      'dashboard': { title: 'Dashboard', subtitle: 'Welcome back, manager. System is fully operational.' },
      'clients': { title: 'Clients & Bots', subtitle: 'Configure clients, tokens, custom AI personas and knowledge bases.' },
      'chats': { title: 'Chat Tracker', subtitle: 'Track and review conversational flows from Telegram & Facebook bots.' },
      'settings': { title: 'System API Config', subtitle: 'Monitor backend connection parameters.' }
    };

    const header = titleMap[tabId] || { title: 'Admin Panel', subtitle: '' };
    document.getElementById('current-tab-title').textContent = header.title;
    document.getElementById('current-tab-subtitle').textContent = header.subtitle;

    // Trigger tab specific loads
    if (tabId === 'dashboard') {
      loadDashboardData();
    } else if (tabId === 'clients') {
      loadClientsList();
    } else if (tabId === 'chats') {
      loadChatsFilter();
    } else if (tabId === 'settings') {
      loadSystemStatus();
    }
  };

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // --- Modal Event Listeners ---
  document.getElementById('btn-add-client').addEventListener('click', () => {
    // Reset Form for creation
    clientForm.reset();
    formAction.value = 'create';
    document.getElementById('client-id').readOnly = false;
    modalTitle.textContent = 'Configure New Client Bot';
    
    // Collapse all accordions by default
    document.querySelectorAll('.accordion-section').forEach(sec => sec.classList.remove('active'));
    
    modal.classList.add('active');
  });

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    modal.classList.remove('active');
  });

  document.getElementById('btn-cancel-client').addEventListener('click', () => {
    modal.classList.remove('active');
  });

  // Close modal when clicking outside content
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  // Handle Form Submission
  clientForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const clientId = document.getElementById('client-id').value.trim();
    const name = document.getElementById('client-name').value.trim();
    const telegramToken = document.getElementById('telegram-token').value.trim() || null;
    const telegramChannel = document.getElementById('telegram-channel').value.trim() || null;
    const facebookPageId = document.getElementById('facebook-page-id').value.trim() || null;
    const facebookVerifyToken = document.getElementById('facebook-verify-token').value.trim() || null;
    const facebookPageToken = document.getElementById('facebook-page-token').value.trim() || null;
    const facebookAppSecret = document.getElementById('facebook-app-secret').value.trim() || null;
    const aiPersona = document.getElementById('ai-persona').value.trim();
    const knowledgeBase = document.getElementById('knowledge-base').value.trim() || null;

    const payload = {
      id: clientId,
      name,
      telegram: {
        botToken: telegramToken,
        channelId: telegramChannel
      },
      facebook: {
        pageId: facebookPageId,
        verifyToken: facebookVerifyToken,
        pageAccessToken: facebookPageToken,
        appSecret: facebookAppSecret
      },
      aiPersona,
      knowledgeBase
    };

    try {
      const btn = document.getElementById('btn-save-client');
      btn.disabled = true;
      btn.textContent = 'Saving Configuration...';

      const response = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok && result.ok) {
        modal.classList.remove('active');
        loadClientsList();
      } else {
        alert(`Error: ${result.error || 'Failed to save configuration'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred while saving.');
    } finally {
      const btn = document.getElementById('btn-save-client');
      btn.disabled = false;
      btn.textContent = 'Save Configuration';
    }
  });

  // --- API Integrations ---

  // Dashboard Load
  async function loadDashboardData() {
    try {
      const response = await fetch('/api/admin/clients');
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error);

      const clients = data.clients || [];
      document.getElementById('stat-total-clients').textContent = clients.length;

      // Populate mini client list in dashboard
      const dashList = document.getElementById('dash-clients-list');
      if (clients.length === 0) {
        dashList.innerHTML = '<div class="empty-state">No clients configured. Go to Clients tab to add one!</div>';
      } else {
        dashList.innerHTML = clients.map(client => {
          const hasTg = !!client.telegram_token;
          const hasFb = !!client.facebook_page_token;
          return `
            <div class="dash-item">
              <div>
                <strong>${client.name}</strong> <span style="font-size:11px;color:var(--text-muted)">(${client.id})</span>
              </div>
              <div style="display:flex;gap:8px;align-items:center;">
                ${hasTg ? getPlatformIcon('telegram', 14) : ''}
                ${hasFb ? getPlatformIcon('facebook', 14) : ''}
              </div>
            </div>
          `;
        }).join('');
        lucide.createIcons();
      }

      // Load all chats across clients for dashboard
      let totalChats = 0;
      let tgChats = 0;
      let fbChats = 0;
      let allChats = [];

      for (const client of clients) {
        const chatRes = await fetch(`/api/admin/chats?clientId=${client.id}`);
        const chatData = await chatRes.json();
        if (chatRes.ok && chatData.ok) {
          const logs = chatData.chats || [];
          totalChats += logs.length;
          logs.forEach(log => {
            if (log.platform === 'telegram') tgChats++;
            if (log.platform === 'facebook') fbChats++;
            allChats.push({ ...log, clientName: client.name });
          });
        }
      }

      document.getElementById('stat-total-chats').textContent = totalChats;
      document.getElementById('stat-tg-chats').textContent = tgChats;
      document.getElementById('stat-fb-chats').textContent = fbChats;

      // Sort chats by date desc
      allChats.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const recentChats = allChats.slice(0, 5);

      const recentList = document.getElementById('dash-recent-chats');
      if (recentChats.length === 0) {
        recentList.innerHTML = '<div class="empty-state">No conversations recorded yet.</div>';
      } else {
        recentList.innerHTML = recentChats.map(chat => {
          const time = new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `
            <div class="dash-item dash-chat-item">
              <div class="dash-chat-meta">
                <span>${getPlatformIcon(chat.platform, 12)} ${chat.clientName} (${chat.username || 'User'})</span>
                <span>${time}</span>
              </div>
              <div class="dash-chat-text">"<em>${chat.message}</em>"</div>
              <div class="dash-chat-reply"><strong>Reply:</strong> ${chat.response || '<span style="color:var(--text-muted)">Ignored</span>'}</div>
            </div>
          `;
        }).join('');
        lucide.createIcons();
      }

    } catch (err) {
      console.error(err);
      showDbSchemaError(err);
      if (err.message.includes("API key") || err.message.includes("Invalid API key") || err.message.includes("key")) {
        document.getElementById('connection-alert').style.display = 'flex';
      }
    }
  }

  // Clients Tab Load
  async function loadClientsList() {
    const listContainer = document.getElementById('clients-list');
    listContainer.innerHTML = '<div class="loading-state"><div class="spinner"></div>Loading configured bots...</div>';

    try {
      const response = await fetch('/api/admin/clients');
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error);

      const clients = data.clients || [];
      if (clients.length === 0) {
        listContainer.innerHTML = '<div class="empty-state" style="grid-column: 1/-1">No clients found. Click "Add New Client Bot" to get started!</div>';
        return;
      }

      listContainer.innerHTML = clients.map(client => {
        const hasTg = !!client.telegram_token;
        const hasFb = !!client.facebook_page_token;
        const tgClass = hasTg ? 'active' : '';
        const fbClass = hasFb ? 'active' : '';

        return `
          <div class="client-card" data-id="${client.id}">
            <div class="client-card-header">
              <div class="client-card-title">
                <h3>${client.name}</h3>
                <span>${client.id}</span>
              </div>
              <div class="client-channels">
                <div class="channel-badge ${tgClass}">
                  ${getPlatformIcon('telegram', 14)}
                  <span>Telegram</span>
                </div>
                <div class="channel-badge ${fbClass}">
                  ${getPlatformIcon('facebook', 14)}
                  <span>Messenger</span>
                </div>
              </div>
            </div>
            
            <div class="client-persona-preview">
              ${client.ai_persona}
            </div>

            <div class="client-card-actions">
              <button class="btn btn-secondary btn-sm" onclick="editClient('${client.id}')">
                <i data-lucide="edit-2" style="width:14px;height:14px;"></i> Edit
              </button>
              ${hasTg ? `
                <button class="btn btn-secondary btn-sm" onclick="registerWebhook('${client.id}')" title="Register bot webhook with Telegram">
                  <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> Register Webhook
                </button>
              ` : ''}
              <button class="btn btn-danger btn-sm" onclick="deleteClient('${client.id}')">
                <i data-lucide="trash-2" style="width:14px;height:14px;"></i> Delete
              </button>
            </div>
          </div>
        `;
      }).join('');
      
      lucide.createIcons();
    } catch (err) {
      listContainer.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; color: var(--accent-gold)">Failed to load bots: ${err.message}</div>`;
      showDbSchemaError(err);
      if (err.message.includes("API key") || err.message.includes("Invalid API key") || err.message.includes("key")) {
        document.getElementById('connection-alert').style.display = 'flex';
      }
    }
  }

  // Edit Client Bot
  window.editClient = async (id) => {
    try {
      const response = await fetch('/api/admin/clients');
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error);

      const client = data.clients.find(c => c.id === id);
      if (!client) return;

      // Populate Form
      document.getElementById('client-id').value = client.id;
      document.getElementById('client-id').readOnly = true;
      document.getElementById('client-name').value = client.name;
      
      document.getElementById('telegram-token').value = client.telegram_token || '';
      document.getElementById('telegram-channel').value = client.telegram_channel_id || '';
      
      document.getElementById('facebook-page-id').value = client.facebook_page_id || '';
      document.getElementById('facebook-verify-token').value = client.facebook_verify_token || '';
      document.getElementById('facebook-page-token').value = client.facebook_page_token || '';
      document.getElementById('facebook-app-secret').value = client.facebook_app_secret || '';

      document.getElementById('ai-persona').value = client.ai_persona;
      document.getElementById('knowledge-base').value = client.knowledge_base || '';

      formAction.value = 'update';
      modalTitle.textContent = `Configure Bot: ${client.name}`;
      
      // Expand sections if configured
      if (client.telegram_token) document.querySelector('.icon-tg').parentElement.parentElement.classList.add('active');
      if (client.facebook_page_token) document.querySelector('.icon-fb').parentElement.parentElement.classList.add('active');

      modal.classList.add('active');
    } catch (err) {
      alert(`Error loading configuration: ${err.message}`);
    }
  };

  // Delete Client Bot
  window.deleteClient = async (id) => {
    if (!confirm(`Are you sure you want to delete bot "${id}"? This will also delete all logged chats associated with it.`)) return;

    try {
      const response = await fetch(`/api/admin/clients?id=${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        loadClientsList();
      } else {
        alert(`Error: ${data.error || 'Failed to delete client'}`);
      }
    } catch (err) {
      alert('Network error occurred.');
    }
  };

  // Register Webhook with Telegram
  window.registerWebhook = async (id) => {
    try {
      const response = await fetch(`/api/admin/register-webhook?id=${id}`, {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        alert('✅ Webhook registered successfully!');
      } else {
        alert(`❌ Webhook registration failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert('Network error occurred.');
    }
  };

  // Chats Filter Load
  async function loadChatsFilter() {
    const dropdown = document.getElementById('chat-client-select');
    dropdown.innerHTML = '<option value="">Loading bots...</option>';

    try {
      const response = await fetch('/api/admin/clients');
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error);

      const clients = data.clients || [];
      if (clients.length === 0) {
        dropdown.innerHTML = '<option value="">No bots configured</option>';
        return;
      }

      dropdown.innerHTML = '<option value="">Choose a bot...</option>' + 
        clients.map(c => `<option value="${c.id}">${c.name} (${c.id})</option>`).join('');

      dropdown.addEventListener('change', (e) => {
        const clientId = e.target.value;
        loadChatsTable(clientId);
      });
    } catch (err) {
      dropdown.innerHTML = '<option value="">Error loading bots</option>';
      showDbSchemaError(err);
    }
  }

  // Load Chats Table for specific client
  async function loadChatsTable(clientId) {
    const tbody = document.getElementById('chats-table-body');
    if (!clientId) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Select a client bot to load conversation history.</td></tr>';
      return;
    }

    tbody.innerHTML = '<tr><td colspan="5" class="loading-state"><div class="spinner"></div>Loading conversations...</td></tr>';

    try {
      const response = await fetch(`/api/admin/chats?clientId=${clientId}`);
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error);

      const chats = data.chats || [];
      if (chats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No conversations logged for this bot yet. Try sending it a message!</td></tr>';
        return;
      }

      // Sort chats by date desc
      chats.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      tbody.innerHTML = chats.map(chat => {
        const time = new Date(chat.created_at).toLocaleString();
        
        return `
          <tr>
            <td style="white-space: nowrap; font-size:12px; color:var(--text-secondary);">${time}</td>
            <td>
              <span class="chat-platform ${chat.platform === 'telegram' ? 'tg' : 'fb'}">
                ${getPlatformIcon(chat.platform, 12)}
                <span>${chat.platform === 'telegram' ? 'Telegram' : 'Messenger'}</span>
              </span>
            </td>
            <td>
              <strong>${chat.username || 'User'}</strong>
              <div style="font-size:11px;color:var(--text-muted)">ID: ${chat.user_id}</div>
            </td>
            <td style="color:var(--text-primary);">"${chat.message}"</td>
            <td style="color:var(--accent-cyan);">
              ${chat.response ? `"${chat.response}"` : '<span style="color:var(--text-muted);font-style:italic;">Ignored (Spam/Off-topic)</span>'}
            </td>
          </tr>
        `;
      }).join('');
      
      lucide.createIcons();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state" style="color:red">Failed to load chat history: ${err.message}</td></tr>`;
      showDbSchemaError(err);
    }
  }

  // System Status Load
  async function loadSystemStatus() {
    try {
      const response = await fetch('/api/admin/status');
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error();

      const geminiStatus = document.getElementById('env-gemini-status');
      const geminiIndicator = document.getElementById('env-gemini-indicator');
      const supabaseStatus = document.getElementById('env-supabase-status');
      const supabaseIndicator = document.getElementById('env-supabase-indicator');
      const urlStatus = document.getElementById('env-url-status');

      if (data.geminiKeyConfigured) {
        geminiStatus.textContent = 'Configured (Active)';
        geminiStatus.className = 'status-text text-green';
        geminiIndicator.className = 'cred-dot-indicator green';
        document.getElementById('status-gemini').innerHTML = '<span class="status-dot green"></span><span>Gemini 2.5 Active</span>';
      } else {
        geminiStatus.textContent = 'Missing GEMINI_API_KEY';
        geminiStatus.className = 'status-text text-red';
        geminiIndicator.className = 'cred-dot-indicator red';
        document.getElementById('status-gemini').innerHTML = '<span class="status-dot orange"></span><span>Gemini Unconfigured</span>';
      }

      if (data.supabaseConfigured) {
        supabaseStatus.textContent = `Connected to database (URL: ${data.supabaseUrl})`;
        supabaseStatus.className = 'status-text text-green';
        supabaseIndicator.className = 'cred-dot-indicator green';
        document.getElementById('status-db').innerHTML = '<span class="status-dot green"></span><span>Supabase Active</span>';
      } else {
        supabaseStatus.textContent = 'Missing Supabase Credentials';
        supabaseStatus.className = 'status-text text-red';
        supabaseIndicator.className = 'cred-dot-indicator red';
        document.getElementById('status-db').innerHTML = '<span class="status-dot orange"></span><span>Supabase Disconnected</span>';
      }

      urlStatus.textContent = data.appUrl || 'Not set (using fallback hostname)';

    } catch (err) {
      console.error('Failed to get status check', err);
    }
  }

  // Initial Load
  loadDashboardData();
  loadSystemStatus();
});
