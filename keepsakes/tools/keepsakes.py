#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Local-only staging and explicitly approved Git publication for Little Keepsakes.

Python >= 3.9, standard library only. No LLM/API calls; a vision-enabled DSH
session prepares metadata separately. Drafts live OUTSIDE the public repository.
"""
import argparse
import datetime as dt
import hashlib
import html
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import uuid
import zlib
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SITE = REPO / 'keepsakes'
DEFAULT_DRAFTS = Path.home() / '.keepsakes-drafts' / 'arce-star.github.io'
MAX_IMAGE_BYTES = 12 * 1024 * 1024
EXPECTED_REPO = 'arce-star/arce-star.github.io'
APPROVAL = '确认公开发布'
SECTIONS = {'book', 'timeline', 'collage', 'collection'}


class FlowError(Exception):
    pass


def fail(message):
    raise FlowError(message)


def output(value):
    print(json.dumps(value, ensure_ascii=False, indent=2))


def root_dir():
    configured = os.environ.get('KEEPSAKES_DRAFTS_DIR', '').strip()
    root = Path(configured).expanduser().resolve() if configured else DEFAULT_DRAFTS.resolve()
    if root == REPO or REPO in root.parents:
        fail('草稿目录不能在公开 Git 仓库内部；请把 KEEPSAKES_DRAFTS_DIR 改为仓库以外的目录。')
    return root


def ensure_site():
    for rel in ('keepsakes/data/cards.json', 'keepsakes/data/matches.json'):
        if not (REPO / rel).is_file():
            fail('未找到 ' + rel + '。请在已克隆的 arce-star.github.io 仓库内运行本工具。')


def read_json(path):
    try:
        return json.loads(Path(path).read_text(encoding='utf-8-sig'))
    except (OSError, UnicodeError, ValueError) as exc:
        fail('无法读取合法 JSON：%s (%s)' % (path, exc))


def text_field(meta, key, max_chars=300, required=True):
    val = meta.get(key, '')
    if not isinstance(val, str) or len(val.strip()) > max_chars:
        fail('字段 %s 应为不超过 %s 字的文本。' % (key, max_chars))
    val = val.strip()
    if required and not val:
        fail('请补充必填字段：' + key)
    if any(ord(c) < 32 and c not in '\n\t' for c in val):
        fail('字段 %s 包含非法控制字符。' % key)
    return val


def string_list(meta, key, max_items=10):
    values = meta.get(key, [])
    if not isinstance(values, list) or len(values) > max_items:
        fail('%s 必须为不超过 %d 项的列表。' % (key, max_items))
    result = []
    for item in values:
        if not isinstance(item, str) or not item.strip() or len(item.strip()) > 40:
            fail('%s 列表必须只包含 1–40 字的文本。' % key)
        if item.strip() not in result:
            result.append(item.strip())
    return result


def valid_date(value):
    try:
        date = dt.date.fromisoformat(value)
        if date.isoformat() != value:
            raise ValueError()
        return value
    except (ValueError, TypeError):
        fail('日期必须为真实日期 YYYY-MM-DD，例如 2026-11-18；不能猜测未知日期。')


def normalize(kind, meta):
    if not isinstance(meta, dict):
        fail('元数据文件顶层必须是 JSON 对象。')
    d = {'title': text_field(meta, 'title', 90), 'date': valid_date(text_field(meta, 'date', 10))}
    if kind == 'memory':
        d.update(place=text_field(meta, 'place', 90, required=False),
                 category=text_field(meta, 'category', 50),
                 note=text_field(meta, 'note', 900, required=False),
                 tags=string_list(meta, 'tags', 12),
                 sections=string_list(meta, 'sections', 4))
        if not d['sections'] or any(x not in SECTIONS for x in d['sections']):
            fail('sections 必须至少选择 book、timeline、collage、collection 中的一项。')
    elif kind == 'match':
        d.update(hero=text_field(meta, 'hero', 90),
                 mode=text_field(meta, 'mode', 90),
                 result=text_field(meta, 'result', 8),
                 note=text_field(meta, 'note', 900, required=False),
                 achievements=string_list(meta, 'achievements', 12))
        if d['result'] not in ('WIN', 'LOSE', 'DRAW'):
            fail('result 只能为 WIN、LOSE、DRAW。')
        for key in ('kills', 'deaths', 'assists'):
            n = meta.get(key)
            if type(n) is not int or not 0 <= n <= 999:
                fail('%s 必须是 0–999 之间的整数，不确定时先向用户确认。' % key)
            d[key] = n
        rating = meta.get('rating', None)
        if rating is not None:
            if type(rating) not in (int, float) or not 0 <= rating <= 100:
                fail('rating 必须为非负数字（不确定时可以填 null）。')
        d['rating'] = rating
    else:
        fail('不支持的分类；请选择 memory 或 match。')
    return d


def default_metadata(kind):
    if kind == 'memory':
        return {'title': '', 'date': '', 'place': '', 'category': '',
                'note': '', 'tags': [], 'sections': ['timeline']}
    return {'title': '', 'date': '', 'hero': '', 'mode': '', 'result': '',
            'kills': None, 'deaths': None, 'assists': None,
            'rating': None, 'achievements': [], 'note': ''}


def clean_png(data):
    if not data.startswith(b'\x89PNG\r\n\x1a\n'):
        fail('PNG 文件签名无效。')
    pos, kept, end_seen = 8, [data[:8]], False
    allowed = {b'IHDR', b'PLTE', b'IDAT', b'IEND', b'tRNS', b'gAMA', b'sRGB', b'cHRM', b'sBIT', b'bKGD', b'pHYs'}
    while pos + 12 <= len(data):
        n = struct.unpack_from('>I', data, pos)[0]
        if n > MAX_IMAGE_BYTES or pos + 12 + n > len(data):
            fail('PNG 分块长度异常。')
        chunk = data[pos + 4:pos + 8]
        segment = data[pos:pos + 12 + n]
        crc = struct.unpack_from('>I', segment, 8 + n)[0]
        if (zlib.crc32(segment[4:8 + n]) & 0xffffffff) != crc:
            fail('PNG 分块 CRC 校验失败。')
        if chunk in allowed:
            kept.append(segment)
        elif chunk[:1].isupper():
            fail('PNG 包含未知关键分块，无法安全导入。')
        pos += 12 + n
        if chunk == b'IEND':
            end_seen = True
            break
    if not end_seen or pos != len(data):
        fail('PNG 不是有效的完整图片。')
    return b''.join(kept)


def clean_jpeg(data):
    if len(data) < 4 or data[:2] != b'\xff\xd8' or data[-2:] != b'\xff\xd9':
        fail('JPEG 文件起止标记无效。')
    pos = 2
    kept = [data[:2]]
    while pos < len(data):
        if data[pos] != 0xff:
            fail('JPEG 标记异常，拒绝导入。')
        start = pos
        while pos < len(data) and data[pos] == 0xff:
            pos += 1
        if pos >= len(data):
            fail('JPEG 文件不完整。')
        marker = data[pos]
        pos += 1
        if marker == 0xda:  # start of scan; preserve compressed scan data
            if pos + 2 > len(data):
                fail('JPEG 扫描段不完整。')
            kept.append(data[start:])
            return b''.join(kept)
        if marker in (0xd8, 0xd9, 0x01) or 0xd0 <= marker <= 0xd7:
            kept.append(data[start:pos])
            if marker == 0xd9:
                return b''.join(kept)
            continue
        if pos + 2 > len(data):
            fail('JPEG 段头不完整。')
        n = struct.unpack_from('>H', data, pos)[0]
        if n < 2 or pos + n > len(data):
            fail('JPEG 段长度异常。')
        end = pos + n
        if not (0xe0 <= marker <= 0xef or marker == 0xfe):
            kept.append(data[start:end])
        pos = end
    fail('JPEG 缺少图像扫描数据。')


def clean_webp(data):
    if len(data) < 20 or data[:4] != b'RIFF' or data[8:12] != b'WEBP':
        fail('WebP 文件签名无效。')
    if struct.unpack_from('<I', data, 4)[0] + 8 != len(data):
        fail('WebP RIFF 长度异常。')
    pos = 12
    while pos + 8 <= len(data):
        name = data[pos:pos + 4]
        n = struct.unpack_from('<I', data, pos + 4)[0]
        end = pos + 8 + n + (n % 2)
        if end > len(data):
            fail('WebP 分块长度异常。')
        if name in (b'EXIF', b'XMP ', b'ICCP'):
            fail('这张 WebP 含有 EXIF/XMP/ICC 元数据，请先导出为无元数据的 PNG 或 JPEG。')
        if name == b'VP8X' and n >= 1 and data[pos + 8] & (0x08 | 0x04 | 0x20):
            fail('这张 WebP 标记了 EXIF/XMP/ICC，请先导出为无元数据的 PNG 或 JPEG。')
        pos = end
    if pos != len(data):
        fail('WebP 分块尾部异常。')
    return data


def sanitize_image(path):
    src = Path(path).expanduser().resolve()
    if not src.is_file() or src.is_symlink():
        fail('图片不存在，或不是可读的普通文件：' + str(src))
    if not 64 <= src.stat().st_size <= MAX_IMAGE_BYTES:
        fail('图片大小必须在 64 字节至 12 MiB 之间。')
    data = src.read_bytes()
    ext = src.suffix.lower()
    if ext in ('.jpg', '.jpeg'):
        return clean_jpeg(data), '.jpg'
    if ext == '.png':
        return clean_png(data), '.png'
    if ext == '.webp':
        return clean_webp(data), '.webp'
    fail('仅支持 .jpg、.jpeg、.png、.webp；不接受 SVG、GIF 或其他可执行/动画格式。')


def stage_path(draft_id):
    if not re.fullmatch(r'(memory|match)-[0-9a-f]{12}', draft_id or ''):
        fail('草稿 ID 格式错误。')
    return root_dir() / draft_id


def load_draft(draft_id):
    folder = stage_path(draft_id)
    data = read_json(folder / 'draft.json')
    if not isinstance(data, dict) or data.get('id') != draft_id:
        fail('草稿文件损坏或 ID 不匹配。')
    path = folder / ('image' + data.get('extension', ''))
    if data.get('extension') not in ('.jpg', '.png', '.webp') or not path.is_file() or path.is_symlink():
        fail('草稿图片丢失。')
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != data.get('sha256'):
        fail('草稿图片内容已变化；请重新导入并检查。')
    return folder, data, path


def prepare(args):
    ensure_site()
    clean_bytes, suffix = sanitize_image(args.image)
    kind = args.kind
    meta = read_json(args.meta) if args.meta else default_metadata(kind)
    if not isinstance(meta, dict):
        fail('meta 需要为 JSON 对象。')
    draft_id = kind + '-' + uuid.uuid4().hex[:12]
    folder = stage_path(draft_id)
    folder.mkdir(parents=True, exist_ok=False)
    (folder / ('image' + suffix)).write_bytes(clean_bytes)
    data = {'id': draft_id, 'kind': kind, 'extension': suffix,
            'sha256': hashlib.sha256(clean_bytes).hexdigest(),
            'status': 'draft', 'metadata': meta,
            'created_at': dt.datetime.now(dt.timezone.utc).isoformat()}
    (folder / 'draft.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    output({'status': 'draft', 'id': draft_id, 'draft_dir': str(folder),
            'preview_command': 'python tools/keepsakes.py preview --id ' + draft_id,
            'next': '先预览、补充信息和人工核对；不允许自动发布。',
            'public_files_changed': False})


def update(args):
    folder, data, image = load_draft(args.id)
    if data['status'] != 'draft':
        fail('已发布草稿不可修改。')
    meta = read_json(args.meta)
    if not isinstance(meta, dict):
        fail('meta 需要为 JSON 对象。')
    data['metadata'] = meta
    (folder / 'draft.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    output({'status': 'draft_updated', 'id': args.id, 'next': '运行 preview 检查信息；尚未公开。'})


def record(data):
    d = normalize(data['kind'], data['metadata'])
    d['id'] = data['id']
    d['image'] = 'images/' + data['id'] + data['extension']
    d['visibility'] = 'public'
    d['source'] = 'dsh'
    return d


def html_preview(folder, data, image, validation):
    meta = data.get('metadata', {})
    record_html = html.escape(json.dumps(meta, ensure_ascii=False, indent=2))
    title = html.escape(str(meta.get('title', '待填写'))) if isinstance(meta, dict) else '待填写'
    image_url = html.escape(image.name, quote=True)
    status = '信息检查通过（仍需人工审查图片隐私）' if validation is None else html.escape(validation)
    content = '''<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' file: data:; style-src 'unsafe-inline'">
<title>拾光手账 · 本地草稿</title><style>body{font:16px system-ui,sans-serif;color:#594c40;background:#f6f0e8;margin:0;padding:24px}.sheet{max-width:900px;margin:auto;background:#fffaf2;border:1px solid #e2d3bc;border-radius:18px;padding:26px;box-shadow:0 15px 35px #75604a22}h1{font-size:24px}img{display:block;max-width:100%;max-height:440px;object-fit:contain;margin:18px auto;border-radius:10px}pre{white-space:pre-wrap;word-break:break-word;background:#f1e7d9;padding:16px;border-radius:10px;font:13px/1.6 ui-monospace,monospace}.notice{border-left:4px solid #a98674;padding:12px;background:#f8ece3}small{color:#977f6e}</style></head><body><main class="sheet"><small>LOCAL DRAFT · 尚未上传 GitHub</small><h1>''' + title + '''</h1><img src="''' + image_url + '''" alt="待发布图片预览"><p>''' + status + '''</p><pre>''' + record_html + '''</pre><p class="notice">请逐项核对：图片无二维码、账号、姓名、住址、订单号、房号、他人隐私；文字与日期准确；你愿意让所有互联网访客访问这张图。</p><small>仅本地预览；没有发布按钮，无法通过此页面自动上传。</small></main></body></html>'''
    (folder / 'preview.html').write_text(content, encoding='utf-8')


def preview(args):
    folder, data, image = load_draft(args.id)
    error = None
    try:
        preview_record = record(data)
    except FlowError as exc:
        error, preview_record = str(exc), None
    html_preview(folder, data, image, error)
    output({'id': data['id'], 'kind': data['kind'], 'status': data['status'],
            'metadata_complete': error is None, 'validation_error': error,
            'preview_html': str(folder / 'preview.html'), 'image_file': str(image),
            'record_if_published': preview_record,
            'next': '用户必须查看真实图片并明确回复确认发布；此命令不会上传任何文件。'})


def run_git(*command):
    try:
        done = subprocess.run(['git', *command], cwd=str(REPO), capture_output=True,
                              text=True, encoding='utf-8', errors='replace', check=False)
    except OSError as exc:
        fail('无法运行 git：' + str(exc))
    if done.returncode:
        fail('git ' + ' '.join(command) + ' 失败：' + (done.stderr or done.stdout).strip()[:1200])
    return done.stdout.strip()


def check_repo_clean():
    ensure_site()
    top = Path(run_git('rev-parse', '--show-toplevel')).resolve()
    if top != REPO:
        fail('Git 仓库根目录不符合预期。')
    branch = run_git('branch', '--show-current')
    if branch != 'main':
        fail('只允许从 main 发布；当前分支是 ' + branch)
    origin = run_git('remote', 'get-url', 'origin').strip()
    allowed = ('https://github.com/' + EXPECTED_REPO,
               'git@github.com:' + EXPECTED_REPO,
               'ssh://git@github.com/' + EXPECTED_REPO)
    if origin.rstrip('/').removesuffix('.git') not in allowed:
        fail('Git origin 不是你的目标仓库：' + origin)
    dirty = run_git('status', '--porcelain', '--untracked-files=all')
    if dirty:
        fail('仓库存在未提交修改，请先处理再发布；避免误提交其他文件。\n' + dirty[:600])
    return {'repo': str(REPO), 'branch': branch, 'origin': origin, 'clean': True}


def doctor(args):
    ensure_site()
    git = check_repo_clean()
    output({'ready_for_local_import': True, 'git_push_credentials_verified': False, 'python': sys.version.split()[0],
            'drafts_outside_public_repo': str(root_dir()), **git,
            'next': '准备素材和元数据后执行 prepare；doctor 不会发布。'})


def publish(args):
    folder, data, stage_image = load_draft(args.id)
    if data['status'] != 'draft':
        fail('这条记录已发布，不能重复发布。')
    item = record(data)
    if args.dry_run:
        git = check_repo_clean()
        output({'dry_run': True, 'id': data['id'], 'record': item, 'git': git,
                'next': '未修改任何文件。向用户展示此预览并等待明确“确认发布”。'})
        return
    if args.confirm != APPROVAL or not args.privacy_ok:
        fail('发布被阻止：必须得到用户明确确认，并提供 --confirm "确认公开发布" --privacy-ok。')
    check_repo_clean()
    # The remote branch must be fast-forwardable before modifying any site files.
    run_git('pull', '--ff-only', 'origin', 'main')
    check_repo_clean()
    rel_json = 'keepsakes/data/cards.json' if data['kind'] == 'memory' else 'keepsakes/data/matches.json'
    json_path = REPO / rel_json
    records = read_json(json_path)
    if not isinstance(records, list):
        fail('网站数据文件必须为 JSON 数组。')
    if any(not isinstance(x, dict) or x.get('id') == data['id'] for x in records):
        fail('记录 ID 已存在或网站数据格式异常，拒绝覆盖。')
    dst = SITE / item['image']
    if dst.exists() or dst.is_symlink():
        fail('目标图片路径已存在，拒绝覆盖。')
    dst.parent.mkdir(parents=True, exist_ok=True)
    staged = stage_image.read_bytes()
    if hashlib.sha256(staged).hexdigest() != data['sha256']:
        fail('草稿图片在发布前发生变化，拒绝发布。')
    original = json_path.read_bytes()
    committed = False
    try:
        with dst.open('xb') as f:
            f.write(staged)
        records.append(item)
        tmp = json_path.with_suffix('.json.tmp')
        tmp.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        tmp.replace(json_path)
        rel_image = 'keepsakes/' + item['image']
        run_git('add', '--', rel_json, rel_image)
        staged_paths = set(run_git('diff', '--cached', '--name-only').splitlines())
        if staged_paths != {rel_json, rel_image}:
            fail('Git 暂存变更不符合预期，拒绝提交：' + repr(staged_paths))
        run_git('commit', '-m', 'content(keepsakes): add ' + data['id'])
        committed = True
        # If network/permission fails here, the commit remains local, never claim published.
        run_git('push', 'origin', 'main')
    except FlowError:
        if not committed:
            # Only changes made by this operation are restored; other paths are untouched.
            try:
                run_git('reset', '--', rel_json, 'keepsakes/' + item['image'])
                json_path.write_bytes(original)
                dst.unlink(missing_ok=True)
            except (FlowError, OSError):
                pass
        else:
            print('注意：本地已生成 Git commit，但推送失败。不要重新导入；检查网络并手工 git push。', file=sys.stderr)
        raise
    data['status'] = 'published'
    data['published_at'] = dt.datetime.now(dt.timezone.utc).isoformat()
    (folder / 'draft.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    output({'published': True, 'id': data['id'], 'image': item['image'],
            'dataset': rel_json, 'url': 'https://arce-star.github.io/keepsakes/',
            'note': 'Git 已推送；GitHub Pages 仍可能需要一点时间刷新。'})


def main():
    parser = argparse.ArgumentParser(description='拾光手账 · 本地导入、审核、确认后发布（无 API 依赖）')
    sub = parser.add_subparsers(dest='action', required=True)
    sub.add_parser('doctor', help='只检查本地 Git 环境')
    prep = sub.add_parser('prepare', help='复制经过清理的图片到公开仓库外的草稿区')
    prep.add_argument('--image', required=True, help='本地图片绝对路径（豆包处理后的文件等）')
    prep.add_argument('--kind', choices=('memory', 'match'), required=True)
    prep.add_argument('--meta', help='DSH 生成的本地 JSON 路径（可稍后用 update 补充）')
    upd = sub.add_parser('update', help='更新草稿的元数据，永不自动发布')
    upd.add_argument('--id', required=True)
    upd.add_argument('--meta', required=True)
    show = sub.add_parser('preview', help='生成本地审查网页并检查 JSON')
    show.add_argument('--id', required=True)
    pub = sub.add_parser('publish', help='必须明确确认才会 git commit + push')
    pub.add_argument('--id', required=True)
    pub.add_argument('--dry-run', action='store_true', help='只校验，不修改仓库，不联网')
    pub.add_argument('--confirm', help='用户明确回复确认发布后，填入固定短语“确认公开发布”')
    pub.add_argument('--privacy-ok', action='store_true', help='用户明确确认图片与元数据可公开')
    args = parser.parse_args()
    try:
        {'doctor': doctor, 'prepare': prepare, 'update': update,
         'preview': preview, 'publish': publish}[args.action](args)
    except FlowError as exc:
        print('错误：' + str(exc), file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
