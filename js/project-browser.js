// MATLAB 项目浏览器 — 从 GitHub API 加载
const ProjectBrowser = (() => {
  const API = 'https://api.github.com/repos/arce-star/matlab-modeling-works/contents';
  const RAW = 'https://raw.githubusercontent.com/arce-star/matlab-modeling-works/main';

  let currentPath = '';

  const KW = {
    matlab: ['function','end','if','else','elseif','for','while','switch','case','otherwise','try','catch','return','break','continue','global','persistent','classdef','properties','methods','events','arguments','true','false'],
    python: ['def','class','if','elif','else','for','while','try','except','finally','with','as','import','from','return','yield','lambda','True','False','None','and','or','not','in','is','pass','break','continue','raise','global','nonlocal'],
  };

  const IMG_EXT = ['png','jpg','jpeg','gif','svg','webp','bmp','ico','tiff'];
  const BIN_EXT = ['xlsx','xls','csv','mat','fig','pdf','doc','docx','ppt','pptx','zip','tar','gz','mlx','slx'];

  function extOf(name) { return (name||'').split('.').pop().toLowerCase(); }

  function guessLang(filename) {
    const ext = extOf(filename);
    if (['m','mat'].includes(ext)) return 'matlab';
    if (['py'].includes(ext)) return 'python';
    if (['c','cpp','h','hpp'].includes(ext)) return 'c';
    if (['js','jsx'].includes(ext)) return 'js';
    if (['html','htm'].includes(ext)) return 'html';
    if (['css'].includes(ext)) return 'css';
    if (['json'].includes(ext)) return 'json';
    return '';
  }

  function highlightCode(code, lang) {
    let escaped = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    if (!lang) return escaped;
    const lines = escaped.split('\n');
    let html = '';
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (lang === 'matlab') line = line.replace(/(%[^\n]*)/g, '<span class="hl-comment">$1</span>');
      else if (['python','c','js'].includes(lang)) line = line.replace(/(\/\/[^\n]*|#[^\n]*)/g, '<span class="hl-comment">$1</span>');
      line = line.replace(/('[^']*')/g, '<span class="hl-string">$1</span>');
      line = line.replace(/("[^"]*")/g, '<span class="hl-string">$1</span>');
      const kws = KW[lang] || [];
      if (kws.length) line = line.replace(new RegExp('\\b('+kws.join('|')+')\\b','g'), '<span class="hl-keyword">$1</span>');
      line = line.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');
      html += `<span class="line-num">${i+1}</span><span class="line-code">${line}</span>\n`;
    }
    return html;
  }

  // 简易 Markdown 渲染
  function renderMD(text) {
    // 统一换行符
    let html = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    html = html.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    // 代码块: 支持有无语言标签、有无换行
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, function(m, lang, code) {
      return '<pre class="md-code">' + code.replace(/^\n/, '') + '</pre>';
    });
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // 表格: 检测连续的 | 行
    html = html.replace(/((?:^\|.+\|\n?)+)/gm, function(match) {
      const rows = match.trim().split('\n');
      if (rows.length < 2) return match;
      let table = '<table class="md-table">';
      rows.forEach(row => {
        const cells = row.split('|').filter(c => c.trim() !== '');
        if (cells.every(c => /^[-:]+$/.test(c.trim()))) return; // 跳过分隔行
        table += '<tr>';
        cells.forEach(c => { table += '<td>' + c.trim() + '</td>'; });
        table += '</tr>';
      });
      table += '</table>';
      return table;
    });

    // 分割线
    html = html.replace(/^[-*_]{3,}\s*$/gm, '<hr>');

    // 标题
    html = html.replace(/^#### (.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
    // 粗体/斜体
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // 链接 & 图片
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;">');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    // 无序列表
    html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    // 有序列表
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    // 段落
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    // 清理空段落
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>(<[huo])/g, '$1');
    html = html.replace(/(<\/[huo][^>]*>)\s*<\/p>/g, '$1');
    return html;
  }

  async function fetchContents(path) {
    const url = path ? `${API}/${path}` : API;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  }

  async function fetchFileText(path) {
    const resp = await fetch(`${RAW}/${path}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.text();
  }

  function renderTree(entries, container, depth = 0) {
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
    for (const entry of [...dirs, ...files]) {
      const div = document.createElement('div');
      div.className = 'tree-item';
      const isDir = entry.type === 'dir';
      const ext = extOf(entry.name);
      let icon = 'fa-file-code';
      if (isDir) icon = 'fa-folder';
      else if (ext === 'md') icon = 'fa-file-alt';
      else if (IMG_EXT.includes(ext)) icon = 'fa-file-image';
      else if (['xlsx','xls','csv'].includes(ext)) icon = 'fa-file-excel';
      else if (ext === 'pdf') icon = 'fa-file-pdf';
      else if (['zip','tar','gz'].includes(ext)) icon = 'fa-file-archive';
      div.innerHTML = `<i class="fas ${icon}"></i> ${entry.name}`;
      div.addEventListener('click', () => {
        if (isDir) navigateInto(entry.path);
        else openFile(entry.path, entry.name);
      });
      container.appendChild(div);
    }
  }

  async function navigateInto(path) {
    currentPath = path;
    const treeEl = document.getElementById('project-tree');
    treeEl.innerHTML = '<div class="tree-loading"><i class="fas fa-spinner fa-pulse"></i> 加载中...</div>';
    try {
      const entries = await fetchContents(path);
      renderTree(entries, treeEl, path.split('/').length);
      // 通知 AI 当前目录结构
      const fileList = entries.map(e => (e.type === 'dir' ? '📁 ' : '📄 ') + e.name).join('\n');
      if (window.AiAssistant) AiAssistant.setContext(path, path.split('/').pop() || '根目录', '', true, fileList);
    } catch(e) {
      treeEl.innerHTML = '<div class="tree-error">加载失败: ' + e.message + '</div>';
    }
  }

  async function navigateUp() {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    const parent = parts.join('/');
    if (!parent) { loadRoot(); return; }
    currentPath = parent;
    const treeEl = document.getElementById('project-tree');
    try {
      const entries = await fetchContents(parent);
      renderTree(entries, treeEl, parent.split('/').length);
    } catch(e) {
      treeEl.innerHTML = '<div class="tree-error">加载失败</div>';
    }
  }

  async function openFile(path, name) {
    const viewer = document.getElementById('code-viewer');
    const ext = extOf(name);
    document.getElementById('file-name-display').textContent = name;
    document.getElementById('file-path-display').textContent = path;

    // 图片
    if (IMG_EXT.includes(ext)) {
      const url = `${RAW}/${path}`;
      viewer.innerHTML = `<div style="text-align:center;padding:20px;"><img src="${url}" alt="${name}" style="max-width:100%;max-height:480px;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.1);"><p style="margin-top:10px;font-size:0.8rem;color:#999;"><a href="${url}" target="_blank">查看原图</a></p></div>`;
      if (window.AiAssistant) AiAssistant.setContext(path, name, '', false, '');
      return;
    }

    // 二进制文件
    if (BIN_EXT.includes(ext)) {
      const url = `${RAW}/${path}`;
      viewer.innerHTML = `<div style="text-align:center;padding:40px;color:#888;"><i class="fas fa-download" style="font-size:2.5rem;display:block;margin-bottom:12px;color:#ccc;"></i><p>${name}</p><p style="font-size:0.85rem;">二进制文件，无法在线预览</p><a href="${url}" target="_blank" style="display:inline-block;margin-top:12px;padding:8px 20px;background:var(--blue);color:#fff;border-radius:6px;text-decoration:none;">下载文件</a></div>`;
      if (window.AiAssistant) AiAssistant.setContext(path, name, '', false, '');
      return;
    }

    // 文本文件
    viewer.innerHTML = '<div class="tree-loading"><i class="fas fa-spinner fa-pulse"></i> 加载中...</div>';
    try {
      const text = await fetchFileText(path);

      // Markdown → 预览模式
      if (ext === 'md') {
        const html = renderMD(text);
        viewer.innerHTML = `<div class="md-preview">${html}</div>`;
        if (window.AiAssistant) AiAssistant.setContext(path, name, text, false, '');
        return;
      }

      // 代码文件
      const lang = guessLang(name);
      const html = highlightCode(text, lang);
      viewer.innerHTML = `<pre class="code-block lang-${lang}">${html}</pre>`;
      if (window.AiAssistant) AiAssistant.setContext(path, name, text, false, '');
    } catch(e) {
      viewer.innerHTML = '<div class="tree-error">加载失败: ' + e.message + '</div>';
    }
  }

  async function loadRoot() {
    currentPath = '';
    const treeEl = document.getElementById('project-tree');
    treeEl.innerHTML = '<div class="tree-loading"><i class="fas fa-spinner fa-pulse"></i> 加载中...</div>';
    try {
      const entries = await fetchContents('');
      renderTree(entries, treeEl, 0);
      // 设置根目录上下文
      const fileList = entries.map(e => (e.type === 'dir' ? '📁 ' : '📄 ') + e.name).join('\n');
      if (window.AiAssistant) AiAssistant.setContext('matlab-modeling-works', '根目录', '', true, fileList);
      const readme = entries.find(e => e.name.toLowerCase() === 'readme.md');
      if (readme) openFile(readme.path, readme.name);
    } catch(e) {
      treeEl.innerHTML = '<div class="tree-error">加载失败: ' + e.message + '<br><small>可能是 API 限流，稍后重试</small></div>';
    }
  }

  return { loadRoot, navigateInto, openFile };
})();
