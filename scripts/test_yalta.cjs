#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const h=fs.readFileSync("content/modern-yalta-summit.html","utf8");
assert.match(h,/<html lang="ja">/);
assert.equal((h.match(/<h1\b/g)||[]).length,1);
for(const s of ["yalta","nuclear","interests","risk","japan","watch","sources"])
  assert.ok(h.includes('id="'+s+'"'),"missing section "+s);
const required=["米中ロ","新START","2026年2月5日","1945","11月19日","1,550","5,420","5,042","620","拡大抑止","仮想"];
for(const x of required)assert.ok(h.includes(x),"missing key explanation "+x);
assert.ok(h.includes('name="category" content="政治・経済"'));
assert.ok(h.includes('src="../assets/terms.js"'));
assert.ok((h.match(/class="vterm"/g)||[]).length>=3);
assert.ok((h.match(/data-explain=/g)||[]).length>=3);
assert.ok(h.includes("prefers-reduced-motion"));
assert.ok(h.includes("@media(max-width:660px)"));
assert.ok(h.includes('https://history.state.gov/milestones/1937-1945/yalta-conf'));
assert.ok(h.includes('https://fas.org/initiative/status-world-nuclear-forces/'));
assert.ok(h.includes('https://www.mofa.go.jp/press/release/pressite_000001_02404.html'));
const scripts=[...h.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1].trim()).filter(Boolean);
assert.equal(scripts.length,1,"expected single inline animation");
new vm.Script(scripts[0],{filename:"modern-yalta-summit-inline.js"});
const els={};
function fake(id){return els[id]||=(new class {
 constructor(){this.textContent="";this.disabled=false;this.dataset={};this.attrs={};this.handlers={};this.classList={toggle(){}};this.style={};}
 setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(k,f){this.handlers[k]=f;}
 click(){assert.ok(this.handlers.click,"unwired button "+id);this.handlers.click();}
 getBoundingClientRect(){return {left:10,top:10,width:100,height:40};}
 getAnimations(){return [];}
 animate(){return {};}
 });}
const modes=["control","deal"].map(x=>{const e=fake("mode-"+x);e.dataset.scene=x;return e;});
const nodes=[0,1,2].map(x=>{const e=fake("step-"+x);e.dataset.step=String(x);return e;});
const root={querySelectorAll(sel){if(sel==="[data-scene]")return modes;if(sel==="[data-step]")return nodes;throw Error(sel)},
querySelector(sel){if(sel===".sc-dot")return fake("dot");if(sel===".sc-visual")return fake("visual");throw Error(sel);}};
const doc={getElementById(id){return id==="yalta-lab"?root:fake(id);},addEventListener(){}};
vm.runInNewContext(scripts[0],{document:doc,window:{matchMedia(){return{matches:true,addEventListener(){}}}},setInterval(){return 1;},clearInterval(){}},{timeout:1000});
assert.match(fake("sc-heading").textContent,/目的/);
assert.equal(fake("sc-count").textContent,"1 / 3");
fake("sc-next").click();assert.equal(fake("sc-count").textContent,"2 / 3");
fake("sc-back").click();assert.equal(fake("sc-count").textContent,"1 / 3");
modes[1].click();assert.equal(modes[1].attrs["aria-pressed"],"true");
assert.match(fake("sc-node-0").textContent,/大国/);
fake("sc-next").click();fake("sc-next").click();
assert.equal(fake("sc-next").disabled,true);
fake("sc-play").click();assert.equal(fake("sc-play").attrs["aria-pressed"],"true");
fake("sc-play").click();assert.equal(fake("sc-play").attrs["aria-pressed"],"false");
console.log("Yalta article: facts, source markers, responsive contract, JS syntax and scenario controls passed.");
