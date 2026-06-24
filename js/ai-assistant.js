// AI 代码助手 — 使用 Claude API 解释项目与代码
const AiAssistant = (() => {
  let context = { path: '', name: '', code: '' };
  let apiKey = '';
  let messages = [];
  let chatVisible = false;

  const CHAT_MODEL = 'claude-sonnet-4-6';

  function setContext(path, name, code) {
    context = { path, name, code: code ? code.substring(0, 8000) : '' };
    // 更新按钮提示
    const btn = document.getElementById('ai-chat-btn');
    if (btn && name) btn.title = 'AI 助手 — 当前文件: ' + name;
  }

  function loadApiKey() {
    apiKey = localStorage.getItem('_ai_api_key') || '';
    if (apiKey) {
      document.getElementById('ai-key-input').value = apiKey;
      document.getElementById('ai-key-section').style.display = 'none';
      document.getElementById('ai-chat-section').style.display = '';
    }
  }

  function saveApiKey(key) {
    apiKey = key;
    localStorage.setItem('_ai_api_key', key);
    document.getElementById('ai-key-section').style.display = 'none';
    document.getElementById('ai-chat-section').style.display = '';
  }

  function clearApiKey() {
    localStorage.removeItem('_ai_api_key');
    apiKey = '';
    document.getElementById('ai-key-section').style.display = '';
    document.getElementById('ai-chat-section').style.display = 'none';
  }

  async function sendMessage() {
    const input = document.getElementById('ai-msg-input');
    const text = input.value.trim();
    if (!text || !apiKey) return;

    input.value = '';
    addBubble('user', text);

    // 构建系统提示
    let system = '你是一个编程助手，帮助用户理解 MATLAB/Python 项目和代码。用中文回答，简明扼要。';
    if (context.name && text.includes('代码') || text.includes('这行') || text.includes('这段')) {
      system += `\n\n用户正在查看文件 "${context.path}"，以下是文件内容片段:\n\`\`\`\n${context.code.substring(0, 6000)}\n\`\`\``;
    } else if (context.name) {
      system += `\n\n用户当前在浏览项目文件: "${context.path}"`;
    }

    const userMsg = { role: 'user', content: text };
    messages.push(userMsg);

    const typing = addBubble('assistant', '<em>思考中...</em>');

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: CHAT_MODEL,
          max_tokens: 1024,
          system: system,
          messages: messages.slice(-10)
        })
      });

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`API 错误 ${resp.status}: ${err.substring(0,200)}`);
      }

      const data = await resp.json();
      const reply = data.content[0].text;
      typing.innerHTML = formatReply(reply);
      messages.push({ role: 'assistant', content: reply });
    } catch(e) {
      typing.innerHTML = '<span style="color:#c0392b;">请求失败: ' + e.message + '</span>';
    }
    document.getElementById('ai-chat-body').scrollTop = 99999;
  }

  function addBubble(role, html) {
    const body = document.getElementById('ai-chat-body');
    const div = document.createElement('div');
    div.className = 'chat-bubble chat-' + role;
    div.innerHTML = html;
    body.appendChild(div);
    body.scrollTop = 99999;
    return div;
  }

  function formatReply(text) {
    let t = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    t = t.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="chat-code">$2</pre>');
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\n/g, '<br>');
    return t;
  }

  function toggle() {
    const panel = document.getElementById('ai-panel');
    chatVisible = !chatVisible;
    if (chatVisible) { panel.classList.add('show'); loadApiKey(); }
    else panel.classList.remove('show');
  }

  function init() {
    document.getElementById('ai-chat-btn').addEventListener('click', toggle);
    document.getElementById('ai-panel-close').addEventListener('click', () => {
      document.getElementById('ai-panel').classList.remove('show');
      chatVisible = false;
    });
    document.getElementById('ai-key-save').addEventListener('click', () => {
      saveApiKey(document.getElementById('ai-key-input').value.trim());
    });
    document.getElementById('ai-key-clear').addEventListener('click', clearApiKey);
    document.getElementById('ai-msg-send').addEventListener('click', sendMessage);
    document.getElementById('ai-msg-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    // 快捷提问按钮
    document.getElementById('ai-quick-explain').addEventListener('click', () => {
      const input = document.getElementById('ai-msg-input');
      input.value = '简要介绍一下这个项目是做什么的';
      sendMessage();
    });
    document.getElementById('ai-quick-code').addEventListener('click', () => {
      const input = document.getElementById('ai-msg-input');
      input.value = '解释一下当前这段代码的核心逻辑';
      sendMessage();
    });
  }

  return { init, setContext, toggle };
})();
