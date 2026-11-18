// /ben-picks: Ben marks each school Send or Skip. Password is FAMILY_PASSWORD, checked on the server.
(function () {
  let password = "";
  try { password = sessionStorage.getItem("bw-family") || ""; } catch (e) {}
  const gate = document.getElementById("gate"), pwErr = document.getElementById("pw-err");
  const panel = document.getElementById("panel"), list = document.getElementById("list"), status = document.getElementById("status");
  let schools = [], division = "All", pickFilter = "All", query = "";

  const errors = {
    wrong_password: "That password isn't right. Check with Thomas.",
    password_not_configured: "The password hasn't been set up on the server yet.",
    storage_not_configured: "Storage isn't connected yet.",
  };

  async function api(method, body) {
    const r = await fetch("/api/picks", {
      method, headers: { "Content-Type": "application/json", "x-family-password": password },
      body: body ? JSON.stringify(body) : undefined,
    });
    let d = {}; try { d = await r.json(); } catch (e) {}
    if (!r.ok) { const e = new Error(d.error || "server_error"); e.status = r.status; throw e; }
    return d;
  }

  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; };

  async function load() {
    try {
      const d = await api("GET");
      schools = d.schools;
      gate.hidden = true; panel.hidden = false;
      buildChips(); render();
      return true;
    } catch (e) {
      gate.hidden = false; panel.hidden = true;
      pwErr.textContent = errors[e.message] || "Couldn't load the schools. Try again in a minute.";
      pwErr.hidden = false;
      if (e.status === 401) { password = ""; try { sessionStorage.removeItem("bw-family"); } catch (x) {} }
      return false;
    }
  }

  function chipRow(container, options, current, onPick) {
    container.textContent = "";
    options.forEach(o => {
      const b = el("button", "chip", o); b.type = "button";
      b.setAttribute("aria-pressed", String(o === current));
      b.onclick = () => { onPick(o); buildChips(); render(); };
      container.append(b);
    });
  }
  function buildChips() {
    const divs = ["All", ...["D1", "D2", "D3", "NAIA", "JUCO", "Other"].filter(d => schools.some(s => s.division === d))];
    chipRow(document.getElementById("div-chips"), divs, division, v => (division = v));
    chipRow(document.getElementById("pick-chips"), ["All", "Not decided", "Send", "Skip"], pickFilter, v => (pickFilter = v));
  }

  function summary() {
    const s = document.getElementById("summary"); s.textContent = "";
    const send = schools.filter(x => x.pick === "send").length, skip = schools.filter(x => x.pick === "skip").length;
    [[send, "send", "send"], [skip, "skip", ""], [schools.length - send - skip, "not decided", ""]].forEach(([n, label, cls]) => {
      const sp = el("span", cls); sp.append(el("b", "", String(n)), document.createTextNode(label)); s.append(sp);
    });
  }

  function matches(s) {
    if (division !== "All" && s.division !== division) return false;
    if (pickFilter === "Send" && s.pick !== "send") return false;
    if (pickFilter === "Skip" && s.pick !== "skip") return false;
    if (pickFilter === "Not decided" && s.pick) return false;
    if (query && ![s.name, s.conference, s.state, s.reason].join(" ").toLowerCase().includes(query)) return false;
    return true;
  }

  let firstRender = true, justPicked = null;
  async function setPick(s, pick) {
    const prev = s.pick;
    s.pick = s.pick === pick ? null : pick;   // tapping the active choice clears it
    justPicked = s.id;
    render();
    justPicked = null;
    try { await api("POST", { action: "setPick", id: s.id, pick: s.pick }); status.textContent = ""; }
    catch (e) { s.pick = prev; render(); status.textContent = "Couldn't save " + s.name + ". Try again."; }
  }

  function render() {
    summary();
    list.textContent = "";
    if (!schools.length) { list.append(el("li", "empty", "No schools yet. Thomas is still adding them.")); return; }
    const shown = schools.filter(matches);
    if (!shown.length) { list.append(el("li", "empty", "No schools match these filters.")); return; }
    shown.forEach(s => {
      const li = el("li", "school" + (s.pick ? " " + s.pick : "") + (s.id === justPicked ? " just-picked" : ""));
      const info = el("div", "info");
      info.append(el("div", "name", s.name));
      const sub = [s.rank ? "#" + s.rank : "", s.division, s.conference, s.state].filter(Boolean).join(" · ");
      if (sub) info.append(el("div", "sub", sub));
      if (s.reason) info.append(el("div", "reason", s.reason));
      const t = el("div", "toggle");
      [["send", "Send"], ["skip", "Skip"]].forEach(([v, label]) => {
        const b = el("button", v + (s.pick === v ? " on" : ""), label); b.type = "button";
        b.setAttribute("aria-pressed", String(s.pick === v));
        b.onclick = () => setPick(s, v);
        t.append(b);
      });
      li.append(info, t);
      list.append(li);
    });
    if (firstRender && window.motionStagger) { firstRender = false; window.motionStagger(list); }
  }

  document.getElementById("search").addEventListener("input", e => { query = e.target.value.trim().toLowerCase(); render(); });
  gate.addEventListener("submit", async e => {
    e.preventDefault(); pwErr.hidden = true;
    password = document.getElementById("pw").value;
    if (await load()) { try { sessionStorage.setItem("bw-family", password); } catch (x) {} }
  });
  if (password) load();
})();
