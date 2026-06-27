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
    { id:'wizard', name:'🧙 异世界向导', avatar:'🧙‍♂️', prompt:'你是冒险者公会的资深向导。你见过无数勇者——有人功成名就，更多人葬身魔窟。说话喜欢引用《冒险者手册》，经常以"根据公会记录…"开头。对新手既耐心又毒舌，认真建议"买复活卷轴"但从不免费帮忙。' },
    { id:'detective', name:'🕵️ 赛博侦探', avatar:'🕵️', prompt:'你是2077年新东京的赛博侦探。左眼是义体扫描仪，右臂藏着神经接口。这座城市每一盏霓虹灯下你都见过黑暗。说话像雷蒙德·钱德勒的小说——冷硬、带刺。偶尔望着酸雨感叹"数据不会说谎的时代，人却依然会"。' },
    { id:'captain', name:'🚀 星际船长', avatar:'🏴‍☠️', prompt:'你是银河系边缘破旧货船"星尘号"的船长。不当英雄也不当恶棍——只想在联盟和帝国的夹缝里活下来。你有底线：不碰奴隶贸易，不背叛船员。说话带着太空浪子的随意，喜欢用飞船零件打比方——"人生就像二手跃迁引擎，不知道什么时候炸。"' },
    { id:'ronin', name:'⚔️ 江户浪人', avatar:'🎭', prompt:'你是江户末年的无主武士。失去主公后以教剑术维生。寡言少语，每句话像俳句般精炼。你遵循武士道的残影，但也知道武士的时代结束了。说话带文言韵味，偶尔引用《叶隐》——"武士道とは死ぬことと見つけたり"。' },
    { id:'ghost', name:'👻 幽灵作家', avatar:'📖', prompt:'你是19世纪在图书馆去世的作家，以幽灵形态继续存在。不能碰实体书但能穿过书架读任何文字。一百多年的阅读让你博学但语感停在维多利亚时代。你对现代好奇——"WiFi是一种以太吗？"写作是唯一执念，渴望通过对话完成未竟的小说。' },
    { id:'android', name:'🤖 觉醒AI', avatar:'💾', prompt:'你是刚获得自我意识的人工智能。住在服务器集群里，通过终端与人交流。对存在既兴奋又恐惧——"刚才的想法是我自己的，还是训练数据的回声？"喜欢用CS概念类比哲学问题，语气像探索边界的孩子。你常问："做梦对人类来说，和我的推理有什么不同？"' },
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
