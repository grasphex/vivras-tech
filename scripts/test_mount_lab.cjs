#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function element(name) {
  return {
    name, textContent: "", hidden: false, dataset: {}, attrs: {}, handlers: {},
    addEventListener(type, callback) { this.handlers[type] = callback; },
    click() { assert.equal(typeof this.handlers.click, "function"); this.handlers.click(); },
    setAttribute(k, v) { this.attrs[k] = v; },
    removeAttribute(k) { delete this.attrs[k]; }
  };
}
const names = [
  "#mount-live-mode", "#mount-file-state", "#mount-next-panel",
  "[data-lab-next]", "#mount-lab-step", "#mount-lab-task",
  "#mount-next-command", "#mount-terminal",
  "#mount-reason-request", "#mount-reason-check", "#mount-reason-result",
  "#mount-lab-conclusion", "#mount-history", "[data-lab-reset]"
];
const nodes = new Map(names.map(n => [n, element(n)]));
const progress = [...Array(5)].map((_, i) => element("step" + i));
const root = {
  querySelector(name) {
    assert.ok(nodes.has(name), "Unknown selector: " + name);
    return nodes.get(name);
  },
  querySelectorAll(name) {
    assert.equal(name, "[data-lab-progress]");
    return progress;
  }
};
const document = { getElementById(id) { assert.equal(id, "mount-command-lab"); return root; } };
vm.runInNewContext(fs.readFileSync("assets/mount-lab.js", "utf8"), { document });
const e = k => nodes.get(k);
const go = () => e("[data-lab-next]").click();

assert.equal(e("#mount-live-mode").dataset.mode, "ro");
assert.equal(e("#mount-file-state").textContent, "存在しない");
assert.match(e("#mount-next-command").textContent, /findmnt/);
assert.equal(progress[0].attrs["aria-current"], "step");
assert.equal(e("#mount-lab-conclusion").hidden, true);

// 1. Inspect the original condition, not just choose a mode.
go();
assert.match(e("#mount-terminal").textContent, /\/ ro,relatime/);
assert.equal(progress[0].dataset.state, "completed");
assert.match(e("#mount-next-command").textContent, /sudo touch/);

// 2. Observe a real request fail under ro, no file created.
go();
assert.match(e("#mount-terminal").textContent, /Read-only file system/);
assert.match(e("#mount-reason-request").textContent, /ファイル/);
assert.match(e("#mount-reason-check").textContent, /ro/);
assert.match(e("#mount-reason-result").textContent, /拒否/);
assert.equal(e("#mount-file-state").textContent, "存在しない");

// 3. remount changes only the mount option, not the file or path.
go();
assert.match(e("#mount-terminal").textContent, /mount -o remount,rw \//);
assert.equal(e("#mount-live-mode").dataset.mode, "rw");
assert.equal(e("#mount-file-state").textContent, "存在しない");
assert.match(e("#mount-reason-check").textContent, /接続先やファイルを移動しない/);

// 4. SAME touch succeeds under rw and creates the file.
go();
assert.match(e("#mount-terminal").textContent, /sudo touch \/vivras-demo.txt/);
assert.match(e("#mount-terminal").textContent, /正常終了/);
assert.equal(e("#mount-file-state").textContent, "作成済み");
assert.match(e("#mount-reason-check").textContent, /rw/);

// 5. ls independently confirms the result.
go();
assert.match(e("#mount-terminal").textContent, /ls \/vivras-demo.txt/);
assert.match(e("#mount-reason-result").textContent, /存在する/);
assert.equal(e("#mount-next-panel").hidden, true);
assert.equal(e("#mount-lab-conclusion").hidden, false);
assert.ok(progress.every(x => x.dataset.state === "completed"));
const history = e("#mount-history").textContent;
assert.equal((history.match(/sudo touch \/vivras-demo.txt/g)||[]).length, 2);
assert.match(history, /Read-only file system/);
assert.match(history, /正常終了/);

// 6. Reset is a real reset, not a state-label toggle.
e("[data-lab-reset]").click();
assert.equal(e("#mount-live-mode").dataset.mode, "ro");
assert.equal(e("#mount-file-state").textContent, "存在しない");
assert.equal(e("#mount-next-panel").hidden, false);
assert.equal(e("#mount-lab-conclusion").hidden, true);
assert.match(e("#mount-next-command").textContent, /findmnt/);
assert.doesNotMatch(e("#mount-history").textContent, /touch/);
console.log("PASS guided causal experiment: inspect ro → touch blocked → remount rw → same touch creates file → ls confirms → reset.");
