/* Interactive model of potential location-data flow. No real collection or network traffic. */
(()=>{
"use strict";
const lab=document.getElementById("location-flow");
if(!lab)return;
const choices=[...lab.querySelectorAll("[data-flow-mode]")],nodes=[...lab.querySelectorAll("[data-flow-index]")];
const counter=document.getElementById("location-counter"),heading=document.getElementById("location-heading"),detail=document.getElementById("location-detail"),caption=document.getElementById("location-caption");
const back=document.getElementById("location-back"),next=document.getElementById("location-next"),play=document.getElementById("location-play");
const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
const packet=document.createElement("span");packet.className="flow-packet";packet.setAttribute("aria-hidden","true");lab.append(packet);
const cases={
 sdk:[
 {from:0,to:0,heading:"位置情報の利用を許可",description:"利用者がアプリに位置情報へのアクセスを許可。これは第三者への販売に同意したこととは別です。"},
 {from:0,to:1,heading:"アプリがOSから位置を取得",description:"OSの位置情報サービスをアプリが利用。GPS・Wi-Fi・携帯基地局などが位置推定に使われる場合があります。"},
 {from:1,to:2,heading:"SDKを介して外部へ送信",description:"広告・分析などのSDKがアプリに組み込まれ、条件が整うとSDK提供会社のサーバーへ情報を送信する場合があります。SDKはアプリ内で動くプログラム部品です。"},
 {from:2,to:3,heading:"データブローカーへ提供・販売",description:"SDK提供会社などからブローカーにデータが渡る経路も考えられます。常に売買されるわけではありません。"},
 {from:3,to:4,heading:"購入者が履歴を分析",description:"同じ端末識別子に結びついた位置・時刻の履歴から、自宅や勤務先などが推測され得ます。"}
 ],
 app:[
 {from:0,to:0,heading:"位置情報の利用を許可",description:"利用者がアプリへ位置情報アクセスを許可。外部販売の許可と同じではありません。"},
 {from:0,to:1,heading:"アプリ運営会社が取得",description:"OSから取得した位置情報を、アプリ運営会社のシステムで処理・保存する場合があります。"},
 {from:1,to:3,heading:"運営会社がブローカーへ提供",description:"SDK提供会社が介在せず、アプリ運営会社が直接ブローカーへ提供する経路も考えられます。"},
 {from:3,to:4,heading:"購入者が履歴を分析",description:"端末識別子、位置と時刻を組み合わせて、行動パターンを推測することが可能です。"}
 ]};
let mode="sdk",index=0,timer=null;
function steps(){return cases[mode];}
function stop(){if(timer!==null){clearInterval(timer);timer=null;}play.textContent="再生";play.setAttribute("aria-pressed","false");}
function animate(from,to){if(reduced.matches||typeof packet.animate!=="function"||from===to)return;
 const src=nodes.find(x=>+x.dataset.flowIndex===from),dst=nodes.find(x=>+x.dataset.flowIndex===to);
 if(!src||!dst)return;const bounds=lab.getBoundingClientRect(),a=src.getBoundingClientRect(),b=dst.getBoundingClientRect();
 const x1=a.left+a.width/2-bounds.left,y1=a.top+a.height/2-bounds.top,x2=b.left+b.width/2-bounds.left,y2=b.top+b.height/2-bounds.top;
 packet.getAnimations().forEach(anim=>anim.cancel());
 packet.animate([{left:x1+"px",top:y1+"px",opacity:0,offset:0},{left:x1+"px",top:y1+"px",opacity:1,offset:.1},{left:x2+"px",top:y2+"px",opacity:1,offset:.88},{left:x2+"px",top:y2+"px",opacity:0,offset:1}],{duration:1050,easing:"ease-in-out"});
}
function render(withMotion=true){const s=steps()[index];
 counter.textContent=String(index+1)+" / "+String(steps().length);
 heading.textContent=s.heading;detail.textContent=s.description;
 caption.textContent=mode==="sdk"?"SDK経由の一例。今回の報道で確認された取得経路ではありません。":"アプリ運営会社から直接提供される一例。今回の報道で確認された取得経路ではありません。";
 back.disabled=index===0;next.disabled=index===steps().length-1;
 const traveled=steps().slice(0,index+1).map(x=>x.to);
 nodes.forEach(node=>{const n=Number(node.dataset.flowIndex);node.classList.toggle("is-current",n===s.to);node.classList.toggle("is-past",n!==s.to&&traveled.includes(n));node.classList.toggle("is-omitted",mode==="app"&&n===2);});
 lab.querySelector(".flow-track").classList.toggle("is-direct",mode==="app");
 choices.forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.flowMode===mode)));
 if(withMotion)animate(s.from,s.to);
}
function advance(){if(index<steps().length-1){index++;render();}else{stop();render(false);}}
choices.forEach(button=>button.addEventListener("click",()=>{stop();mode=button.dataset.flowMode;index=0;render(false);}));
back.addEventListener("click",()=>{stop();index=Math.max(0,index-1);render();});
next.addEventListener("click",()=>{stop();advance();});
play.addEventListener("click",()=>{if(timer!==null){stop();render(false);return;}if(index===steps().length-1)index=0;play.textContent="一時停止";play.setAttribute("aria-pressed","true");timer=setInterval(advance,reduced.matches?3000:1900);render();});
document.addEventListener("visibilitychange",()=>{if(document.hidden){stop();render(false);}});
reduced.addEventListener?.("change",()=>render(false));
render(false);
})();
