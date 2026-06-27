document.addEventListener('DOMContentLoaded', () => {
  // Init Lucide icons
  lucide.createIcons();

  // Tab State
  let activeTab = 'dashboard';

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
              <div style="display:flex;gap:8px;">
                ${hasTg ? '<i data-lucide="send" class="icon-tg" style="width:14px;color:#0088cc;"></i>' : ''}
                ${hasFb ? '<i data-lucide="facebook" class="icon-fb" style="width:14px;color:#1877f2;"></i>' : ''}
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
          const platformIcon = chat.platform === 'telegram' ? 'send' : 'facebook';
          const platformColor = chat.platform === 'telegram' ? '#0088cc' : '#1877f2';
          return `
            <div class="dash-item dash-chat-item">
              <div class="dash-chat-meta">
                <span><i data-lucide="${platformIcon}" style="width:12px;height:12px;color:${platformColor};display:inline-block;vertical-align:middle;"></i> ${chat.clientName} (${chat.username || 'User'})</span>
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
                  <i data-lucide="send" class="icon-tg"></i>
                  <span>Telegram</span>
                </div>
                <div class="channel-badge ${fbClass}">
                  <i data-lucide="facebook" class="icon-fb"></i>
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
        const platIcon = chat.platform === 'telegram' ? 'send' : 'facebook';
        const platColor = chat.platform === 'telegram' ? '#0088cc' : '#1877f2';
        
        return `
          <tr>
            <td style="white-space: nowrap; font-size:12px; color:var(--text-secondary);">${time}</td>
            <td>
              <span class="chat-platform ${chat.platform === 'telegram' ? 'tg' : 'fb'}">
                <i data-lucide="${platIcon}" style="width:12px;height:12px;color:${platColor}"></i>
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
