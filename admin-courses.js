// /admin: manage the course comparison shown on the profile.
(function () {
  const panel = document.getElementById("course-panel");
  const status = document.getElementById("course-status");
  const pw = () => { try { return sessionStorage.getItem("bw-admin") || ""; } catch (e) { return ""; } };
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; };

  async function post(body) {
    const r = await fetch("/api/courses", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-password": pw() }, body: JSON.stringify(body) });
    let d = {}; try { d = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(d.error || "server_error");
    return d;
  }

  async function load() {
    const r = await fetch("/api/courses"); const d = r.ok ? await r.json() : { courses: [] };
    const body = document.getElementById("course-rows"); body.textContent = "";
    if (!d.courses.length) { const tr = el("tr"); const td = el("td", "status", "No courses yet."); td.colSpan = 7; tr.append(td); body.append(tr); return; }
    d.courses.forEach(c => {
      const ben = c.benRounds.length ? c.benRounds.reduce((a, b) => a + b, 0) / c.benRounds.length : null;
      const diff = ben !== null && c.d1FieldAvg ? ben - c.d1FieldAvg : null;
      const tr = el("tr");
      const name = el("td"); name.append(el("strong", "", c.course)); if (c.location) name.append(el("div", "sub", c.location));
      const ev = el("td"); ev.append(el("div", "", [c.d1Event, c.d1Year].filter(Boolean).join(", ") || "–"));
      const act = el("td"); const del = el("button", "linkbtn", "Remove"); del.type = "button";
      let armed = false;
      del.onclick = async () => {
        if (!armed) { armed = true; del.textContent = "Click again"; setTimeout(() => { armed = false; del.textContent = "Remove"; }, 3000); return; }
        try { await post({ action: "deleteCourse", id: c.id }); load(); } catch (e) { status.textContent = "Couldn't remove it."; }
      };
      act.append(del);
      tr.append(name, el("td", "mono", c.benRounds.join(", ") || "–"), el("td", "num", ben ? ben.toFixed(1) : "–"), ev,
        el("td", "num", c.d1FieldAvg ? c.d1FieldAvg.toFixed(1) : "–"), el("td", "num", diff === null ? "–" : (diff > 0 ? "+" : "") + diff.toFixed(1)), act);
      body.append(tr);
    });
  }

  document.getElementById("course-add").addEventListener("submit", async e => {
    e.preventDefault();
    const v = id => document.getElementById(id).value;
    status.textContent = "Saving…";
    try {
      await post({ action: "addCourse", course: v("c-course"), location: v("c-loc"), par: v("c-par"), benRounds: v("c-rounds"), d1Event: v("c-event"), d1Year: v("c-year"), d1FieldAvg: v("c-avg"), d1Link: v("c-link") });
      e.target.reset(); status.textContent = "Added."; load();
    } catch (err) { status.textContent = err.message === "wrong_password" ? "Log in again above." : "Couldn't add the course."; }
  });

  // Show once the admin panel above is unlocked
  const main = document.getElementById("panel");
  const sync = () => { panel.hidden = main.hidden; if (!panel.hidden && !panel.dataset.loaded) { panel.dataset.loaded = "1"; load(); } };
  new MutationObserver(sync).observe(main, { attributes: true, attributeFilter: ["hidden"] });
  sync();
})();
