// Profile "Head to head" section: Ben's average vs the D1 field average at the same course.
(function () {
  const section = document.getElementById("courses");
  if (!section) return;
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; };
  const avg = a => a.reduce((s, x) => s + x, 0) / a.length;
  const fmt = n => n.toFixed(1);

  function card(c, i) {
    const ben = avg(c.benRounds);
    const d1 = c.d1FieldAvg;
    const par = c.par || 72;
    const lo = par - 6, hi = par + 10;
    const w = v => Math.max(6, Math.min(100, ((v - lo) / (hi - lo)) * 100));
    const diff = ben - d1;

    const box = el("article", "h2h-card reveal pop");
    box.style.setProperty("--i", i);
    const head = el("div", "h2h-head");
    const title = el("div");
    title.append(el("h3", "", c.course));
    title.append(el("div", "sub", [c.location, c.par ? "Par " + c.par : ""].filter(Boolean).join(" · ")));
    const verdict = el("span", "h2h-verdict " + (diff <= 0 ? "ahead" : "behind"),
      Math.abs(diff) < 0.05 ? "Even with the field" : fmt(Math.abs(diff)) + (diff < 0 ? " strokes better" : " strokes behind"));
    head.append(title, verdict);

    const bars = el("div", "h2h-bars");
    function bar(label, value, cls, detail) {
      const row = el("div", "h2h-row " + cls);
      const lab = el("div", "h2h-label"); lab.append(el("strong", "", label)); if (detail) lab.append(el("span", "", detail));
      const track = el("div", "h2h-track");
      const fill = el("div", "h2h-fill"); fill.style.setProperty("--w", w(value) + "%");
      track.append(fill);
      row.append(lab, track, el("div", "h2h-val", fmt(value)));
      return row;
    }
    bars.append(bar("Ben", ben, "ben", c.benRounds.length + (c.benRounds.length === 1 ? " round" : " rounds")));
    const d1Detail = [c.d1Event, c.d1Year].filter(Boolean).join(", ");
    bars.append(bar("D1 field", d1, "d1", d1Detail));
    box.append(head, bars);

    const foot = el("div", "h2h-foot");
    foot.append(el("span", "mono", "Ben: " + c.benRounds.join(" · ")));
    if (c.d1Link) { const a = el("a", "ev-link", "D1 results"); a.href = c.d1Link; a.target = "_blank"; a.rel = "noopener"; foot.append(a); }
    box.append(foot);
    return { box, diff, rounds: c.benRounds.length };
  }

  fetch("/api/courses").then(r => r.ok ? r.json() : { courses: [] }).then(d => {
    const list = (d.courses || []).filter(c => c.benRounds && c.benRounds.length && c.d1FieldAvg);
    if (!list.length) return;
    const grid = document.getElementById("h2h-grid");
    const cards = list.map(card);
    cards.forEach(c => grid.append(c.box));
    const better = cards.filter(c => c.diff < 0).length;
    const avgDiff = avg(cards.map(c => c.diff));
    document.getElementById("h2h-summary").textContent =
      "Across " + cards.length + (cards.length === 1 ? " course" : " courses") + ", Ben averages " +
      fmt(Math.abs(avgDiff)) + (avgDiff <= 0 ? " strokes better than" : " strokes behind") +
      " the Division I field" + (cards.length > 1 ? ", and beats the field average at " + better + " of " + cards.length + "." : ".");
    section.hidden = false;
    const navItem = document.getElementById("nav-courses"); if (navItem) navItem.hidden = false;
    // Reveal and animate the bars when the section scrolls into view
    const show = () => section.classList.add("bars-in");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return;
        if (e.target === section) show();
        e.target.classList.add("in"); io.unobserve(e.target);
      }), { threshold: 0.15 });
      io.observe(section); grid.querySelectorAll(".reveal").forEach(n => io.observe(n));
    } else show();
  }).catch(() => {});
})();
