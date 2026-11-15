#!/usr/bin/env python3
"""Validate subject navigation, metadata and local links of a built site."""
import json
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
EXPECTED_TOPICS = ("tech", "society", "health")

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = []
        self.headings = []
        self.has_main = False
        self.has_lang = False
        self.has_desc = False
        self.heading_mode = False
        self.heading_buffer = []
    def handle_starttag(self, tag, raw_attrs):
        attrs = dict(raw_attrs)
        if tag == "html":
            self.has_lang = attrs.get("lang") == "ja"
        if tag == "main":
            self.has_main = True
        if tag == "meta" and attrs.get("name") == "description":
            self.has_desc = bool(attrs.get("content"))
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag in ("a", "link", "script"):
            candidate = attrs.get("href") or attrs.get("src")
            if candidate:
                self.links.append(candidate)
        if tag == "h1":
            self.heading_mode = True
            self.heading_buffer = []
    def handle_endtag(self, tag):
        if tag == "h1":
            self.heading_mode = False
            self.headings.append("".join(self.heading_buffer).strip())
    def handle_data(self, data):
        if self.heading_mode:
            self.heading_buffer.append(data)

def validate():
    articles_path = DIST / "articles.json"
    if not articles_path.is_file():
        raise AssertionError("Missing articles.json; first run scripts/build.py")
    articles = json.loads(articles_path.read_text(encoding="utf-8"))
    if not articles:
        raise AssertionError("Site has no articles")
    categories = {x["category"] for x in articles}
    assert "教養" not in categories, "Too-broad category still used"
    assert {x["group"] for x in articles} == set(EXPECTED_TOPICS), "Expected 3 populated groups"
    for x in articles:
        assert (DIST / x["url"]).is_file(), "Missing article: " + x["url"]
        assert x["group_name"] and x["description"] and x["category"]
    pages = [DIST / "index.html"] + [DIST / "topics" / f"{name}.html" for name in EXPECTED_TOPICS]
    pages += [DIST / x["url"] for x in articles]
    for page in pages:
        if not page.is_file():
            raise AssertionError(f"Missing page: {page}")
        parser = Page()
        parser.feed(page.read_text(encoding="utf-8"))
        assert parser.has_lang and parser.has_main and parser.has_desc, f"Missing html metadata in {page}"
        assert len(parser.headings) == 1, f"Expected single page H1 in {page}, got {parser.headings}"
        assert len(parser.ids) == len(set(parser.ids)), f"Duplicate IDs in {page}"
        for link in parser.links:
            parsed = urlsplit(link)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            target = (page.parent / unquote(parsed.path)).resolve()
            if target.is_dir():
                target = target / "index.html"
            assert target.is_file(), f"Broken internal path {link} in {page.relative_to(DIST)}"
    for name in EXPECTED_TOPICS:
        group_page = (DIST / "topics" / f"{name}.html").read_text(encoding="utf-8")
        for a in articles:
            if a["group"] == name:
                assert f"../{a['url']}" in group_page, f"Missing article on {name} page"
    homepage = (DIST / "index.html").read_text(encoding="utf-8")
    assert 'id="groups"' in homepage and 'id="categories"' in homepage
    assert 'href="topics/tech.html"' in homepage
    assert 'href="topics/society.html"' in homepage
    assert 'href="topics/health.html"' in homepage
    assert not (DIST / "index.html").read_text(encoding="utf-8").count('class="article-card"') != len(articles)
    print(f"QA passed: {len(pages)} public pages / {len(articles)} articles / {len(EXPECTED_TOPICS)} topics.")

if __name__ == "__main__":
    try:
        validate()
    except (AssertionError, ValueError) as err:
        print(f"QA FAILED: {err}", file=sys.stderr)
        sys.exit(1)
