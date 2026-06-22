// 为所有 iframe 子页面添加 session 令牌校验
const fs = require('fs');
const path = require('path');

const CHECK_SNIPPET = `
<script>
if(!sessionStorage.getItem('_arce_session')){
  document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,sans-serif;color:#999;text-align:center;"><div><div style="font-size:3rem;margin-bottom:16px;">\u{1f512}</div><p>请先通过主页登录</p><p style="font-size:.85rem;margin-top:8px;"><a href="/" style="color:#667eea;">返回主页</a></p></div></div>';
  throw new Error();
}
</script>
`;

const ROOT = path.join(__dirname, '..');

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('用法: node scripts/add-auth-check.js file1.html file2.html ...');
  process.exit(1);
}

for (const filename of files) {
  const filePath = path.join(ROOT, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`跳过 (不存在): ${filename}`);
    continue;
  }

  let html = fs.readFileSync(filePath, 'utf8');

  // 检查是否已有校验
  if (html.includes('_arce_session')) {
    console.log(`跳过 (已有校验): ${filename}`);
    continue;
  }

  // 在 <body> 或 <body ...> 后插入校验脚本
  const bodyMatch = html.match(/<body[^>]*>/i);
  if (!bodyMatch) {
    console.error(`跳过 (无 body 标签): ${filename}`);
    continue;
  }

  const insertPos = bodyMatch.index + bodyMatch[0].length;
  html = html.slice(0, insertPos) + CHECK_SNIPPET + html.slice(insertPos);

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`✓ ${filename}`);
}
