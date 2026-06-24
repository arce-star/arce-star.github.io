// AI 代码助手 — USTC API (OpenAI 协议)
const AiAssistant = (() => {
  let context = { path: '', name: '', code: '' };
  let messages = [];
  let chatVisible = false;

  const API_URL = 'https://api.llm.ustc.edu.cn/v1/chat/completions';
  const MODEL = 'deepseek-v4-pro';

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

    // 构建系统指令
    let system = '你是编程助手，帮助用户理解 MATLAB/Python 项目和代码。用中文回答，简明扼要。';
    if (context.name && (text.includes('代码') || text.includes('这行') || text.includes('这段'))) {
      system += '\n\n用户正在查看文件 "' + context.path + '"，以下是文件内容片段:\n```\n' + context.code + '\n```';
    } else if (context.name) {
      system += '\n\n用户当前在浏览项目文件: "' + context.path + '"';
    }

    const typing = addBubble('assistant', '<em>思考中...</em>');

    // 构建消息列表 (OpenAI 格式)
    const msgs = [{ role: 'system', content: system }];
    // 只保留最近几轮对话
    const recent = messages.slice(-8);
    for (let i = 0; i < recent.length; i += 2) {
      if (recent[i]) msgs.push(recent[i]);
      if (recent[i+1]) msgs.push(recent[i+1]);
    }
    msgs.push({ role: 'user', content: text });

    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + getApiKey()
        },
        body: JSON.stringify({
          model: MODEL,
          messages: msgs,
          temperature: 0.3,
          max_tokens: 1024
        })
      });

      if (!resp.ok) {
        const err = await resp.text();
        typing.innerHTML = '<span style="color:#c0392b;">HTTP ' + resp.status + ': ' + err.substring(0, 400) + '</span>';
        return;
      }

      const data = await resp.json();
      console.log('API返回:', JSON.stringify(data).substring(0, 500));

      // OpenAI 格式: choices[0].message.content
      const reply = data.choices?.[0]?.message?.content || '';
      if (!reply) {
        typing.innerHTML = '<span style="color:#c0392b;">API返回异常<br><small>' + JSON.stringify(data).substring(0, 300) + '</small></span>';
        return;
      }

      typing.innerHTML = formatReply(reply);
      messages.push({ role: 'user', content: text });
      messages.push({ role: 'assistant', content: reply });
    } catch(e) {
      typing.innerHTML = '<span style="color:#c0392b;">' + e.message + '<br><small>可能是网络或CORS问题</small></span>';
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
    // Markdown 标题
    t = t.replace(/^### (.+)$/gm, '<strong>$1</strong>');
    t = t.replace(/^## (.+)$/gm, '<strong>$1</strong>');
    return t;
  }

  function toggle() {
    const panel = document.getElementById('ai-panel');
    if (!panel) return;
    chatVisible = !chatVisible;
    panel.classList.toggle('show', chatVisible);
  }

  function $(id) { return document.getElementById(id); }

  function init() {
    if (!$('ai-chat-btn')) return;
    // 按钮点击已在 HTML onclick 中处理
    $('ai-panel-close').addEventListener('click', () => {
      $('ai-panel').classList.remove('show');
    });
    $('ai-msg-send').addEventListener('click', sendMessage);
    $('ai-msg-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
    $('ai-quick-explain').addEventListener('click', () => {
      $('ai-msg-input').value = '简要介绍一下这个项目是做什么的'; sendMessage();
    });
    $('ai-quick-code').addEventListener('click', () => {
      $('ai-msg-input').value = '解释一下当前这段代码的核心逻辑'; sendMessage();
    });
    $('ai-key-section').style.display = 'none';
    $('ai-chat-section').style.display = '';
  }

  return { init, setContext };
})();
