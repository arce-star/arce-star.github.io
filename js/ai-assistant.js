// AI 代码助手 — USTC API (Anthropic 协议)
const AiAssistant = (() => {
  let context = { path: '', name: '', code: '' };
  let messages = [];
  let chatVisible = false;

  const API_URL = 'https://api.llm.ustc.edu.cn/v1/messages';
  const MODEL = 'qwen-chat';

  function decrypt(encB64) {
    const seed = 'arce-star-quantum-2025';
    const bytes = atob(encB64);
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      out += String.fromCharCode(bytes.charCodeAt(i) ^ seed.charCodeAt(i % seed.length));
    }
    return out;
  }

  function getApiKey() {
    try { return decrypt('EhlOH344OxIReQIYBgwREQZPVmBWejY4FA=='); }
    catch(_) { return ''; }
  }

  function setContext(path, name, code) {
    context = { path, name, code: code ? code.substring(0, 6000) : '' };
    const btn = document.getElementById('ai-chat-btn');
    if (btn && name) btn.title = 'AI 助手 — ' + name;
  }

  async function sendMessage() {
    const input = document.getElementById('ai-msg-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    addBubble('user', text);

    let system = '你是编程助手，帮助用户理解 MATLAB/Python 项目和代码。用中文回答，简明扼要。';
    if (context.name && (text.includes('代码') || text.includes('这行') || text.includes('这段'))) {
      system += `\n\n用户正在查看文件 "${context.path}"，以下是文件内容片段:\n\`\`\`\n${context.code}\n\`\`\``;
    } else if (context.name) {
      system += `\n\n用户当前在浏览项目文件: "${context.path}"`;
    }

    const typing = addBubble('assistant', '<em>思考中...</em>');
    try {
      // 将 system prompt 放进消息列表（兼容不支持 system 参数的代理）
      const payload = {
        model: MODEL,
        max_tokens: 1024,
        messages: [
          { role: 'user', content: '[系统指令] ' + system },
          ...messages.slice(-10),
          { role: 'user', content: text }
        ]
      };

      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + getApiKey(),
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`${resp.status}: ${err.substring(0,300)}`);
      }

      const data = await resp.json();
      // 兼容不同响应格式
      let reply = '';
      if (data.content && data.content[0]) {
        reply = data.content[0].text || '';
      } else if (data.choices && data.choices[0]) {
        reply = data.choices[0].message?.content || data.choices[0].text || '';
      } else if (data.response) {
        reply = data.response;
      } else if (typeof data === 'string') {
        reply = data;
      }
      if (!reply) {
        console.log('API response:', JSON.stringify(data).substring(0, 500));
        throw new Error('响应格式异常，请查看控制台');
      }
      typing.innerHTML = formatReply(reply);
      messages.push({ role: 'user', content: text });
      messages.push({ role: 'assistant', content: reply });
    } catch(e) {
      typing.innerHTML = '<span style="color:#c0392b;">请求失败: ' + e.message + '</span>';
      console.error('AI Assistant error:', e);
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
    if (chatVisible) panel.classList.add('show');
    else panel.classList.remove('show');
  }

  function init() {
    document.getElementById('ai-chat-btn').addEventListener('click', toggle);
    document.getElementById('ai-panel-close').addEventListener('click', () => {
      document.getElementById('ai-panel').classList.remove('show');
      chatVisible = false;
    });
    document.getElementById('ai-msg-send').addEventListener('click', sendMessage);
    document.getElementById('ai-msg-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
    document.getElementById('ai-quick-explain').addEventListener('click', () => {
      document.getElementById('ai-msg-input').value = '简要介绍一下这个项目是做什么的';
      sendMessage();
    });
    document.getElementById('ai-quick-code').addEventListener('click', () => {
      document.getElementById('ai-msg-input').value = '解释一下当前这段代码的核心逻辑';
      sendMessage();
    });
    // 直接显示聊天区，无需配置 API Key
    document.getElementById('ai-key-section').style.display = 'none';
    document.getElementById('ai-chat-section').style.display = '';
  }

  return { init, setContext };
})();
