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
    # Terms must be explained where first used; no standalone glossary or hidden main idea.
    for a in articles:
        source = (DIST / a["url"]).read_text(encoding="utf-8")
        assert 'src="../assets/terms.js"' in source, f"Missing inline definitions: {a['slug']}"
        assert 'id="words"' not in source and 'id="terms"' not in source, f"Standalone glossary remains: {a['slug']}"
        assert "<details" in source, f"No progressive detail control: {a['slug']}"
        class Inline(HTMLParser):
            def __init__(self):
                super().__init__()
                self.buttons = []
            def handle_starttag(self, tag, pairs):
                attrs = dict(pairs)
                if tag == "button" and "vterm" in attrs.get("class", "").split():
                    self.buttons.append(attrs)
        parsed = Inline()
        parsed.feed(source)
        assert len(parsed.buttons) >= 3, f"Too few contextual definitions: {a['slug']}"
        assert all(x.get("type") == "button" and len(x.get("data-explain", "")) > 12 and x.get("aria-label") for x in parsed.buttons), f"Broken inline definitions: {a['slug']}"
    # Thailand educational map: real country and river vectors are bundled as
    # self-contained SVG. No Leaflet tiles or CDN styles should leak into article.
    thai = (DIST / "articles" / "thailand-geography.html").read_text(encoding="utf-8")
    assert 'id="thai-map"' not in thai and 'leaflet.js' not in thai, "Crowded Leaflet map returned"
    assert "geo-map-scroll" in thai and "overflow-x:auto" in thai, "Mobile map overflow control missing"
    for name in ("thailand-learning-country.svg", "thailand-chao-phraya.svg"):
        path = DIST / "assets" / name
        assert path.is_file(), f"Missing educational vector map: {name}"
        data = path.read_text(encoding="utf-8")
        assert "<svg " in data and "viewBox=" in data, f"Broken SVG map: {name}"
        assert "Chao Phraya" in data or "チャオプラヤ川" in data, f"Missing river: {name}"
        assert f'../assets/{name}' in thai, f"Article not linked to map: {name}"
    assert "www.naturalearthdata.com" in thai, "Geodata source missing"
    assert (DIST / "assets" / "terms.js").is_file(), "Missing shared term behavior"
    assert (DIST / "assets" / "mount-editorial.css").is_file(), "Missing editorial mount styles"
    orange_css = DIST / "assets" / "refined-orange-v11.css"
    assert orange_css.is_file(), "Missing orange brand stylesheet"
    stylesheet = orange_css.read_text(encoding="utf-8")
    assert "--brand-orange:#F26A3D" in stylesheet, "Orange accent token changed"
    assert "--brand-orange-deep:#B83E16" in stylesheet, "High-contrast orange text token changed"
    assert "--brand-cream:#F8F7F4" in stylesheet, "Neutral background token changed"
    assert ".home .topic-directory{background:#FFF" in stylesheet, "Large orange directory background returned"
    assert ".topic-page .topic-hero{background:#FFF" in stylesheet, "Large orange topic background returned"
    assert ".mount-editorial .ed-hero{background:transparent" in stylesheet, "Large orange Linux hero returned"
    def color_luminance(hexcode):
        rgb = [int(hexcode[i:i+2], 16)/255 for i in (1, 3, 5)]
        adjusted = [c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in rgb]
        return sum(k * x for k,x in zip((.2126,.7152,.0722), adjusted))
    def contrast_ratio(first, second):
        l1,l2 = color_luminance(first),color_luminance(second)
        return (max(l1,l2)+.05)/(min(l1,l2)+.05)
    for foreground, background in (
        ("#1F292F","#F8F7F4"),  # body on ivory
        ("#58656B","#F8F7F4"),  # muted on ivory
        ("#B83E16","#FFFFFF"),  # links on white
        ("#B83E16","#F8F7F4"),  # links on ivory
        ("#B83E16","#FFF0E6"),  # links on pale orange
        ("#FFFFFF","#20313B"),  # white on dark terminal/nav
    ):
        assert contrast_ratio(foreground, background) >= 4.5, f"Text contrast too low: {foreground} on {background}"
    assert "@media(max-width:600px)" in stylesheet, "Missing mobile branding treatment"
    assert "prefers-reduced-motion" in stylesheet, "Reduced-motion preference unsupported"
    for page in pages:
        source = page.read_text(encoding="utf-8")
        expected = 'href="assets/refined-orange-v11.css"' if page.name == "index.html" and page.parent == DIST else 'href="../assets/refined-orange-v11.css"'
        assert expected in source, f"Orange theme not loaded in {page.relative_to(DIST)}"
    for name in EXPECTED_TOPICS:
        group_page = (DIST / "topics" / f"{name}.html").read_text(encoding="utf-8")
        for a in articles:
            if a["group"] == name:
                assert f"../{a['url']}" in group_page, f"Missing article on {name} page"
    # Old versioned preview URLs must not strand visitors on outdated layouts.
    for snapshot in (ROOT / "static").glob("ai-tax-*.html"):
        published = (DIST / snapshot.name).read_text(encoding="utf-8")
        assert 'http-equiv="refresh"' in published, f"Missing redirect for {snapshot.name}"
        assert "articles/ai-tax-and-jobs.html" in published
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
