(() => {
  "use strict";
  const triggers = [...document.querySelectorAll('button.vterm[data-explain]')];
  if (!triggers.length) return;

  const panel = document.createElement("aside");
  panel.id = "vterm-note";
  panel.className = "vterm-note";
  panel.hidden = true;
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", "用語の補足説明");
  panel.innerHTML = '<div class="vterm-note-head"><strong class="vterm-note-title"></strong><button class="vterm-note-close" type="button" aria-label="用語の説明を閉じる">×</button></div><p class="vterm-note-text"></p>';
  document.body.appendChild(panel);
  const name = panel.querySelector(".vterm-note-title");
  const content = panel.querySelector(".vterm-note-text");
  const dismiss = panel.querySelector(".vterm-note-close");
  let active = null;

  function close(restoreFocus = false) {
    const previous = active;
    if (previous) {
      previous.setAttribute("aria-expanded", "false");
      previous.removeAttribute("aria-controls");
    }
    active = null;
    panel.hidden = true;
    if (restoreFocus && previous) previous.focus({ preventScroll: true });
  }

  function place() {
    if (!active || panel.hidden) return;
    const rect = active.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const margin = 12;
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));
    let top = rect.bottom + 9;
    if (top + height > window.innerHeight - margin && rect.top > height + margin) {
      top = rect.top - height - 9;
    } else {
      top = Math.min(top, Math.max(margin, window.innerHeight - height - margin));
    }
    panel.style.left = Math.round(left) + "px";
    panel.style.top = Math.round(Math.max(margin, top)) + "px";
  }

  function open(button) {
    if (active === button) { close(); return; }
    close();
    active = button;
    name.textContent = button.textContent.trim();
    content.textContent = button.dataset.explain;
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    button.setAttribute("aria-controls", panel.id);
    place();
  }

  triggers.forEach(button => {
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => open(button));
  });
  dismiss.addEventListener("click", () => close(true));
  document.addEventListener("pointerdown", event => {
    if (active && !panel.contains(event.target) && !event.target.closest("button.vterm")) close();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && active) { event.preventDefault(); close(true); }
  });
  window.addEventListener("scroll", () => { if (active) close(); }, { passive: true });
  window.addEventListener("resize", () => { if (active) place(); });
})();
