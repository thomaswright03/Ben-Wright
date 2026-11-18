// Hero photo slideshow. Crossfades every 5 seconds; the dots jump to a photo.
// Auto-advance is off for visitors who prefer reduced motion, and pauses while
// the tab is hidden or the photo is hovered or focused.
(function () {
  const box = document.getElementById("hero-photos");
  if (!box) return;
  const slides = Array.from(box.querySelectorAll("picture"));
  const dots = Array.from(box.querySelectorAll(".dots button"));
  if (slides.length < 2) return;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let i = 0, timer = null, held = false;

  function show(n) {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle("on", k === i));
    dots.forEach((d, k) => d.setAttribute("aria-current", String(k === i)));
    // Warm up the next photo so the fade never shows a blank frame
    const next = slides[(i + 1) % slides.length].querySelector("img");
    if (next && next.loading === "lazy") next.loading = "eager";
  }
  function start() { stop(); if (!reduce && !held && !document.hidden) timer = setInterval(() => show(i + 1), 5000); }
  function stop() { if (timer) clearInterval(timer); timer = null; }

  dots.forEach((d, k) => d.addEventListener("click", () => { show(k); start(); }));
  box.addEventListener("mouseenter", () => { held = true; stop(); });
  box.addEventListener("mouseleave", () => { held = false; start(); });
  box.addEventListener("focusin", () => { held = true; stop(); });
  box.addEventListener("focusout", () => { held = false; start(); });
  document.addEventListener("visibilitychange", start);

  // Swipe on phones
  let x0 = null;
  box.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) { show(i + (dx < 0 ? 1 : -1)); start(); }
  });

  show(0); start();
})();
