// 本地加密脚本 — 将 home-content.html 加密为 js/encrypted-content.js
// 用法: node scripts/encrypt.js
// 或:   node scripts/encrypt.js "你的密码"
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const INPUT = path.join(__dirname, '..', 'home-content.html');
const OUTPUT = path.join(__dirname, '..', 'js', 'encrypted-content.js');

function encrypt(plaintext, password) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);

  const key = crypto.pbkdf2Sync(password, salt, 200000, 32, 'sha256');

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // 格式: salt(16) + iv(12) + ciphertext + authTag(16)
  const combined = Buffer.concat([salt, iv, encrypted, authTag]);
  return combined.toString('base64');
}

async function getPassword() {
  if (process.argv[2]) return process.argv[2];

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  // 用 stderr 输出提示，避免混入 stdout
  const question = () => new Promise(resolve => {
    process.stderr.write('请输入私人区密码: ');
    // 简单的密码回显隐藏 (stdin raw mode)
    const stdin = process.stdin;
    const prevRaw = stdin.isRaw;
    if (stdin.setRawMode) stdin.setRawMode(true);
    let pwd = '';
    stdin.on('data', function handler(chunk) {
      const c = chunk.toString();
      if (c === '\r' || c === '\n') {
        stdin.removeListener('data', handler);
        if (stdin.setRawMode) stdin.setRawMode(false);
        process.stderr.write('\n');
        rl.close();
        resolve(pwd);
      } else if (c === '\x03') { // Ctrl+C
        process.exit(1);
      } else if (c === '\x7f' || c === '\x08') { // Backspace
        if (pwd.length > 0) {
          pwd = pwd.slice(0, -1);
          process.stderr.write('\x08 \x08');
        }
      } else {
        pwd += c;
        process.stderr.write('*');
      }
    });
  });
  return question();
}

async function main() {
  if (!fs.existsSync(INPUT)) {
    console.error('错误: 找不到 home-content.html，请先将私人内容保存到该文件。');
    process.exit(1);
  }

  const html = fs.readFileSync(INPUT, 'utf8');
  const password = await getPassword();

  if (!password || password.length < 1) {
    console.error('错误: 密码不能为空');
    process.exit(1);
  }

  console.error('正在加密...');
  const encryptedB64 = encrypt(html, password);

  const outputContent = `// 自动生成 — 勿手动编辑
// 重新生成: node scripts/encrypt.js
const ENCRYPTED_CONTENT = ${JSON.stringify(encryptedB64)};
`;

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, outputContent, 'utf8');
  console.error(`✓ 加密完成 → ${OUTPUT}`);
  console.error('  密码提示: 🍃');
}

main().catch(e => { console.error(e.message); process.exit(1); });
