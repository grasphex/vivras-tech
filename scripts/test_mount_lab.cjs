#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function element(label) {
  return {
    label, textContent: "", hidden: false, dataset: {}, attrs: {}, handlers: {},
    addEventListener(type, cb) { this.handlers[type] = cb; },
    click() { assert.equal(typeof this.handlers.click, "function"); this.handlers.click(); },
    setAttribute(k, v) { this.attrs[k] = v; },
    removeAttribute(k) { delete this.attrs[k]; }
  };
}
const selectors = [
  "#mount-live-mode", "#mount-file-state", "#mount-next-panel", "[data-lab-next]",
  "#mount-lab-step", "#mount-lab-task", "#mount-next-command", "#mount-terminal",
  "#mount-reason-result", "#mount-lab-conclusion", "#mount-history", "[data-lab-reset]",
  "#mount-learning-1", "#mount-learning-2", "#mount-learning-3",
  '[data-learning="mount"]','[data-learning="mode"]','[data-learning="remount"]'
];
const map = new Map(selectors.map(s => [s, element(s)]));
const progress = [...Array(7)].map((_, i) => element("stage_" + i));
const root = {
  querySelector(sel) { assert.ok(map.has(sel), "Unknown selector: " + sel); return map.get(sel); },
  querySelectorAll(sel) { assert.equal(sel, "[data-lab-progress]"); return progress; }
};
const document = { getElementById(id) { assert.equal(id, "mount-command-lab"); return root; } };
vm.runInNewContext(fs.readFileSync("assets/mount-lab.js", "utf8"), {document});
const get = key => map.get(key);
const go = () => get("[data-lab-next]").click();

assert.equal(get("#mount-live-mode").textContent, "未接続");
assert.equal(get("#mount-file-state").textContent, "（なし）");
assert.match(get("#mount-next-command").textContent, /ls \/mnt\/data\/report\.txt/);
assert.equal(get("#mount-learning-1").textContent, "未確認");

// Stage 1: target directory exists, but contents of /dev/sdb1 not yet visible.
go();
assert.match(get("#mount-terminal").textContent, /No such file or directory/);
assert.match(get("#mount-reason-result").textContent, /まだ .*接続していない/);
assert.equal(get("#mount-live-mode").dataset.mode, "unmounted");

// Stage 2: mount -o ro makes report.txt visible, mode is read-only.
go();
assert.match(get("#mount-terminal").textContent, /mount -o ro \/dev\/sdb1 \/mnt\/data/);
assert.equal(get("#mount-live-mode").dataset.mode, "ro");
assert.match(get("#mount-file-state").textContent, /report\.txt/);
assert.doesNotMatch(get("#mount-terminal").textContent, /正常終了/);

// Stage 3: ls confirms mounting, first learning outcome earned.
go();
assert.match(get("#mount-terminal").textContent, /\n\/mnt\/data\/report\.txt/);
assert.equal(get('[data-learning="mount"]').dataset.earned, "true");
assert.match(get("#mount-learning-1").textContent, /接続後/);

// Stage 4: write is rejected solely because ro, second learning outcome.
go();
assert.match(get("#mount-terminal").textContent, /Read-only file system/);
assert.equal(get('[data-learning="mode"]').dataset.earned, "true");
assert.doesNotMatch(get("#mount-file-state").textContent, /new\.txt/);

// Stage 5: change mount mode only; file and mount point unchanged.
go();
assert.match(get("#mount-terminal").textContent, /mount -o remount,rw \/mnt\/data/);
assert.equal(get("#mount-live-mode").dataset.mode, "rw");
assert.equal(get("#mount-file-state").textContent, "report.txt");
assert.match(get("#mount-reason-result").textContent, /接続を変えず/);
assert.equal(get('[data-learning="remount"]').dataset.earned, "false");

// Stage 6: identical touch now creates new.txt, third learning outcome.
go();
assert.equal(get("#mount-terminal").textContent, "$ sudo touch /mnt/data/new.txt");
assert.match(get("#mount-file-state").textContent, /new\.txt/);
assert.equal(get('[data-learning="remount"]').dataset.earned, "true");
assert.match(get("#mount-learning-3").textContent, /同じ書き込みが成功/);

// Stage 7: verify created file exists, show learned statement.
go();
assert.match(get("#mount-terminal").textContent, /ls \/mnt\/data\/new\.txt/);
assert.equal(get("#mount-next-panel").hidden, true);
assert.equal(get("#mount-lab-conclusion").hidden, false);
assert.ok(progress.every(n => n.dataset.state === "completed"));
const history = get("#mount-history").textContent;
assert.equal((history.match(/\$ sudo touch \/mnt\/data\/new\.txt/g)||[]).length, 2);
assert.match(history, /Read-only file system/);

// Real reset
get("[data-lab-reset]").click();
assert.equal(get("#mount-live-mode").dataset.mode, "unmounted");
assert.equal(get("#mount-file-state").textContent, "（なし）");
assert.equal(get('[data-learning="mount"]').dataset.earned, "false");
assert.equal(get("#mount-next-panel").hidden, false);
assert.equal(get("#mount-lab-conclusion").hidden, true);
assert.doesNotMatch(get("#mount-history").textContent, /touch/);
console.log("PASS: 7-step experiment proves mount, ro/rw, remount as three distinct lessons using same source & target.");
