// Profile "Head to head" section: Ben's average vs Division I players at the same course.
// Entries come from /data/courses.json (in the repo) plus any added on /admin (/api/courses).
(function () {
  const section = document.getElementById("courses");
  if (!section) return;
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; };
  const avg = a => a.reduce((s, x) => s + x, 0) / a.length;
  const fmt = n => n.toFixed(1);

  function card(c, i) {
    const ben = avg(c.benRounds);
    const players = (c.d1Players || []).filter(p => p.rounds && p.rounds.length);
    const d1 = players.length ? avg(players.flatMap(p => p.rounds)) : c.d1FieldAvg;
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
    const d1Detail = players.length ? players.map(p => p.school).join(" · ") : [c.d1Event, c.d1Year].filter(Boolean).join(", ");
    bars.append(bar(c.d1Label || "D1 field", d1, "d1", d1Detail));
    if (c.fieldAvg) bars.append(bar(c.fieldLabel || "Whole field", c.fieldAvg, "field", c.fieldDetail));
    box.append(head, bars);

    const foot = el("div", "h2h-foot");
    const lines = el("div", "h2h-lines mono");
    lines.append(el("span", "", "Ben: " + c.benRounds.join(" · ") + (c.benNote ? " (" + c.benNote + ")" : "")));
    players.forEach(p => lines.append(el("span", "", p.name + ", " + p.school + ": " + p.rounds.join(" · "))));
    foot.append(lines);
    if (c.d1Link) { const a = el("a", "ev-link", c.d1LinkLabel || "D1 results"); a.href = c.d1Link; a.target = "_blank"; a.rel = "noopener"; foot.append(a); }
    box.append(foot);
    return { box, diff, rounds: c.benRounds.length };
  }

  const load = url => fetch(url).then(r => r.ok ? r.json() : { courses: [] }).then(d => d.courses || []).catch(() => []);
  Promise.all([load("/data/courses.json"), load("/api/courses")]).then(([fixed, added]) => {
    const list = fixed.concat(added).filter(c => c.benRounds && c.benRounds.length && (c.d1FieldAvg || (c.d1Players && c.d1Players.length)));
    if (!list.length) return;
    const grid = document.getElementById("h2h-grid");
    const cards = list.map(card);
    cards.forEach(c => grid.append(c.box));
    const better = cards.filter(c => c.diff < 0).length;
    const avgDiff = avg(cards.map(c => c.diff));
    const gap = fmt(Math.abs(avgDiff)) + (avgDiff <= 0 ? " strokes a round better than" : " strokes a round behind");
    document.getElementById("h2h-summary").textContent = cards.length === 1
      ? "At " + list[0].course + ", Ben averaged " + gap + " the Division I players he played against."
      : "Across " + cards.length + " courses, Ben averages " + gap + " Division I players on the same course, and beats them at " + better + " of " + cards.length + ".";
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
