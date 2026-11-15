#!/usr/bin/env python3
"""Editorial contract for the location-data explainer."""
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/"content/smartphone-location-data.html").read_text(encoding="utf-8")
js=(ROOT/"assets/location-data-explainer.js").read_text(encoding="utf-8")
css=(ROOT/"assets/location-data-explainer.css").read_text(encoding="utf-8")
class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids=set()
        self.buttons=0
        self.terms=0
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if "id" in attrs:
            assert attrs["id"] not in self.ids, attrs["id"]
            self.ids.add(attrs["id"])
        if tag=="button" and "vterm" in attrs.get("class","").split():
            self.terms+=1
            assert attrs.get("data-explain") and attrs.get("aria-label")
p=Page()
p.feed(source)
assert source.count("<h1") == 1
assert p.terms>=3
for section in ("report","mechanism","tracking","known","law","actions","sources"):
    assert section in p.ids
positions=[source.index('id="'+key+'"') for key in ("report","mechanism","tracking","known","law","actions","sources")]
assert positions==sorted(positions)
for identifier in ("location-flow","location-counter","location-heading","location-detail","location-caption","location-back","location-play","location-next"):
    assert identifier in p.ids
for mode in ("sdk","app"):
    assert 'data-flow-mode="'+mode+'"' in source
for phrase in ("304施設","1万超","4,000万超","確定できない","本人の事前同意","教育目的の架空モデル"):
    assert phrase in source,phrase
for url in ("ppc.go.jp/personalinfo/legal/guidelines_tsusoku/","ppc.go.jp/all_faq_index/faq2-q2-8/","ppc.go.jp/all_faq_index/faq1-q8-3/"):
    assert url in source
assert 'assets/terms.js' in source and 'assets/location-data-explainer.js' in source and 'assets/location-data-explainer.css' in source
assert "sdk:[" in js and "app:[" in js and "reduced.matches" in js
assert 'prefers-reduced-motion:reduce' in css and 'max-width:700px' in css
assert source.count("<details") >= 4
print("Location-data editorial checks passed: evidence vs model, SDK routes, legal facts, interactivity.")
