#!/usr/bin/env python3
"""Build static article site. Uses only the Python standard library."""
import html
import json
import re
import os
import shutil
import sys
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content"
DIST = ROOT / "dist"
FILENAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]*\.html$")

class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self.in_title = False
        self.meta = {}
        self.has_html = False
        self.has_main = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "html":
            self.has_html = True
        if tag == "main":
            self.has_main = True
        if tag == "title":
            self.in_title = True
        if tag == "meta" and attrs.get("name"):
            self.meta[attrs["name"].lower()] = attrs.get("content", "").strip()

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


def article_meta(path):
    raw = path.read_text(encoding="utf-8-sig")
    m = Metadata()
    m.feed(raw)
    if not (m.has_html and m.has_main):
        raise ValueError(f"{path.name}: <html> and <main> are required")
    title = m.title.strip()
    desc = m.meta.get("description", "")
    category = m.meta.get("category", "")
    if not title or not desc or not category:
        raise ValueError(f"{path.name}: <title>, description and category metadata are required")
    published = m.meta.get("published", "")
    if published:
        try:
            date.fromisoformat(published)
        except ValueError as exc:
            raise ValueError(f"{path.name}: published must be YYYY-MM-DD") from exc
    return {
        "slug": path.stem,
        "title": title,
        "description": desc,
        "category": category,
        "published": published,
        "keywords": m.meta.get("keywords", ""),
        "url": "articles/" + path.name,
    }


def render_cards(articles):
    chunks = []
    for a in articles:
        text = " ".join((a["title"], a["category"], a["description"], a["keywords"]))
        chunks.append(
            '<a class="article-card" href="{url}" data-filter="{filter}">'
            '<span class="article-top"><span class="category-pill">{category}</span>'
            '<span class="article-arrow" aria-hidden="true">↗</span></span>'
            '<h3>{title}</h3><p>{description}</p>'
            '<span class="article-footer">{published}<span>記事を読む →</span></span></a>'.format(
                url=html.escape(a["url"], quote=True),
                filter=html.escape(text.lower(), quote=True),
                title=html.escape(a["title"]),
                category=html.escape(a["category"]),
                description=html.escape(a["description"]),
                published=html.escape(a["published"] or "技術解説"),
            )
        )
    return "\n".join(chunks)


def render_categories(articles):
    names = sorted({a["category"] for a in articles})
    buttons = ['<button class="chip active" type="button" data-category="all" aria-pressed="true">すべて</button>']
    for name in names:
        safe = html.escape(name, quote=True)
        buttons.append(f'<button class="chip" type="button" data-category="{safe}" aria-pressed="false">{html.escape(name)}</button>')
    return "".join(buttons)


def build():
    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / "articles").mkdir(parents=True)
    shutil.copytree(ROOT / "assets", DIST / "assets")
    articles = []
    for path in sorted(CONTENT.glob("*.html")):
        if not FILENAME_RE.fullmatch(path.name):
            raise ValueError(f"Invalid filename: {path.name}; use lowercase letters/numbers/hyphens")
        a = article_meta(path)
        articles.append(a)
        shutil.copy2(path, DIST / "articles" / path.name)
    articles.sort(key=lambda a: (a["published"], a["slug"]), reverse=True)
    template = (ROOT / "templates" / "index.html").read_text(encoding="utf-8")
    if "<!--ARTICLE_LIST-->" not in template:
        raise ValueError("Missing ARTICLE_LIST placeholder")
    rendered = (template.replace("<!--ARTICLE_LIST-->", render_cards(articles))
               .replace("<!--CATEGORY_BUTTONS-->", render_categories(articles))
               .replace("__ARTICLE_COUNT__", str(len(articles))))
    (DIST / "index.html").write_text(rendered, encoding="utf-8")
    # 404.html is served for any missing path, so links must be absolute.
    base = os.environ.get("SITE_BASE_PATH", "").rstrip("/")
    (DIST / "404.html").write_text((ROOT / "templates" / "404.html").read_text(encoding="utf-8").replace("__BASE__", base), encoding="utf-8")
    (DIST / ".nojekyll").write_text("", encoding="utf-8")
    (DIST / "articles.json").write_text(json.dumps(articles, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Built {len(articles)} articles into {DIST}")
    for a in articles:
        print(f"  - {a['url']} ({a['category']})")

if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    build()
