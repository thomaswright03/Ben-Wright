// Site-wide motion: scroll reveals, count-ups, shot tracer, timeline progress, nav state.
// Animations only run when <html> has the "motion" class (set in <head> unless the
// viewer prefers reduced motion). Everything is readable without this script.
(function () {
  clearTimeout(window.__motionFail);
  const root = document.documentElement;
  const motion = root.classList.contains("motion");
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* ---------- Nav: progress line, shadow, active section ---------- */
  const nav = document.querySelector("nav");
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const max = root.scrollHeight - innerHeight;
      if (nav) {
        nav.style.setProperty("--progress", max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
        nav.classList.toggle("scrolled", scrollY > 8);
      }
      timelineProgress();
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);

  const links = $$('nav ul a[href^="#"]');
  if (links.length && "IntersectionObserver" in window) {
    const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
    const navIo = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(a => a.classList.toggle("active", a === map.get(e.target.id)));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) navIo.observe(s); });
  }

  /* ---------- Timeline: line draws with scroll, dots light up ---------- */
  const tl = document.querySelector(".timeline");
  const tlItems = tl ? $$(".tl-item", tl) : [];
  function timelineProgress() {
    if (!tl) return;
    if (!motion) { tlItems.forEach(i => i.classList.add("lit")); return; }
    const r = tl.getBoundingClientRect();
    const mark = innerHeight * 0.62;
    const p = Math.max(0, Math.min(1, (mark - r.top) / r.height));
    tl.style.setProperty("--tl-progress", p.toFixed(4));
    tlItems.forEach(i => i.classList.toggle("lit", i.getBoundingClientRect().top + 18 < mark));
  }

  /* ---------- Count-up for numbers in the stats bar ---------- */
  function countUp(el, delay) {
    const original = el.textContent;
    const parts = original.split(/(\d+(?:\.\d+)?)/);
    const nums = parts.map((p, i) => (i % 2 ? { v: parseFloat(p), d: (p.split(".")[1] || "").length } : null));
    if (!nums.some(Boolean)) return;
    const dur = 1400, start = performance.now() + delay;
    const ease = t => 1 - Math.pow(1 - t, 4);
    el.textContent = parts.map((p, i) => (nums[i] ? (0).toFixed(nums[i].d) : p)).join("");
    function frame(now) {
      const t = Math.max(0, Math.min(1, (now - start) / dur));
      el.textContent = parts.map((p, i) => (nums[i] ? (nums[i].v * ease(t)).toFixed(nums[i].d) : p)).join("");
      if (t < 1) requestAnimationFrame(frame); else el.textContent = original;
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Shot tracer ball follows the arc ---------- */
  const ball = document.querySelector(".tracer-ball");
  if (ball && motion) {
    const NS = "http://www.w3.org/2000/svg";
    const am = document.createElementNS(NS, "animateMotion");
    am.setAttribute("dur", "2s");
    am.setAttribute("begin", "indefinite");
    am.setAttribute("fill", "freeze");
    am.setAttribute("calcMode", "spline");
    am.setAttribute("keyPoints", "0;1");
    am.setAttribute("keyTimes", "0;1");
    am.setAttribute("keySplines", ".33 .05 .25 1");
    const mp = document.createElementNS(NS, "mpath");
    mp.setAttribute("href", "#tracer-path");
    mp.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#tracer-path");
    am.appendChild(mp);
    const endTransform = ball.getAttribute("transform");
    ball.setAttribute("transform", "");
    ball.appendChild(am);
    setTimeout(() => {
      try { am.beginElement(); }
      catch (e) { ball.setAttribute("transform", endTransform); }
    }, 800);
  }

  /* ---------- Lists on the tool pages call this once after their first load ---------- */
  window.motionStagger = function (container) {
    if (!container || !motion) return;
    Array.from(container.children).forEach((c, i) => c.style.setProperty("--i", i));
    container.classList.add("stagger-in");
    setTimeout(() => container.classList.toggle("stagger-in", false), 1400);
  };

  /* ---------- Clips play (muted) only while on screen, and only with motion on ---------- */
  const clips = $$("video[data-autoplay]");
  if (clips.length && motion && "IntersectionObserver" in window) {
    const vio = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { const pr = e.target.play(); if (pr && pr.catch) pr.catch(() => {}); }
      else e.target.pause();
    }), { threshold: 0.4 });
    clips.forEach(v => vio.observe(v));
  }

  /* ---------- Scroll reveals ---------- */
  if (!motion || !("IntersectionObserver" in window)) { onScroll(); return; }

  function tag(selector, opts) {
    opts = opts || {};
    $$(selector).forEach((el, i) => {
      if (el.classList.contains("reveal")) return;
      el.classList.add("reveal");
      if (opts.cls) el.classList.add(opts.cls);
      const idx = opts.groupBy ? Array.from(el.parentElement.children).indexOf(el) : (opts.index === false ? 0 : i);
      el.style.setProperty("--i", Math.min(idx, 12));
    });
  }
  tag("section > .wrap > header > *", { groupBy: true });
  tag(".card-label", { index: false });
  tag(".scorecard-scroll", { index: false });
  tag(".results tbody tr", { groupBy: true });
  tag(".rankings > div", { groupBy: true, cls: "pop" });
  tag(".video", { index: false, cls: "pop" });
  tag("#about .lede", { groupBy: true });
  tag(".facts > *", { groupBy: true });
  tag(".honors li", { groupBy: true, cls: "from-right" });
  tag("#about h3", { index: false });
  tag(".contact-box", { groupBy: true, cls: "pop" });
  tag(".note", { index: false });
  tag(".tl-year", { index: false, cls: "from-left" });
  tag(".tl-card", { index: false, cls: "from-right" });

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add("in");
      io.unobserve(el);
      if (el.classList.contains("scorecard-scroll")) $$(".scorecard td", el).forEach((td, i) => countUp(td, 200 + i * 90));
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach(el => io.observe(el));

  onScroll();
})();
