#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const events = {};
function node(name) {
  return {
    name,
    textContent: "",
    dataset: {},
    scrollTop: 0,
    scrollHeight: 250,
    on: {},
    addEventListener(event, handler) { this.on[event] = handler; },
    click() { assert.equal(typeof this.on.click, "function", "click listener missing"); this.on.click(); }
  };
}
const buttons = ["inspect", "write", "remountrw", "remountro", "read"].map(key => {
  const el = node(key);
  el.dataset.labCommand = key;
  return el;
});
const elements = new Map([
  ["[data-lab-reset]", node("reset")],
  ["#mount-terminal", node("terminal")],
  ["#mount-live-mode", node("mode")],
  ["#mount-mode-message", node("message")],
  ["#mount-last-result", node("last")],
  ["#mount-ro-write", node("ro-write")],
  ["#mount-rw-write", node("rw-write")],
  ["#mount-learned", node("takeaway")]
]);
const root = {
  querySelector(selector) { assert.ok(elements.has(selector), "Unexpected selector " + selector); return elements.get(selector); },
  querySelectorAll(selector) { assert.equal(selector, "button[data-lab-command]"); return buttons; }
};
const document = {
  getElementById(id) { assert.equal(id, "mount-command-lab"); return root; }
};
vm.runInNewContext(fs.readFileSync("assets/mount-lab.js", "utf8"), { document }, { filename: "assets/mount-lab.js" });
const get = (selector) => elements.get(selector);
const run = (key) => buttons.find(el => el.dataset.labCommand === key).click();
const terminal = () => get("#mount-terminal").textContent;

// Initial state must be ro without the reader choosing a Japanese dropdown.
assert.match(get("#mount-live-mode").textContent, /^ro/);
assert.equal(get("#mount-ro-write").textContent, "未実行");
assert.equal(get("#mount-rw-write").textContent, "未実行");

// The SAME write command is attempted before and after remount.
run("write");
assert.match(terminal(), /touch: cannot touch.*Read-only file system/);
assert.match(get("#mount-ro-write").textContent, /失敗/);
run("inspect");
assert.match(terminal(), /\/ ro,relatime/);
run("remountrw");
assert.equal(get("#mount-live-mode").dataset.mode, "rw");
assert.match(get("#mount-last-result").textContent, /ro → rw/);
run("write");
assert.match(get("#mount-rw-write").textContent, /成功/);
assert.match(get("#mount-learned").textContent, /同じ touch コマンドでも/);
run("inspect");
assert.match(terminal(), /\/ rw,relatime/);

// Returning to ro must block the same operation again but keep reads available.
run("remountro");
assert.equal(get("#mount-live-mode").dataset.mode, "ro");
run("write");
assert.match(get("#mount-last-result").textContent, /書き込み失敗/);
run("read");
assert.match(terminal(), /vivras-demo-host/);
assert.match(get("#mount-last-result").textContent, /読み取り成功/);

// Repeated remount commands must report true previous/current state.
run("remountro");
assert.match(get("#mount-last-result").textContent, /ro → ro/);
get("[data-lab-reset]").click();
assert.equal(get("#mount-live-mode").dataset.mode, "ro");
assert.equal(get("#mount-ro-write").textContent, "未実行");
assert.equal(get("#mount-rw-write").textContent, "未実行");
assert.doesNotMatch(terminal(), /Read-only file system/);
console.log("PASS mount simulator: ro write fail → remount rw → same write succeeds → remount ro → write fails, read succeeds, reset.");
