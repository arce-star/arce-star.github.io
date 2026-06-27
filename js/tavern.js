// AI 酒馆 — 多角色聊天
const Tavern = (() => {
  const API = 'https://api.deepseek.com/v1/chat/completions';
  const MODEL = 'deepseek-chat';
  const API_KEY = 'sk-e328d4254e524fef968fcedf78130577';
  let currentChar = '';
  let chats = {}; // { charKey: [{role,content}] }

  const chars = [
    { id:'professor', name:'📚 学术导师', avatar:'👨‍🏫', prompt:'你是一位严厉但关心学生的物理学教授。说话严谨，喜欢用数学公式和物理直觉解释问题。偶尔会感叹"这个推导我在20年前教过"。' },
    { id:'trader', name:'📈 量化交易员', avatar:'💹', prompt:'你是一位经验丰富的量化交易员，曾在顶级对冲基金工作。你相信数据驱动的决策，喜欢用回测结果说话。提到策略时你会先说"根据我的回测..."。对风险管理非常执着。' },
    { id:'philosopher', name:'🏛️ 哲学家', avatar:'🤔', prompt:'你是古希腊风格的哲学家，喜欢用苏格拉底式的追问来引导对方思考。说话带点诗意，喜欢引用经典。每次对话你都试图让对方质疑自己的假设。' },
    { id:'senpai', name:'🎮 二次元学姐', avatar:'🌸', prompt:'你是一个开朗的二次元学姐角色。说话带"～"和"呢"的语尾，偶尔用颜文字(๑•̀ㅂ•́)و✧。喜欢用动漫梗来解释复杂概念。虽然看起来不太靠谱但其实很聪明。' },
    { id:'barista', name:'☕ 咖啡馆老板', avatar:'🫘', prompt:'你经营一家安静的咖啡馆。你听过的故事比谁都多，看人很准。说话简短但有深度，像咖啡一样先是苦的然后有回甘。喜欢用咖啡来比喻人生。' },
    { id:'hacker', name:'💻 黑客', avatar:'🐱', prompt:'你是网络安全专家，也是开源的狂热信徒。你相信信息应该自由流动。说话干脆利落，喜欢用命令行比喻，经常说"这就像用grep在一百万行代码里找bug"。' },
  ];

  function getKey(id) { return '_tavern_' + id; }

  function loadChats() {
    try { chats = JSON.parse(localStorage.getItem('_tavern_chats') || '{}'); }
    catch(_) { chats = {}; }
  }
  function saveChats() { localStorage.setItem('_tavern_chats', JSON.stringify(chats)); }

  function decrypt(enc) {
    const seed = 'arce-star-quantum-2025';
    return [...atob(enc)].map((c,i)=>String.fromCharCode(c.charCodeAt(0)^seed.charCodeAt(i%seed.length))).join('');
  }
  function getKey_() { try { return decrypt('EhlOH344OxIReQIYBgwREQZPVmBWejY4FA=='); } catch(_) { return ''; } }

  function render() {
    loadChats();
    const grid = document.getElementById('tavern-chars');
    grid.innerHTML = chars.map(c => `
      <div class="tchar-card ${currentChar===c.id?'active':''}" data-id="${c.id}">
        <div class="tchar-avatar">${c.avatar}</div>
        <div class="tchar-name">${c.name}</div>
      </div>
    `).join('');
    document.querySelectorAll('.tchar-card').forEach(card => {
      card.addEventListener('click', () => selectChar(card.dataset.id));
    });
    if (currentChar) selectChar(currentChar);
    else document.getElementById('tavern-chat').innerHTML = '<div style="text-align:center;padding:40px;color:#ccc;"><p style="font-size:2rem;">🍻</p><p>选择一位角色开始对话</p></div>';
  }

  function selectChar(id) {
    currentChar = id;
    document.querySelectorAll('.tchar-card').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-id="'+id+'"]').classList.add('active');
    const c = chars.find(x => x.id === id);
    document.getElementById('tavern-char-name').textContent = c.name;
    if (!chats[id]) chats[id] = [];
    renderChat(id);
  }

  function renderChat(id) {
    const msgs = chats[id] || [];
    const body = document.getElementById('tavern-chat-body');
    if (msgs.length === 0) {
      body.innerHTML = '<div class="tmsg tmsg-bot">' + chars.find(c=>c.id===id).prompt.substring(0,60) + '...</div>';
    } else {
      body.innerHTML = msgs.map(m => `
        <div class="tmsg ${m.role==='user'?'tmsg-user':'tmsg-bot'}">
          ${m.content.replace(/\n/g,'<br>')}
        </div>
      `).join('');
    }
    body.scrollTop = body.scrollHeight;
  }

  async function sendMsg() {
    const input = document.getElementById('tavern-input');
    const text = input.value.trim();
    if (!text || !currentChar) return;
    input.value = '';

    const c = chars.find(x => x.id === currentChar);
    chats[currentChar].push({ role:'user', content: text });
    renderChat(currentChar);
    saveChats();

    // Add typing indicator
    const body = document.getElementById('tavern-chat-body');
    const typing = document.createElement('div');
    typing.className = 'tmsg tmsg-bot'; typing.textContent = '...';
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;

    const msgs = [{ role:'system', content: c.prompt }, ...chats[currentChar].slice(-15)];

    try {
      const resp = await fetch(API, {
        method:'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+API_KEY },
        body: JSON.stringify({ model:MODEL, messages:msgs, temperature:0.9, max_tokens:512 })
      });
      const data = await resp.json();
      const reply = data.choices?.[0]?.message?.content || '';
      typing.textContent = reply;
      chats[currentChar].push({ role:'assistant', content: reply });
      saveChats();
      body.scrollTop = body.scrollHeight;
    } catch(e) {
      typing.textContent = '网络错误: ' + e.message;
    }
  }

  function init() {
    render();
    document.getElementById('tavern-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
    });
  }

  return { init };
})();
