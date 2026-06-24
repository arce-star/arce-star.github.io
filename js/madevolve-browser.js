// MadEvolve 项目浏览器
const MadEvolveBrowser = (() => {
  const API = 'https://api.github.com/repos/arce-star/MadEvolve-Item-appearance/contents';
  const RAW = 'https://raw.githubusercontent.com/arce-star/MadEvolve-Item-appearance/master';
  let currentPath = '';

  const IMG = ['png','jpg','jpeg','gif','svg','webp','bmp'];
  const BIN = ['xlsx','xls','csv','mat','fig','pdf','zip','tar','gz','pkl','h5','pt','json'];

  function extOf(n) { return (n||'').split('.').pop().toLowerCase(); }

  function highlightCode(code, lang) {
    let esc = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const lines = esc.split('\n');
    let html = '';
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (lang === 'python') line = line.replace(/(#[^\n]*)/g, '<span class="hl-comment">$1</span>');
      line = line.replace(/('[^']*')/g, '<span class="hl-string">$1</span>');
      line = line.replace(/("[^"]*")/g, '<span class="hl-string">$1</span>');
      line = line.replace(/\b(def|class|if|elif|else|for|while|try|except|with|as|import|from|return|True|False|None|and|or|not|in|is|pass|break|continue)\b/g, '<span class="hl-keyword">$1</span>');
      line = line.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');
      html += `<span class="line-num">${i+1}</span><span class="line-code">${line}</span>\n`;
    }
    return html;
  }

  function renderMD(text) {
    let h = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    h = h.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    // 可折叠块: +++ 标题 ... +++
    h = h.replace(/^\+\+\+ (.+)$\n([\s\S]*?)^\+\+\+$/gm, '<details class="fold-block"><summary>$1</summary>$2</details>');
    // 代码块: 支持有无语言标签、有无换行
    h = h.replace(/```(\w*)\n?([\s\S]*?)```/g, function(m, lang, code) {
      return '<pre class="md-code">' + code.replace(/^\n/, '') + '</pre>';
    });
    h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // 表格: 检测连续的 | 行
    h = h.replace(/((?:^\|.+\|\n?)+)/gm, function(match) {
      const rows = match.trim().split('\n');
      if (rows.length < 2) return match;
      let table = '<table class="md-table">';
      rows.forEach((row, i) => {
        const cells = row.split('|').filter(c => c.trim() !== '');
        const tag = i === 0 ? 'th' : 'td';
        // 跳过分隔行
        if (cells.every(c => /^[-:]+$/.test(c.trim()))) return;
        table += '<tr>';
        cells.forEach(c => { table += `<${tag}>${c.trim()}</${tag}>`; });
        table += '</tr>';
      });
      table += '</table>';
      return table;
    });

    // 分割线
    h = h.replace(/^[-*_]{3,}\s*$/gm, '<hr>');

    // 引用块: 连续的 > 行
    h = h.replace(/((?:^&gt;.*\n?)+)/gm, function(match) {
      const lines = match.split('\n').filter(l => l.trim());
      const content = lines.map(l => l.replace(/^&gt;\s?/, '')).join('\n');
      return '<blockquote>' + content + '</blockquote>';
    });

    // 任务列表 [x] / [ ]
    h = h.replace(/^[\-\*] \[(x| )\] (.+)$/gm, function(m, checked, text) {
      return checked === 'x' ? '<li class="task-done">✅ ' + text + '</li>'
                             : '<li class="task-pending">☐ ' + text + '</li>';
    });

    // 标题
    h = h.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    h = h.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    h = h.replace(/^# (.+)$/gm, '<h2>$1</h2>');

    // 粗体/斜体
    h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 链接
    h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // 无序列表
    h = h.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    h = h.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // 段落
    h = h.replace(/\n\n/g, '</p><p>');
    return '<p>' + h + '</p>';
  }

  async function fetchContents(path) {
    const url = (path ? `${API}/${path}` : API) + '?t=' + Date.now();
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  }

  async function fetchText(path) {
    const resp = await fetch(`${RAW}/${path}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.text();
  }

  function renderTree(entries, container, depth) {
    container.innerHTML = '';
    if (depth > 0) {
      const back = document.createElement('div');
      back.className = 'tree-item tree-back';
      back.innerHTML = '<i class="fas fa-arrow-left"></i> 返回上级';
      back.addEventListener('click', () => navigateUp());
      container.appendChild(back);
    }
    const dirs = entries.filter(e => e.type === 'dir').sort((a,b) => a.name.localeCompare(b.name));
    const files = entries.filter(e => e.type === 'file').sort((a,b) => a.name.localeCompare(b.name));
    for (const e of [...dirs, ...files]) {
      const div = document.createElement('div');
      div.className = 'tree-item';
      const isDir = e.type === 'dir';
      const ext = extOf(e.name);
      let icon = isDir ? 'fa-folder' : 'fa-file-code';
      if (!isDir) {
        if (ext === 'md') icon = 'fa-file-alt';
        else if (IMG.includes(ext)) icon = 'fa-file-image';
      }
      div.innerHTML = `<i class="fas ${icon}"></i> ${e.name}`;
      div.addEventListener('click', () => { isDir ? navigateInto(e.path) : openFile(e.path, e.name); });
      container.appendChild(div);
    }
  }

  async function navigateInto(path) {
    currentPath = path;
    const tree = document.getElementById('madevolve-tree');
    tree.innerHTML = '<div class="tree-loading">加载中...</div>';
    try {
      const entries = await fetchContents(path);
      renderTree(entries, tree, path.split('/').length);
    } catch(e) { tree.innerHTML = '<div class="tree-error">加载失败: ' + e.message + '</div>'; }
  }

  async function navigateUp() {
    if (!currentPath) return;
    const parts = currentPath.split('/'); parts.pop();
    const parent = parts.join('/');
    if (!parent) { loadRoot(); return; }
    currentPath = parent;
    const tree = document.getElementById('madevolve-tree');
    try {
      const entries = await fetchContents(parent);
      renderTree(entries, tree, parent.split('/').length);
    } catch(e) { tree.innerHTML = '<div class="tree-error">加载失败: ' + e.message + '</div>'; }
  }

  async function openFile(path, name) {
    const viewer = document.getElementById('madevolve-viewer');
    const ext = extOf(name);
    document.getElementById('madevolve-file-name').textContent = name;
    document.getElementById('madevolve-file-path').textContent = path;

    if (IMG.includes(ext)) {
      viewer.innerHTML = `<div style="text-align:center;padding:20px;"><img src="${RAW}/${path}" style="max-width:100%;max-height:480px;border-radius:4px;"></div>`;
      return;
    }
    if (BIN.includes(ext)) {
      viewer.innerHTML = `<div style="text-align:center;padding:40px;color:#888;"><i class="fas fa-download" style="font-size:2rem;display:block;margin-bottom:8px;"></i><p>${name}</p><a href="${RAW}/${path}" target="_blank" style="color:var(--blue);">下载文件</a></div>`;
      return;
    }
    viewer.innerHTML = '<div class="tree-loading">加载中...</div>';
    try {
      const text = await fetchText(path);
      if (ext === 'md') {
        viewer.innerHTML = `<div class="md-preview">${renderMD(text)}</div>`;
      } else {
        const lang = ext === 'py' ? 'python' : '';
        viewer.innerHTML = `<pre class="code-block">${highlightCode(text, lang)}</pre>`;
      }
    } catch(e) { viewer.innerHTML = '<div class="tree-error">加载失败: ' + e.message + '</div>'; }
  }

  async function loadRoot() {
    currentPath = '';
    const tree = document.getElementById('madevolve-tree');
    tree.innerHTML = '<div class="tree-loading">加载中...</div>';
    try {
      const entries = await fetchContents('');
      renderTree(entries, tree, 0);
      const readme = entries.find(e => e.name.toLowerCase() === 'readme.md');
      if (readme) openFile(readme.path, readme.name);
    } catch(e) {
      const msg = e.message.includes('403') ? 'GitHub API 限流 (60次/小时)，请稍后再试' : e.message;
      tree.innerHTML = '<div class="tree-error">加载失败: ' + msg + '</div>';
    }
  }

  return { loadRoot };
})();
