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
  // Illustration: the resolver has no usable cache. Replies are explicit stages.
  const cold = [
    {from:"client",to:"resolver",kind:"query",title:"端末 → 再帰DNS",packet:"example.com の A レコードは？",why:"OSが、設定された再帰DNSに質問を渡します。通常の端末がルートから順に問い合わせるのではありません。"},
    {from:"resolver",to:"root",kind:"query",title:"再帰DNS → ルートDNS",packet:"example.com を担当するDNSは？",why:"再帰DNSは、最上位のルートDNSに委任情報を尋ねます。"},
    {from:"root",to:"resolver",kind:"reply",title:"ルートDNS → 再帰DNS",packet:".com を担当するDNSはこちら（委任情報）",why:"ルートDNSが .com の担当を案内します。ルートは通常、対象のAレコードそのものを答えません。"},
    {from:"resolver",to:"tld",kind:"query",title:"再帰DNS → .com のDNS",packet:"example.com を担当するDNSは？",why:"ルートから得た案内を使って、今度は.comを管理するDNSに尋ねます。"},
    {from:"tld",to:"resolver",kind:"reply",title:".com のDNS → 再帰DNS",packet:"example.com の権威DNSはこちら（委任情報）",why:".com のDNSが、example.com を担当する権威DNSを案内します。"},
    {from:"resolver",to:"auth",kind:"query",title:"再帰DNS → 権威DNS",packet:"example.com の A レコードは？",why:"再帰DNSは権威DNSに、IPアドレスに対応する正式なレコードを問い合わせます。"},
    {from:"auth",to:"resolver",kind:"reply",title:"権威DNS → 再帰DNS",packet:"A = 192.0.2.10（文書化用の架空IP）",why:"権威DNSがAレコードとTTLを返します。再帰DNSは期限内に再利用できるよう保存できます。"},
    {from:"resolver",to:"client",kind:"reply",title:"再帰DNS → 端末",packet:"AレコードのIPアドレスを回答",why:"端末が回答を受け取り、名前解決は完了します。ここではまだWebページを受け取っていません。"},
    {from:"client",to:"web",kind:"web",title:"端末 → Webサーバー",packet:"判明したIPアドレスを使ってHTTPSで要求",why:"ブラウザがWebサーバーとの接続を開始します。TLSの握手などの詳細は省略しています。"},
    {from:"web",to:"client",kind:"web",title:"Webサーバー → 端末",packet:"HTMLなどのWebコンテンツを返す",why:"サーバーがページの内容を返します。DNSでアドレスを探すことと、ページを取得することは別です。"}
  ];
  const hit = [
    {from:"client",to:"resolver",kind:"query",title:"端末 → 再帰DNS",packet:"example.com の A レコードは？",why:"この例では端末側のキャッシュはなく、再帰DNSに期限内のAレコードがあります。"},
    {from:"resolver",to:"client",kind:"reply",title:"再帰DNS → 端末",packet:"保存済みのAレコードを回答",why:"キャッシュから答えを返すため、ルート・.com・権威DNSへの新規問い合わせは省略できます。"},
    {from:"client",to:"web",kind:"web",title:"端末 → Webサーバー",packet:"IPアドレスでHTTPS通信",why:"DNSの解決は完了し、Webコンテンツの取得へ進みます。"},
    {from:"web",to:"client",kind:"web",title:"Webサーバー → 端末",packet:"HTMLなどのWebコンテンツを返す",why:"名前解決後、サーバーからコンテンツが返ります。"}
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
    drawWires();
    if (animatePacket) movePacket(stage.from, stage.to);
  }
  const network = scope.querySelector(".dns-flow-rail");
  const wireSvg = scope.querySelector(".dns-network-lines");
  const wireBase = wireSvg?.querySelector(".dns-wire-base");
  const activeWire = wireSvg?.querySelector(".dns-wire-active");
  const typeLabel = document.getElementById("dns-current-type");
  const ns = "http://www.w3.org/2000/svg";
  function drawWires() {
    if (!wireSvg || !network || !wireBase || !activeWire) return;
    const area = network.getBoundingClientRect();
    if (!area.width || !area.height) return;
    const center = key => {
      const el = nodes.find(n => n.dataset.node === key);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return [r.left - area.left + r.width / 2, r.top - area.top + r.height / 2];
    };
    const line = (a,b) => {
      const p = center(a), q = center(b);
      return p && q ? `M ${p[0]} ${p[1]} L ${q[0]} ${q[1]}` : "";
    };
    wireSvg.setAttribute("viewBox", `0 0 ${area.width} ${area.height}`);
    wireBase.replaceChildren();
    [["client","resolver"],["resolver","root"],["resolver","tld"],["resolver","auth"],["client","web"]].forEach(([from,to]) => {
      const path = document.createElementNS(ns,"path");
      path.setAttribute("d", line(from,to));
      path.setAttribute("class","dns-wire");
      wireBase.appendChild(path);
    });
    const step = route()[index];
    activeWire.setAttribute("d",line(step.from,step.to));
    const isReply = step.kind === "reply";
    activeWire.setAttribute("stroke", isReply ? "#242424" : "#e05a30");
    const tip = wireSvg.querySelector("#dns-arrow-tip path");
    if (tip) tip.setAttribute("fill", isReply ? "#242424" : "#e05a30");
    if (typeLabel) typeLabel.textContent = step.kind === "query" ? "DNSへの問い合わせ" : isReply ? "DNSからの案内・回答" : "DNS解決後のHTTPS通信";
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
  window.addEventListener("resize", drawWires);
  document.addEventListener("visibilitychange", () => { if (document.hidden) { stop(); render(false); } });
  reduceMotion.addEventListener?.("change", () => render(false));
  render(false);
})();
