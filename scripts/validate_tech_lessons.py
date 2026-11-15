#!/usr/bin/env python3
"""Editorial structural checks for self-contained beginner tech lessons.

These checks catch missing causal steps; they do not replace human fact review.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / "content"
CASES = {
    "linux-root-filesystem-remount.html": {
        "condition": "conditions",
        "terms": ("保存領域", "ファイルシステム", "マウントポイント"),
        "logic": ("/dev/sdb1", "/mnt/data/report.txt", "コピーやファイル移動はしていません"),
        "source": "man7.org",
    },
    "firewalld-zones.html": {
        "condition": "try",
        "terms": ("ポート番号", "TCP / UDP", "zone"),
        "logic": ("eth0", "eth1", "zoneごとに設定が独立"),
        "source": "docs.redhat.com",
    },
    "dns-resolution.html": {
        "condition": "cache",
        "terms": ("ドメイン名", "再帰DNS", "権威DNS"),
        "logic": ("ルートDNS", ".comのDNS", "ブラウザが取得したIPアドレス"),
        "source": "cloudflare.com",
    }
}

for filename, requirements in CASES.items():
    source = (ROOT / filename).read_text(encoding="utf-8")
    assert "<article" in source and 'class="article-body tech-lesson"' in source, filename
    order = ["problem", "terms", "flow", requirements["condition"], "commands" if filename != "linux-root-filesystem-remount.html" else "verify", "check"]
    positions = [source.find(f'id="{id_}"') for id_ in order]
    assert all(position >= 0 for position in positions) and positions == sorted(positions), (filename, positions)
    assert source.find('<dl class="lesson-terms">') < source.find('<figure class="lesson-figure'), filename
    assert len(re.findall(r'<div class="lesson-kicker">', source)) == 6, filename
    assert len(re.findall(r'<summary>', source)) in (3, 4), filename
    assert source.count('class="lesson-result"') >= 1, filename
    assert 'class="lesson-try"' in source, filename
    assert 'aria-live="polite"' in source, filename
    assert re.search(r'<script>\s*\(\(\)=>', source), filename
    assert all(phrase in source for phrase in requirements["terms"]), filename
    assert all(phrase in source for phrase in requirements["logic"]), filename
    assert requirements["source"] in source, filename
    assert "原則として" not in source or "規定" in source or "条件" in source, filename
    assert len(source) < 10000, f"Review for unnecessary length: {filename} {len(source)} characters"
    assert "class=\"plain-steps\"" not in source and "class=\"visual-grid\"" not in source, filename
    print(f"PASS {filename}: section logic, terms, example, edge conditions and sources")

print("All three technical lessons passed editorial structural checks.")
