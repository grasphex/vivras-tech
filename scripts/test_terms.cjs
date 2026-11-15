#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function el(label, explanation = "") {
  const listeners = {};
  const attributes = {};
  const element = {
    textContent: label,
    dataset: explanation ? { explain: explanation } : {},
    style: {},
    hidden: false,
    offsetWidth: 310,
    offsetHeight: 135,
    listeners,
    focusCalled: false,
    setAttribute(name, value) { attributes[name] = value; },
    getAttribute(name) { return attributes[name]; },
    removeAttribute(name) { delete attributes[name]; },
    addEventListener(name, callback) { listeners[name] = callback; },
    emit(name, event = {}) {
      if (!listeners[name]) throw new Error("No listener for " + name);
      return listeners[name](event);
    },
    getBoundingClientRect() { return { left: 62, right: 122, top: 150, bottom: 177 }; },
    focus() { this.focusCalled = true; },
    closest(selector) { return selector === "button.vterm" ? this : null; },
    contains(target) { return target === element || Object.values(element.children || {}).includes(target); },
    querySelector(selector) { return (this.children || {})[selector]; },
  };
  return element;
}

const first = el("ドメイン名", "ネット上の名前です。");
const second = el("DNS", "名前からIPアドレスを調べる仕組みです。");
const title = el(""), description = el(""), dismiss = el("×");
const panel = el("");
panel.children = {
  ".vterm-note-title": title,
  ".vterm-note-text": description,
  ".vterm-note-close": dismiss,
};
panel.hidden = true;
const docListeners = {}, winListeners = {};
const document = {
  querySelectorAll(query) { assert.equal(query, "button.vterm[data-explain]"); return [first, second]; },
  createElement(tag) { assert.equal(tag, "aside"); return panel; },
  body: { appendChild(element) { assert.equal(element, panel); } },
  addEventListener(name, callback) { docListeners[name] = callback; },
};
const window = {
  innerWidth: 950,
  innerHeight: 600,
  addEventListener(name, callback) { winListeners[name] = callback; },
};
vm.runInNewContext(fs.readFileSync("assets/terms.js", "utf8"), { document, window }, { filename: "assets/terms.js" });
assert.equal(first.getAttribute("aria-expanded"), "false");
assert.equal(second.getAttribute("aria-expanded"), "false");
first.emit("click");
assert.equal(panel.hidden, false);
assert.equal(first.getAttribute("aria-expanded"), "true");
assert.equal(title.textContent, "ドメイン名");
assert.equal(description.textContent, "ネット上の名前です。");
assert.ok(panel.style.top.endsWith("px"));
first.emit("click");
assert.equal(panel.hidden, true);
assert.equal(first.getAttribute("aria-expanded"), "false");
second.emit("click");
assert.equal(panel.hidden, false);
assert.equal(description.textContent, "名前からIPアドレスを調べる仕組みです。");
first.emit("click");
assert.equal(second.getAttribute("aria-expanded"), "false");
assert.equal(first.getAttribute("aria-expanded"), "true");
const outside = { closest: () => null };
docListeners.pointerdown({ target: outside });
assert.equal(panel.hidden, true);
first.emit("click");
const event = { key: "Escape", preventDefault() { this.prevented = true; } };
docListeners.keydown(event);
assert.equal(panel.hidden, true);
assert.equal(event.prevented, true);
assert.equal(first.focusCalled, true);
first.emit("click");
dismiss.emit("click");
assert.equal(panel.hidden, true);
first.emit("click");
winListeners.scroll();
assert.equal(panel.hidden, true);
console.log("Term popup UI state tests passed: open / toggle / switch / dismiss / Escape / scroll / focus.");
