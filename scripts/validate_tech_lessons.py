#!/usr/bin/env python3
"""Editorial checks for succinct, visual-first technical lessons."""
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1] / "content"
CASES = {
    "linux-root-filesystem-remount.html": {
        "condition": "conditions",
        "commands": "verify",
        "examples": ("/dev/sdb1", "/mnt/data", "ファイルが移動"),
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
    if filename == "linux-root-filesystem-remount.html":
        order = ("problem", "conditions", "check", "verify")
    else:
        order = ("problem", "flow", req["condition"], req["commands"], "check")
    pos = [h.find(f'id="{name}"') for name in order]
    assert all(p >= 0 for p in pos) and pos == sorted(pos), (filename, pos)
    assert 'id="terms"' not in h and 'class="lesson-terms"' not in h, filename
    if filename != "linux-root-filesystem-remount.html":
        assert 'aria-live="polite"' in h, filename
    assert h.count('class="vterm"') >= 4 and 'assets/terms.js' in h, filename
    if filename == "linux-root-filesystem-remount.html":
        assert 'class="ed-visual"' in h and 'class="ed-file-flow"' in h and 'class="ed-mode-flow"' in h, filename
        assert 'class="mount-editorial"' in h and 'assets/mount-editorial.css' in h, filename
        assert h.count('<figure') == 1 and h.count('<h1') == 1, filename
        assert h.count('<details>') == 2 and 'class="ed-extras"' in h, filename
        assert 'class="ed-transcript"' in h and 'Read-only file system' in h, filename
        assert 'sudo mount -o remount,rw /mnt/data' in h, filename
        assert h.count('sudo touch /mnt/data/new.txt') == 2, filename
        assert 'ls /mnt/data/new.txt' in h, filename
        assert h.index('touch: cannot touch') < h.index('sudo mount -o remount,rw /mnt/data') < h.rindex('sudo touch /mnt/data/new.txt') < h.index('ls /mnt/data/new.txt'), filename
        assert 'mount-lab.js' not in h and 'mount-command-lab' not in h, filename
        assert 'data-lab-next' not in h and 'id="mount-mode"' not in h, filename
    else:
        assert 'class="article-body tech-lesson"' in h, filename
        assert 'class="lesson-figure' in h, filename
        assert 'class="lesson-try"' in h, filename
        assert h.count('<details class="article-expand') >= 4, filename
        assert 'class="lesson-quiz"' in h and '<script>' in h, filename
    assert all(x in h for x in req["examples"]), filename
    assert req["source"] in h, filename
    # Term help markup increases source length without adding scrolling.
    assert len(h) < 18000, f"Review for excess source length: {filename} {len(h)}"
    print(f"PASS {filename}: problem → illustration → conditional demo, on-demand definitions and sources")
print("All technical lessons passed editorial checks.")
