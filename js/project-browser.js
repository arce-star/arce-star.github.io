// MATLAB 项目浏览器 — 从 GitHub API 加载
const ProjectBrowser = (() => {
  const API = 'https://api.github.com/repos/arce-star/matlab-modeling-works/contents';
  const RAW = 'https://raw.githubusercontent.com/arce-star/matlab-modeling-works/main';

  let currentPath = '';
  let currentFile = null;

  // 语言关键词 (简化版)
  const KW = {
    matlab: ['function','end','if','else','elseif','for','while','switch','case','otherwise','try','catch','return','break','continue','global','persistent','classdef','properties','methods','events','arguments','true','false'],
    python: ['def','class','if','elif','else','for','while','try','except','finally','with','as','import','from','return','yield','lambda','True','False','None','and','or','not','in','is','pass','break','continue','raise','global','nonlocal'],
  };

  function guessLang(filename) {
    const ext = (filename||'').split('.').pop().toLowerCase();
    if (['m','mat'].includes(ext)) return 'matlab';
    if (['py'].includes(ext)) return 'python';
    if (['c','cpp','h','hpp'].includes(ext)) return 'c';
    if (['js','jsx'].includes(ext)) return 'js';
    if (['html','htm'].includes(ext)) return 'html';
    if (['css'].includes(ext)) return 'css';
    if (['json'].includes(ext)) return 'json';
    if (['md','txt'].includes(ext)) return 'text';
    return '';
  }

  function highlightCode(code, lang) {
    let escaped = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    if (!lang || lang === 'text') return escaped;

    // 行号
    const lines = escaped.split('\n');
    let html = '';
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      // 注释
      if (lang === 'matlab') line = line.replace(/(%[^\n]*)/g, '<span class="hl-comment">$1</span>');
      else if (lang === 'python' || lang === 'c' || lang === 'js') line = line.replace(/(\/\/[^\n]*|#[^\n]*)/g, '<span class="hl-comment">$1</span>');
      // 字符串
      line = line.replace(/('[^']*')/g, '<span class="hl-string">$1</span>');
      line = line.replace(/("[^"]*")/g, '<span class="hl-string">$1</span>');
      // 关键词
      const kws = KW[lang] || [];
      if (kws.length) {
        const re = new RegExp('\\b(' + kws.join('|') + ')\\b', 'g');
        line = line.replace(re, '<span class="hl-keyword">$1</span>');
      }
      // 数字
      line = line.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');
      html += `<span class="line-num">${i+1}</span><span class="line-code">${line}</span>\n`;
    }
    return html;
  }

  async function fetchContents(path) {
    const url = path ? `${API}/${path}` : API;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  }

  async function fetchFile(path) {
    const resp = await fetch(`${RAW}/${path}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.text();
  }

  function renderTree(entries, container, depth = 0) {
    container.innerHTML = '';
    // 返回按钮
    if (depth > 0) {
      const back = document.createElement('div');
      back.className = 'tree-item tree-back';
      back.innerHTML = '<i class="fas fa-arrow-left"></i> 返回上级';
      back.addEventListener('click', () => navigateUp());
      container.appendChild(back);
    }
    // 排序: 目录在前
    const dirs = entries.filter(e => e.type === 'dir').sort((a,b) => a.name.localeCompare(b.name));
    const files = entries.filter(e => e.type === 'file').sort((a,b) => a.name.localeCompare(b.name));
    const sorted = [...dirs, ...files];

    for (const entry of sorted) {
      const div = document.createElement('div');
      div.className = 'tree-item';
      const isDir = entry.type === 'dir';
      const ext = entry.name.split('.').pop().toLowerCase();
      let icon = isDir ? 'fa-folder' : 'fa-file-code';
      if (!isDir) {
        if (['md'].includes(ext)) icon = 'fa-file-alt';
        else if (['png','jpg','jpeg','gif'].includes(ext)) icon = 'fa-file-image';
        else if (['xlsx','csv'].includes(ext)) icon = 'fa-file-excel';
      }
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
    currentFile = { path, name };
    const viewer = document.getElementById('code-viewer');
    viewer.innerHTML = '<div class="tree-loading"><i class="fas fa-spinner fa-pulse"></i> 加载代码...</div>';
    document.getElementById('file-name-display').textContent = name;
    document.getElementById('file-path-display').textContent = path;

    try {
      const code = await fetchFile(path);
      const lang = guessLang(name);
      const html = highlightCode(code, lang);
      viewer.innerHTML = `<pre class="code-block lang-${lang}">${html}</pre>`;
      // 通知 AI 助手当前文件
      if (window.AiAssistant) AiAssistant.setContext(path, name, code);
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
      // 自动打开 README
      const readme = entries.find(e => e.name.toLowerCase() === 'readme.md');
      if (readme) openFile(readme.path, readme.name);
    } catch(e) {
      treeEl.innerHTML = '<div class="tree-error">加载失败: ' + e.message + '<br><small>可能是 API 限流，稍后重试</small></div>';
    }
  }

  return { loadRoot, navigateInto, openFile };
})();
