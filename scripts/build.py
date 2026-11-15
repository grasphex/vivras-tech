#!/usr/bin/env python3
"""Build VIVRAS Tech static site and subject landings (stdlib only)."""
import html
import json
import os
import re
import shutil
import sys
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content"
DIST = ROOT / "dist"
FILENAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]*\.html$")

# Stable taxonomy: category names may expand, while existing article URLs never move.
# A category is displayed only after at least one article exists in it.
GROUPS = {
    "tech": {"title": "技術", "subtitle": "システムの仕組みを、図と操作で理解する。", "index": "topics/tech.html"},
    "society": {"title": "社会・教養", "subtitle": "政治・経済・地理・歴史など、社会の背景を理解する。", "index": "topics/society.html"},
    "health": {"title": "健康・暮らし", "subtitle": "脳・健康・妊活・暮らしの疑問を、根拠から整理する。", "index": "topics/health.html"},
}
CATEGORY_GROUP = {
    "Linux": "tech",
    "ネットワーク": "tech",
    "クラウド": "tech",
    "プログラミング": "tech",
    "情報セキュリティ": "tech",
    "政治・経済": "society",
    "地理・歴史": "society",
    "科学・教養": "society",
    "脳・健康": "health",
    "妊活": "health",
    "生活": "health",
}

def esc(value):
    return html.escape(str(value), quote=True)

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
    source = path.read_text(encoding="utf-8-sig")
    m = Metadata()
    m.feed(source)
    if not (m.has_html and m.has_main):
        raise ValueError(f"{path.name}: <html> and <main> required")
    category = m.meta.get("category", "")
    if category not in CATEGORY_GROUP:
        raise ValueError(f"{path.name}: unmapped category {category!r}; add to CATEGORY_GROUP")
    title = m.title.strip()
    desc = m.meta.get("description", "")
    if not title or not desc:
        raise ValueError(f"{path.name}: title and description required")
    published = m.meta.get("published", "")
    if published:
        date.fromisoformat(published)
    group = CATEGORY_GROUP[category]
    return {
        "slug": path.stem,
        "title": title,
        "description": desc,
        "category": category,
        "group": group,
        "group_name": GROUPS[group]["title"],
        "published": published,
        "keywords": m.meta.get("keywords", ""),
        "url": "articles/" + path.name,
    }

def render_cards(articles, prefix=""):
    chunks = []
    for a in articles:
        query = " ".join((a["title"], a["category"], a["description"], a["keywords"]))
        chunks.append(
            '<a class="article-card" href="{url}" data-filter="{text}" data-group="{group}" data-category="{cat}">'
            '<span class="article-top"><span class="category-pill">{category}</span>'
            '<span class="article-arrow" aria-hidden="true">↗</span></span>'
            '<h3>{title}</h3><p>{description}</p>'
            '<span class="article-footer">{published}<span>記事を読む →</span></span></a>'.format(
                url=esc(prefix + a["url"]), text=esc(query.lower()), group=esc(a["group"]),
                cat=esc(a["category"]), category=esc(a["category"]), title=esc(a["title"]),
                description=esc(a["description"]), published=esc(a["published"]),
            )
        )
    return "\n".join(chunks)

def render_topic_links(articles):
    counts = {g: len([a for a in articles if a["group"] == g]) for g in GROUPS}
    links = []
    for g, data in GROUPS.items():
        links.append(
            '<a class="topic-link" href="{url}" aria-label="{title}の記事一覧">'
            '<span class="topic-name">{title}<span class="topic-arrow" aria-hidden="true">↗</span></span>'
            '<span class="topic-desc">{subtitle}</span><span class="topic-count">{count} 記事</span></a>'.format(
                url=esc(data["index"]), title=esc(data["title"]), subtitle=esc(data["subtitle"]),
                count=counts[g],
            )
        )
    return "\n".join(links)

def render_group_buttons(articles):
    options = ['<button class="chip active" type="button" data-group="all" aria-pressed="true">すべて</button>']
    for g, data in GROUPS.items():
        if any(a["group"] == g for a in articles):
            options.append(
                '<button class="chip" type="button" data-group="{g}" aria-pressed="false">{name}</button>'.format(
                    g=g, name=esc(data["title"])
                )
            )
    return "\n".join(options)

def render_categories(articles):
    names = [cat for cat in CATEGORY_GROUP if any(a["category"] == cat for a in articles)]
    choices = ['<button class="chip active" type="button" data-category="all" aria-pressed="true">小分類：すべて</button>']
    choices += [
        '<button class="chip" type="button" data-category="{name}" data-parent="{parent}" aria-pressed="false">{name}</button>'.format(
            name=esc(name), parent=CATEGORY_GROUP[name])
        for name in names
    ]
    return "\n".join(choices)

def render_section(group, articles):
    data = GROUPS[group]
    selected = [a for a in articles if a["group"] == group]
    categories = [c for c in CATEGORY_GROUP if CATEGORY_GROUP[c] == group and any(a["category"] == c for a in selected)]
    lines = []
    for cat in categories:
        subset = [a for a in selected if a["category"] == cat]
        items = "\n".join(
            '<a class="topic-row" href="../{url}"><span class="topic-row-no">{number:02d}</span>'
            '<span><strong>{title}</strong><small>{desc}</small></span>'
            '<span aria-hidden="true">↗</span></a>'.format(
                url=esc(a["url"]),number=i,title=esc(a["title"]),desc=esc(a["description"])
            ) for i, a in enumerate(subset, 1)
        )
        lines.append(f'<section class="topic-block" id="{esc(cat)}"><div class="topic-block-heading">'
                     f'<h2>{esc(cat)}</h2><span>{len(subset)} 記事</span></div><div>{items}</div></section>')
    nav = "\n".join(
        f'<a href="{esc(GROUPS[g]["index"].split("/")[-1])}"'
        + (' aria-current="page"' if g == group else '') + f'>{esc(info["title"])}</a>'
        for g,info in GROUPS.items()
    )
    return f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(data["title"])}の記事一覧｜VIVRAS Tech</title>
<meta name="description" content="{esc(data["subtitle"])} VIVRAS Techの{esc(data["title"])}の記事を分類して探せます。">
<link rel="canonical" href="https://tech.grasphex.com/{data["index"]}">
<link rel="stylesheet" href="../assets/site.css"></head>
<body class="topic-page">
<header class="site-header"><div class="container topbar">
<a href="../index.html" class="logo" aria-label="VIVRAS Tech トップ"><span class="logo-mark">V</span>VIVRAS<span class="logo-light"> TECH</span></a>
<nav aria-label="大分類">{nav}</nav></div></header>
<main class="container">
<nav class="topic-crumb" aria-label="パンくず"><a href="../index.html">トップ</a> / {esc(data["title"])}</nav>
<section class="topic-hero"><p class="topic-eyebrow">EXPLORE / {group.upper()}</p>
<h1>{esc(data["title"])}</h1><p>{esc(data["subtitle"])}</p>
<div class="topic-subnav">{"".join(f'<a href="#{esc(c)}">{esc(c)} <span>↓</span></a>' for c in categories)}</div></section>
{"".join(lines)}
<p class="topic-bottom"><a href="../index.html#articles">すべての記事を見る →</a></p>
</main><footer class="site-footer"><div class="container footer-row"><span>© VIVRAS Tech</span><span>仕事・学び・日々の記録</span></div></footer></body></html>'''

def render_sitemap(articles, site_url):
    def entry(loc, lastmod):
        tag = f"<lastmod>{lastmod}</lastmod>" if lastmod else ""
        return f"  <url><loc>{html.escape(loc)}</loc>{tag}</url>"
    newest = max((a["published"] for a in articles if a["published"]), default="")
    urls = [entry(site_url + "/", newest)]
    urls += [entry(f"{site_url}/{a['url']}", a["published"]) for a in articles]
    urls += [entry(f"{site_url}/{info['index']}", newest) for info in GROUPS.values()]
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(urls) + "\n</urlset>\n"

def build():
    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / "articles").mkdir(parents=True)
    (DIST / "topics").mkdir(parents=True)
    shutil.copytree(ROOT / "assets", DIST / "assets")
    if (ROOT / "static").is_dir():
        shutil.copytree(ROOT / "static", DIST, dirs_exist_ok=True)
        # Earlier review-only URLs are kept working but should always lead
        # readers to the maintained, canonical article rather than old copies.
        target = "https://tech.grasphex.com/articles/ai-tax-and-jobs.html"
        for old in (ROOT / "static").glob("ai-tax-*.html"):
            redirect = (f'<!doctype html><html lang="ja"><head><meta charset="utf-8">'
                        f'<meta name="robots" content="noindex,follow">'
                        f'<meta http-equiv="refresh" content="0;url={target}">'
                        f'<link rel="canonical" href="{target}">'
                        f'<title>最新版の記事へ移動｜VIVRAS Tech</title></head>'
                        f'<body><p>記事は<a href="{target}">最新版</a>に更新されました。</p></body></html>')
            (DIST / old.name).write_text(redirect, encoding="utf-8")
    articles = []
    for path in sorted(CONTENT.glob("*.html")):
        if not FILENAME_RE.fullmatch(path.name):
            raise ValueError(f"Invalid article slug: {path.name}")
        a = article_meta(path)
        articles.append(a)
        shutil.copy2(path, DIST / "articles" / path.name)
    articles.sort(key=lambda a: (a["published"], a["slug"]), reverse=True)
    template = (ROOT / "templates" / "index.html").read_text(encoding="utf-8")
    for required in ("<!--ARTICLE_LIST-->","<!--TOPIC_LINKS-->","<!--GROUP_BUTTONS-->","<!--CATEGORY_BUTTONS-->"):
        if required not in template:
            raise ValueError(f"Missing index placeholder {required}")
    index = (template.replace("<!--ARTICLE_LIST-->", render_cards(articles))
                     .replace("<!--TOPIC_LINKS-->", render_topic_links(articles))
                     .replace("<!--GROUP_BUTTONS-->", render_group_buttons(articles))
                     .replace("<!--CATEGORY_BUTTONS-->", render_categories(articles))
                     .replace("__ARTICLE_COUNT__", str(len(articles))))
    (DIST / "index.html").write_text(index, encoding="utf-8")
    for g, data in GROUPS.items():
        (DIST / data["index"]).write_text(render_section(g, articles), encoding="utf-8")
    base = os.environ.get("SITE_BASE_PATH", "").rstrip("/")
    (DIST / "404.html").write_text((ROOT / "templates" / "404.html").read_text(encoding="utf-8").replace("__BASE__", base), encoding="utf-8")
    site_url = (os.environ.get("SITE_URL") or "https://tech.grasphex.com").rstrip("/")
    site_url = re.sub(r"^http://", "https://", site_url)
    (DIST / "sitemap.xml").write_text(render_sitemap(articles, site_url), encoding="utf-8")
    (DIST / ".nojekyll").write_text("", encoding="utf-8")
    (DIST / "articles.json").write_text(json.dumps(articles, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Built {len(articles)} articles across {len(GROUPS)} topic pages")
    for a in articles:
        print(f"  {a['url']} : {a['group_name']} / {a['category']}")

if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    build()
