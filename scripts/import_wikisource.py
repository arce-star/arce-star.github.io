#!/usr/bin/env python3
"""Import full texts from Wikisource pages explicitly marked public domain.

This script only imports catalog entries whose source page:
- exists under the exact Wikisource page title,
- identifies the expected author,
- carries a public-domain marker, and
- yields a substantial body of text.

It never generates or reconstructs missing literary text.
"""
from __future__ import annotations

import html
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "assets/data/reading/catalog.json"
FULLTEXT_PATH = ROOT / "assets/data/reading/fulltext.json"
API = "https://zh.wikisource.org/w/api.php"
USER_AGENT = "WenjianLiteraryArchive/1.0 (public-domain text importer)"
MIN_CHARS = 500
MAX_CHARS = 60000
DELAY_SECONDS = 0.15


def request_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    last_error = None
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=8) as response:
                return json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            time.sleep(0.5 * (attempt + 1))
    raise RuntimeError(f"source request failed: {last_error}")


class ParagraphExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.paragraphs: list[str] = []
        self.all_text: list[str] = []
        self._in_p = 0
        self._current: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        attrs_dict = dict(attrs)
        classes = set((attrs_dict.get("class") or "").split())
        if tag in {"script", "style", "nav", "table", "sup"} or classes.intersection(
            {"mw-editsection", "reference", "noprint", "metadata", "catlinks",
             "ws-noexport", "mw-cite-backlink", "mw-references-wrap"}
        ):
            self._skip += 1
            return
        if self._skip:
            return
        if tag == "p":
            self._in_p += 1
            if self._in_p == 1:
                self._current = []
        elif tag == "br" and self._in_p:
            self._current.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if self._skip:
            if tag in {"script", "style", "nav", "table", "sup", "div", "span"}:
                self._skip = max(0, self._skip - 1)
            return
        if tag == "p" and self._in_p:
            self._in_p -= 1
            if self._in_p == 0:
                paragraph = clean_text("".join(self._current))
                if paragraph:
                    self.paragraphs.append(paragraph)
                self._current = []

    def handle_data(self, data: str) -> None:
        if self._skip:
            return
        value = data.strip()
        if not value:
            return
        self.all_text.append(value)
        if self._in_p:
            self._current.append(data)


def clean_text(value: str) -> str:
    value = html.unescape(value)
    value = value.replace("\u00a0", " ")
    value = re.sub(r"[ \t\r\f\v]+", " ", value)
    value = re.sub(r" *\n *", "\n", value)
    return value.strip()


def normalized(value: str) -> str:
    return re.sub(r"[\s_·・，。！？：；、（）()《》〈〉“”‘’\-—]", "", value).lower()


def extract_work(work: dict) -> dict | None:
    page_title = str(work.get("sourcePage") or work.get("title") or "").strip()
    title = str(work.get("title") or "").strip()
    author = str(work.get("author") or "").strip()
    if not page_title or not title or not author or "节选" in title:
        return None

    query = urllib.parse.urlencode({
        "action": "parse",
        "format": "json",
        "formatversion": "2",
        "prop": "text",
        "page": page_title,
    })
    data = request_json(f"{API}?{query}")
    parsed = data.get("parse") or {}
    returned_title = str(parsed.get("title") or "")
    source_html = str(parsed.get("text") or "")
    if not returned_title or not source_html:
        return None

    expected = normalized(page_title)
    actual = normalized(returned_title)
    if expected not in actual and actual not in expected:
        return None

    # Only import pages whose own rights notice marks the underlying work public domain.
    if "公有领域" not in source_html and "public domain" not in source_html.lower():
        return None

    extractor = ParagraphExtractor()
    extractor.feed(source_html)
    page_text = clean_text(" ".join(extractor.all_text))
    if author not in page_text[:5000]:
        return None

    excluded = (
        "公有领域", "public domain", "本作品现时", "本作品在", "检索自",
        "此页面最后编辑", "本站的全部文字", "使用条款", "维基文库",
        "分类：", "作者：", "本作品收录于",
    )
    paragraphs = [
        p for p in extractor.paragraphs
        if len(p) > 14 and not any(term.lower() in p.lower() for term in excluded)
    ]
    content = "\n\n".join(paragraphs).strip()
    if len(content) < MIN_CHARS:
        return None

    content = content[:MAX_CHARS]
    source_url = "https://zh.wikisource.org/wiki/" + urllib.parse.quote(returned_title.replace(" ", "_"))
    return {
        "id": work["id"],
        "title": title,
        "author": author,
        "year": str(work.get("year") or ""),
        "genre": work.get("genre", ""),
        "sourceUrl": source_url,
        "content": content,
        "attribution": f"作者：{author}；作品：{title}；来源：维基文库《{returned_title}》。",
        "license": "维基文库页面标注底层作品属于公有领域；页面文本采用 CC BY-SA 4.0，转载保留署名与相同方式共享。",
        "editionNote": "由维基文库公开页面下载；保留来源页面文字，不由模型补写。",
    }


def main() -> None:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    full = json.loads(FULLTEXT_PATH.read_text(encoding="utf-8"))
    works = catalog.get("works", [])
    full_works = full.setdefault("works", [])
    full_by_id = {item.get("id"): item for item in full_works}

    imported = []
    skipped = []
    failed = []
    for index, work in enumerate(works, start=1):
        work_id = work.get("id")
        if work_id in full_by_id:
            continue
        try:
            item = extract_work(work)
            if item is None:
                skipped.append(f"{work_id}: {work.get('title')}")
            else:
                full_by_id[work_id] = item
                imported.append(item)
                print(f"IMPORTED {work_id}: {work.get('title')} ({len(item['content'])} chars)")
        except Exception as exc:  # Keep processing the remaining catalog entries.
            failed.append(f"{work_id}: {work.get('title')} — {exc}")
            print(f"FAILED {work_id}: {work.get('title')} — {exc}")
        time.sleep(DELAY_SECONDS)

    if imported:
        ordered = {w["id"]: w for w in full_by_id.values()}
        full["works"] = [ordered[w["id"]] for w in works if w.get("id") in ordered]
        full["count"] = len(full["works"])
        full["updatedAt"] = time.strftime("%Y-%m-%d", time.gmtime())
        FULLTEXT_PATH.write_text(
            json.dumps(full, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

        imported_ids = {item["id"] for item in imported}
        for work in works:
            if work.get("id") in imported_ids:
                item = full_by_id[work["id"]]
                work["textMode"] = "local"
                work["source"] = "维基文库"
                work["sourceUrl"] = item["sourceUrl"]
                work["rightsStatus"] = (
                    "本地已收录全文；维基文库页面标注底层作品为公有领域，"
                    "页面文本按 CC BY-SA 4.0 署名与相同方式共享"
                )
        catalog["count"] = len(works)
        catalog["updatedAt"] = time.strftime("%Y-%m-%d", time.gmtime())
        CATALOG_PATH.write_text(
            json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    print("\nSUMMARY")
    print(f"Imported: {len(imported)}")
    print(f"Skipped (not found / not marked public domain / incomplete): {len(skipped)}")
    print(f"Failed requests: {len(failed)}")
    print(f"Total local full texts: {len(full_by_id)}")
    for item in skipped:
        print("SKIPPED", item)
    for item in failed:
        print("FAILED", item)


if __name__ == "__main__":
    main()
