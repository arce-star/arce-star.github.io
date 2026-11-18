"""Offline tests only: no GitHub requests, no user's real images."""
import contextlib
import importlib.util
import io
import json
import os
import shutil
import struct
import subprocess
import tempfile
import unittest
import zlib
from pathlib import Path
from types import SimpleNamespace

SCRIPT = Path(__file__).resolve().parents[1] / 'keepsakes.py'


def png_chunk(name, value):
    return struct.pack('>I', len(value)) + name + value + struct.pack('>I', zlib.crc32(name + value) & 0xffffffff)


def sample_png():
    header = struct.pack('>IIBBBBB', 1, 1, 8, 6, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n' + png_chunk(b'IHDR', header)
            + png_chunk(b'tEXt', b'GPS\x00my secret location')
            + png_chunk(b'IDAT', zlib.compress(b'\x00\xff\xae\x52\xff'))
            + png_chunk(b'IEND', b''))


class LocalWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.repo = self.base / 'arce-star.github.io'
        self.site = self.repo / 'keepsakes'
        self.tools = self.site / 'tools'
        self.tools.mkdir(parents=True)
        (self.site / 'data').mkdir()
        shutil.copy2(SCRIPT, self.tools / 'keepsakes.py')
        (self.site / 'data' / 'cards.json').write_text('[]\n', encoding='utf-8')
        (self.site / 'data' / 'matches.json').write_text('[]\n', encoding='utf-8')
        spec = importlib.util.spec_from_file_location('keepsakes_testing', self.tools / 'keepsakes.py')
        self.m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.m)
        self.m.DEFAULT_DRAFTS = self.base / 'private-drafts'
        self.img = self.base / 'photo.png'
        self.img.write_bytes(sample_png())
        self.memory = {'title': '晨光', 'date': '2026-11-18', 'place': '',
                       'category': '风景照片', 'note': '旅途的照片',
                       'tags': ['日常'], 'sections': ['timeline', 'book']}
        self.meta = self.base / 'meta.json'
        self.meta.write_text(json.dumps(self.memory, ensure_ascii=False), encoding='utf-8')

    def run_stage(self):
        with contextlib.redirect_stdout(io.StringIO()) as out:
            self.m.prepare(SimpleNamespace(kind='memory', image=str(self.img), meta=str(self.meta)))
        return json.loads(out.getvalue())['id']

    def git(self, *args, cwd=None):
        return subprocess.check_output(['git', *args], cwd=str(cwd or self.repo), text=True, stderr=subprocess.STDOUT)

    def make_fake_git(self):
        bare = self.base / 'fake-remote.git'
        subprocess.run(['git', 'init', '--bare', str(bare)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(['git', 'init', '-b', 'main', str(self.repo)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.git('config', 'user.email', 'test@local.invalid')
        self.git('config', 'user.name', 'Local Test')
        self.git('add', '.')
        self.git('commit', '-m', 'test initial state')
        self.git('remote', 'add', 'origin', str(bare))
        self.git('push', '-u', 'origin', 'main')
        return bare

    def test_prepare_stays_private_and_strips_png_text(self):
        draft_id = self.run_stage()
        folder, stage, image = self.m.load_draft(draft_id)
        self.assertNotIn(self.repo, folder.parents)
        self.assertNotIn(b'GPS', image.read_bytes())
        self.assertEqual(json.loads((self.site / 'data' / 'cards.json').read_text()), [])
        self.assertFalse((self.site / 'images').exists())
        with contextlib.redirect_stdout(io.StringIO()) as out:
            self.m.preview(SimpleNamespace(id=draft_id))
        response = json.loads(out.getvalue())
        self.assertTrue(response['metadata_complete'])
        self.assertTrue(Path(response['preview_html']).is_file())
        self.assertIn('晨光', Path(response['preview_html']).read_text())

    def test_bad_metadata_is_rejected_before_publish(self):
        draft_id = self.run_stage()
        folder, stage, image = self.m.load_draft(draft_id)
        stage['metadata']['date'] = '2026-02-30'
        with self.assertRaises(self.m.FlowError):
            self.m.record(stage)
        stage['metadata']['date'] = '2026-11-18'
        stage['metadata']['sections'] = ['../../outside']
        with self.assertRaises(self.m.FlowError):
            self.m.record(stage)

    def test_publish_requires_both_human_confirmation_flags(self):
        draft_id = self.run_stage()
        with self.assertRaises(self.m.FlowError):
            self.m.publish(SimpleNamespace(id=draft_id, dry_run=False,
                                           confirm='', privacy_ok=False))
        self.assertEqual(json.loads((self.site / 'data' / 'cards.json').read_text()), [])

    def test_dry_run_never_updates_or_uploads(self):
        draft_id = self.run_stage()
        self.make_fake_git()
        real_git = self.m.run_git
        self.m.run_git = lambda *a: ('https://github.com/arce-star/arce-star.github.io.git' if a == ('remote', 'get-url', 'origin') else real_git(*a))
        old_head = self.git('rev-parse', 'HEAD').strip()
        with contextlib.redirect_stdout(io.StringIO()) as out:
            self.m.publish(SimpleNamespace(id=draft_id, dry_run=True,
                                           confirm=None, privacy_ok=False))
        self.assertTrue(json.loads(out.getvalue())['dry_run'])
        self.assertEqual(self.git('rev-parse', 'HEAD').strip(), old_head)
        self.assertFalse((self.site / 'images').exists())
        self.assertEqual(json.loads((self.site / 'data' / 'cards.json').read_text()), [])

    def test_confirmed_publish_only_to_local_fake_git(self):
        draft_id = self.run_stage()
        bare = self.make_fake_git()
        real_git = self.m.run_git
        self.m.run_git = lambda *a: ('https://github.com/arce-star/arce-star.github.io.git' if a == ('remote', 'get-url', 'origin') else real_git(*a))
        with contextlib.redirect_stdout(io.StringIO()) as out:
            self.m.publish(SimpleNamespace(id=draft_id, dry_run=False,
                                           confirm=self.m.APPROVAL, privacy_ok=True))
        self.assertTrue(json.loads(out.getvalue())['published'])
        cards = json.loads(self.git('--git-dir', str(bare), 'show', 'main:keepsakes/data/cards.json', cwd=self.base))
        self.assertEqual(len(cards), 1)
        self.assertEqual(cards[0]['id'], draft_id)
        self.assertEqual(cards[0]['sections'], ['timeline', 'book'])
        self.assertEqual(cards[0]['image'], 'images/' + draft_id + '.png')
        self.assertEqual(self.git('status', '--porcelain'), '')
        with self.assertRaises(self.m.FlowError):
            self.m.publish(SimpleNamespace(id=draft_id, dry_run=False,
                                           confirm=self.m.APPROVAL, privacy_ok=True))

    def test_webp_with_metadata_is_rejected(self):
        # Minimal VP8X header claiming EXIF metadata; reject before draft creation.
        payload = b'VP8X' + struct.pack('<I', 10) + b'\x08' + b'\0' * 9
        data = b'RIFF' + struct.pack('<I', len(payload) + 4) + b'WEBP' + payload
        path = self.base / 'private.webp'
        path.write_bytes(data)
        with self.assertRaises(self.m.FlowError):
            self.m.sanitize_image(path)

    def test_image_metadata_cannot_override_public_path(self):
        meta = {**self.memory, 'image': '../../evil.png', 'id': 'fake', 'visibility': 'private'}
        self.meta.write_text(json.dumps(meta, ensure_ascii=False), encoding='utf-8')
        draft_id = self.run_stage()
        _, data, _ = self.m.load_draft(draft_id)
        result = self.m.record(data)
        self.assertEqual(result['image'], 'images/' + draft_id + '.png')
        self.assertEqual(result['visibility'], 'public')
        self.assertNotEqual(result['id'], 'fake')

    def test_match_schema(self):
        m = {'title': '精彩对局', 'date': '2026-11-18', 'hero': '某英雄',
             'mode': '排位赛', 'result': 'WIN', 'kills': 16, 'deaths': 2, 'assists': 10,
             'rating': None, 'achievements': ['MVP'], 'note': ''}
        self.assertEqual(self.m.normalize('match', m)['kills'], 16)
        m['kills'] = '16'
        with self.assertRaises(self.m.FlowError):
            self.m.normalize('match', m)


if __name__ == '__main__':
    unittest.main()
