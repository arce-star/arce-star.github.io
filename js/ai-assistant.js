// AI 代码助手 — USTC API (OpenAI 协议)
const AiAssistant = (() => {
  let context = { path: '', name: '', code: '' };
  let messages = [];

  const API_URL = 'https://api.llm.ustc.edu.cn/v1/chat/completions';

  const MODELS = [
    { id: 'deepseek-v4-flash-ascend', label: 'DeepSeek Flash (快)' },
    { id: 'deepseek-v4-pro', label: 'DeepSeek Pro' },
    { id: 'qwen-chat', label: 'Qwen Chat' },
    { id: 'qwen-reasoner', label: 'Qwen Reasoner' },
    { id: 'qwen3.6-chat', label: 'Qwen 3.6 Chat' },
    { id: 'qwen3.6-reasoner', label: 'Qwen 3.6 Reasoner' },
    { id: 'glm-chat', label: 'GLM Chat' },
    { id: 'glm-5.2', label: 'GLM 5.2' },
    { id: 'glm-reasoner', label: 'GLM Reasoner' },
    { id: 'smart/default', label: 'Smart 默认' },
    { id: 'smart/reasoning', label: 'Smart 推理' }
  ];

  function getModel() {
    return localStorage.getItem('_ai_model') || 'deepseek-v4-flash-ascend';
  }

  function setModel(id) {
    localStorage.setItem('_ai_model', id);
  }

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

  function setContext(path, name, code, isDir, fileList) {
    context = {
      path, name,
      code: code ? code.substring(0, 6000) : '',
      isDir: !!isDir,
      files: fileList || ''
    };
    // 更新上下文显示栏
    const bar = document.getElementById('ai-context-bar');
    const text = document.getElementById('ai-context-text');
    if (bar && text) {
      if (path) {
        bar.style.display = '';
        text.innerHTML = (isDir ? '📁 ' : '📄 ') + path;
      } else {
        bar.style.display = 'none';
      }
    }
    const btn = document.getElementById('ai-chat-btn');
    if (btn && name) btn.title = 'AI 助手 — ' + name;
  }

  async function sendMessage(overrideText) {
    const input = document.getElementById('ai-msg-input');
    const text = overrideText || input.value.trim();
    if (!text) return;
    input.value = '';

    addBubble('user', text);

    let system = '你是编程助手，帮助用户理解 MATLAB/Python 项目和代码。用中文回答，简明扼要。';

    // 解释代码: 带上当前文件代码
    if (context.code && (text.includes('代码') || text.includes('这段') || text.includes('解释'))) {
      system += '\n\n用户正在查看文件 "' + context.path + '"，以下是完整代码。请解释这段代码的核心逻辑:\n```\n' + context.code + '\n```';
    }
    // 介绍项目: 带上目录结构
    else if (text.includes('项目') || text.includes('介绍')) {
      if (context.files) {
        system += '\n\n用户当前在项目目录 "' + (context.path || '根目录') + '"，该目录包含以下文件/子目录:\n' + context.files;
      }
      if (context.code && context.name.endsWith('.md')) {
        system += '\n\n该目录的 README 内容:\n```\n' + context.code.substring(0, 4000) + '\n```';
      }
      system += '\n\n请根据目录结构和README内容，介绍这个项目是做什么的。';
    }
    // 一般情况: 告知当前浏览的文件
    else if (context.name) {
      system += '\n\n用户当前在浏览: "' + context.path + '"';
      if (context.isDir) system += '（这是一个目录）';
    }

    const typing = addBubble('assistant', '<em>思考中...</em>');

    const msgs = [{ role: 'system', content: system }];
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
          model: getModel(),
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
    t = t.replace(/^### (.+)$/gm, '<strong>$1</strong>');
    t = t.replace(/^## (.+)$/gm, '<strong>$1</strong>');
    return t;
  }

  function $(id) { return document.getElementById(id); }

  function init() {
    if (!$('ai-chat-btn')) return;
    // 初始化模型选择器
    const sel = $('ai-model-select');
    MODELS.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id; opt.textContent = m.label;
      sel.appendChild(opt);
    });
    sel.value = getModel();
    sel.addEventListener('change', () => {
      setModel(sel.value);
      messages = []; // 切换模型清空上下文
    });

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
