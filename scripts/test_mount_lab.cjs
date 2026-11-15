#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function el() {
  return {
    textContent:"", hidden:false, handlers:{},
    addEventListener(key, fn){ this.handlers[key]=fn; },
    click(){ assert.ok(this.handlers.click); this.handlers.click(); }
  };
}
const selectors = [
  "#mount-live-mode", "#mount-file-state", "#mount-lab-step", "#mount-lab-task",
  "#mount-next-command", "[data-lab-next]", "#mount-terminal", "#mount-reason-result",
  "#mount-lab-conclusion", "[data-lab-reset]"
];
const nodes = new Map(selectors.map(key=>[key,el()]));
const root = {querySelector(key){assert.ok(nodes.has(key),key); return nodes.get(key)}};
const document = {getElementById(id){assert.equal(id,"mount-command-lab");return root}};
vm.runInNewContext(fs.readFileSync("assets/mount-lab.js","utf8"),{document});
const $ = key=>nodes.get(key);
const execute = ()=>$("[data-lab-next]").click();

assert.match($("#mount-live-mode").textContent,/^ro/);
assert.match($("#mount-next-command").textContent,/sudo touch/);
assert.equal($("#mount-lab-conclusion").hidden,true);

// Same write command is rejected before remount.
execute();
assert.match($("#mount-terminal").textContent,/Read-only file system/);
assert.match($("#mount-reason-result").textContent,/書き込み禁止/);
const firstCommand=$("#mount-terminal").textContent.split("\n")[0];

// remount switches the mode but does not create a file.
execute();
assert.match($("#mount-terminal").textContent,/sudo mount -o remount,rw \/mnt\/data/);
assert.equal($("#mount-terminal").textContent,"$ sudo mount -o remount,rw /mnt/data");
assert.match($("#mount-live-mode").textContent,/^rw/);
assert.equal($("#mount-file-state").textContent,"まだない");

// The same command now succeeds, demonstrated by file state, not fake shell output.
execute();
assert.equal($("#mount-terminal").textContent,firstCommand);
assert.equal($("#mount-file-state").textContent,"new.txt ができた");
assert.equal($("[data-lab-next]").hidden,true);
assert.equal($("#mount-lab-conclusion").hidden,false);

// Reset restores the original conditions.
$("[data-lab-reset]").click();
assert.match($("#mount-live-mode").textContent,/^ro/);
assert.equal($("#mount-file-state").textContent,"まだない");
assert.equal($("[data-lab-next]").hidden,false);
assert.equal($("#mount-lab-conclusion").hidden,true);
console.log("PASS: one diagram, same touch command, ro reject → remount rw → touch success");
