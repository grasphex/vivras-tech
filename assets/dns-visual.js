/* Interactive, educational DNS walkthrough. No network requests are made. */
(() => {
  "use strict";
  const scope = document.getElementById("dns-workbench");
  if (!scope) return;
  const modes = [...scope.querySelectorAll("[data-dns-mode]")];
  const nodes = [...scope.querySelectorAll("[data-node]")];
  const title = document.getElementById("dns-current-title");
  const packet = document.getElementById("dns-current-packet");
  const reason = document.getElementById("dns-current-reason");
  const count = document.getElementById("dns-steps");
  const assumption = document.getElementById("dns-assumption");
  const playback = document.getElementById("dns-play");
  const previous = document.getElementById("dns-prev");
  const next = document.getElementById("dns-next");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const stageCanvas = scope.querySelector(".dns-stage");
  const particle = document.createElement("span");
  particle.className = "dns-packet";
  particle.setAttribute("aria-hidden", "true");
  stageCanvas.appendChild(particle);
  function movePacket(from, to) {
    if (reduceMotion.matches || typeof particle.animate !== "function") return;
    const start = nodes.find(n => n.dataset.node === from);
    const end = nodes.find(n => n.dataset.node === to);
    if (!start || !end) return;
    const origin = stageCanvas.getBoundingClientRect();
    const a = start.getBoundingClientRect(), b = end.getBoundingClientRect();
    const x0 = a.left + a.width / 2 - origin.left;
    const y0 = a.top + a.height / 2 - origin.top;
    const x1 = b.left + b.width / 2 - origin.left;
    const y1 = b.top + b.height / 2 - origin.top;
    particle.getAnimations().forEach(anim => anim.cancel());
    particle.animate([
      {left:x0 + "px",top:y0 + "px",opacity:0,offset:0},
      {left:x0 + "px",top:y0 + "px",opacity:1,offset:.12},
      {left:x1 + "px",top:y1 + "px",opacity:1,offset:.86},
      {left:x1 + "px",top:y1 + "px",opacity:0,offset:1}
    ],{duration:950,easing:"ease-in-out"});
  }
  const cold = [
    {from:"client",to:"resolver",title:"端末 → 再帰DNS",packet:"example.com の A レコードは？",why:"OS側が問い合わせを再帰DNSに渡します。端末がルート・.com・権威DNSへ直接順番に問い合わせるわけではありません。"},
    {from:"resolver",to:"root",title:"再帰DNS → ルートDNS",packet:"example.com の A レコードは？",why:"ルートDNSは通常、IPアドレスそのものではなく「.comを担当するDNS」を案内します。再帰DNSは案内を受け取ります。"},
    {from:"resolver",to:"tld",title:"再帰DNS → .com のDNS",packet:"example.com の A レコードは？",why:".comのDNSは「example.comを担当する権威DNS」を案内します。上から順に管理担当を絞り込んでいます。"},
    {from:"resolver",to:"auth",title:"再帰DNS → 権威DNS",packet:"example.com の A レコードは？",why:"再帰DNSは、正式な回答を持つ権威DNSへ問い合わせます。ここで初めて対象名のAレコードを取りに行きます。"},
    {from:"auth",to:"resolver",title:"権威DNS → 再帰DNS",packet:"A = 192.0.2.10（説明用の架空の値）",why:"権威DNSがAレコードとTTLなどを返します。再帰DNSは条件に従って結果をキャッシュできます。"},
    {from:"resolver",to:"client",title:"再帰DNS → 端末",packet:"AレコードのIPアドレスを回答",why:"端末は結果を受け取ります。ここで名前解決が完了しますが、Webページの取得はまだ始まったばかりです。"},
    {from:"client",to:"web",title:"端末 → Webサーバー",packet:"得られたIPアドレスへHTTPS通信",why:"ブラウザはDNSで調べた宛先へWeb通信を行います。DNS問い合わせとHTTP/HTTPS通信は別の処理です。"}
  ];
  const hit = [
    {from:"client",to:"resolver",title:"端末 → 再帰DNS",packet:"example.com の A レコードは？",why:"例では端末側にキャッシュがなく、再帰DNS側に期限内のAレコードが残っています。"},
    {from:"resolver",to:"client",title:"再帰DNS → 端末",packet:"保存済みのAレコードを回答",why:"有効なキャッシュがあれば、ルート・.com・権威DNSへの問い合わせを省略できます。"},
    {from:"client",to:"web",title:"端末 → Webサーバー",packet:"得られたIPアドレスへHTTPS通信",why:"DNSは終了。Web通信は別に開始します。"}
  ];
  let mode = "cold";
  let index = 0;
  let timer = null;
  const route = () => mode === "hit" ? hit : cold;
  function stop() {
    if (timer !== null) { clearInterval(timer); timer = null; }
    playback.textContent = "再生";
    playback.setAttribute("aria-pressed", "false");
  }
  function render(animatePacket = true) {
    const stages = route();
    const stage = stages[index];
    title.textContent = stage.title;
    packet.textContent = stage.packet;
    reason.textContent = stage.why;
    count.textContent = `${index + 1} / ${stages.length}`;
    assumption.textContent = mode === "hit"
      ? "条件：再帰DNSに期限内のAレコードがある（端末にはない）。"
      : mode === "expired"
      ? "条件：前回のAレコードのTTLが切れ、再帰DNSに有効な答えがない。"
      : "条件：端末・再帰DNSに有効な回答や途中の委任情報がない、説明用の単純化した例。";
    previous.disabled = index === 0;
    next.disabled = index === stages.length - 1;
    nodes.forEach(node => {
      node.classList.toggle("is-from", node.dataset.node === stage.from);
      node.classList.toggle("is-to", node.dataset.node === stage.to);
      node.classList.toggle("is-playing", timer !== null && !reduceMotion.matches && node.dataset.node === stage.to);
    });
    modes.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.dnsMode === mode)));
    if (animatePacket) movePacket(stage.from, stage.to);
  }
  function advance() {
    if (index < route().length - 1) {
      index++;
      render();
    } else {
      stop();
      render();
    }
  }
  modes.forEach(button => button.addEventListener("click", () => {
    stop();
    mode = button.dataset.dnsMode;
    index = 0;
    render();
  }));
  previous.addEventListener("click", () => { stop(); index = Math.max(0, index - 1); render(); });
  next.addEventListener("click", () => { stop(); advance(); });
  playback.addEventListener("click", () => {
    if (timer !== null) { stop(); render(false); return; }
    if (index === route().length - 1) index = 0;
    playback.textContent = "一時停止";
    playback.setAttribute("aria-pressed", "true");
    timer = setInterval(advance, reduceMotion.matches ? 2500 : 1800);
    render();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { stop(); render(false); } });
  reduceMotion.addEventListener?.("change", () => render(false));
  render(false);
})();
