#!/usr/bin/env python3
"""Editorial checks for succinct, visual-first technical lessons."""
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1] / "content"
CASES = {
    "linux-root-filesystem-remount.html": {
        "condition": "conditions",
        "commands": "verify",
        "examples": ("/dev/sdb1", "/mnt/data/report.txt", "コピーやファイル移動はしていません"),
        "source": "man7.org",
    },
    "firewalld-zones.html": {
        "condition": "try",
        "commands": "commands",
        "examples": ("eth0", "eth1", "zoneごとに設定が独立"),
        "source": "docs.redhat.com",
    },
    "dns-resolution.html": {
        "condition": "cache",
        "commands": "commands",
        "examples": ("ルートDNS", ".comのDNS", "ブラウザが取得したIPアドレス"),
        "source": "cloudflare.com",
    },
}
for filename, req in CASES.items():
    h = (ROOT / filename).read_text(encoding="utf-8")
    order = ("problem", "flow", req["condition"], req["commands"], "check")
    pos = [h.find(f'id="{name}"') for name in order]
    assert all(p >= 0 for p in pos) and pos == sorted(pos), (filename, pos)
    assert 'id="terms"' not in h and 'class="lesson-terms"' not in h, filename
    assert 'class="article-body tech-lesson"' in h, filename
    assert 'class="lesson-figure' in h, filename
    assert 'aria-live="polite"' in h, filename
    if filename == "linux-root-filesystem-remount.html":
        assert 'class="mount-command-lab"' in h, filename
    else:
        assert 'class="lesson-try"' in h, filename
    assert h.count('class="vterm"') >= 4 and 'assets/terms.js' in h, filename
    assert h.count('<details class="article-expand') >= 4, filename
    assert 'class="lesson-quiz"' in h, filename
    if filename == "linux-root-filesystem-remount.html":
        assert 'src="../assets/mount-lab.js"' in h, filename
        assert 'id="mount-command-lab"' in h and 'data-lab-command="write"' in h, filename
        assert 'sudo mount -o remount,rw /' in h and 'sudo touch /vivras-demo.txt' in h, filename
        assert 'id="mount-ro-write"' in h and 'id="mount-rw-write"' in h, filename
        assert 'id="mount-mode"' not in h and '<script>(()=>' not in h, filename
    else:
        assert '<script>' in h, filename
    assert all(x in h for x in req["examples"]), filename
    assert req["source"] in h, filename
    # Term help markup increases source length without adding scrolling.
    assert len(h) < 18000, f"Review for excess source length: {filename} {len(h)}"
    print(f"PASS {filename}: problem → illustration → conditional demo, on-demand definitions and sources")
print("All technical lessons passed editorial checks.")
