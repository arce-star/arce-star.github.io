// 本地解密恢复脚本 — 从 js/encrypted-content.js 恢复 home-content.html
// 用法: node scripts/decrypt.js "你的密码"
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'js', 'encrypted-content.js');
const OUTPUT = path.join(__dirname, '..', 'home-content.html');

function decrypt(encryptedB64, password) {
  const combined = Buffer.from(encryptedB64, 'base64');
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28, -16);
  const authTag = combined.slice(-16);

  const key = crypto.pbkdf2Sync(password, salt, 200000, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

const password = process.argv[2];
if (!password) {
  console.error('用法: node scripts/decrypt.js "你的密码"');
  process.exit(1);
}

const jsContent = fs.readFileSync(INPUT, 'utf8');
const match = jsContent.match(/ENCRYPTED_CONTENT = "(.+)"/);
if (!match) {
  console.error('错误: 找不到加密内容，确认 js/encrypted-content.js 存在');
  process.exit(1);
}

try {
  const html = decrypt(match[1], password);
  fs.writeFileSync(OUTPUT, html, 'utf8');
  console.error('✓ 恢复完成 → home-content.html');
} catch (_) {
  console.error('错误: 密码不正确');
  process.exit(1);
}
