// /add-picks: Thomas manages the school list and copies the Send list.
// Password is ADMIN_PASSWORD (or FAMILY_PASSWORD if unset), checked on the server.
(function () {
  let password = "";
  try { password = sessionStorage.getItem("bw-admin") || ""; } catch (e) {}
  const gate = document.getElementById("gate"), pwErr = document.getElementById("pw-err"), panel = document.getElementById("panel");
  let schools = [], pickFilter = "All", query = "";

  const errors = {
    wrong_password: "That password isn't right.",
    password_not_configured: "No admin password is set on the server yet.",
    storage_not_configured: "Storage isn't connected yet.",
  };

  async function api(method, body) {
    const r = await fetch("/api/picks", {
      method, headers: { "Content-Type": "application/json", "x-admin-password": password },
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
      if (d.role !== "admin") throw Object.assign(new Error("wrong_password"), { status: 401 });
      schools = d.schools;
      gate.hidden = true; panel.hidden = false;
      render();
      return true;
    } catch (e) {
      gate.hidden = false; panel.hidden = true;
      pwErr.textContent = errors[e.message] || "Couldn't load the schools. Try again in a minute.";
      pwErr.hidden = false;
      if (e.status === 401) { password = ""; try { sessionStorage.removeItem("bw-admin"); } catch (x) {} }
      return false;
    }
  }

  function render() {
    const send = schools.filter(x => x.pick === "send").length, skip = schools.filter(x => x.pick === "skip").length;
    const sum = document.getElementById("summary"); sum.textContent = "";
    [[schools.length, "schools", ""], [send, "send", "send"], [skip, "skip", ""], [schools.length - send - skip, "not decided", ""]].forEach(([n, l, c]) => {
      const s = el("span", c); s.append(el("b", "", String(n)), document.createTextNode(l)); sum.append(s);
    });

    const chips = document.getElementById("pick-chips"); chips.textContent = "";
    ["All", "Send", "Skip", "Not decided"].forEach(o => {
      const b = el("button", "chip", o); b.type = "button"; b.setAttribute("aria-pressed", String(o === pickFilter));
      b.onclick = () => { pickFilter = o; render(); }; chips.append(b);
    });

    const body = document.getElementById("rows"); body.textContent = "";
    const shown = schools.filter(s =>
      (pickFilter === "All" || (pickFilter === "Send" && s.pick === "send") || (pickFilter === "Skip" && s.pick === "skip") || (pickFilter === "Not decided" && !s.pick)) &&
      (!query || [s.name, s.conference, s.state, s.coachName, s.reason].join(" ").toLowerCase().includes(query)));
    if (!shown.length) {
      const tr = el("tr"); const td = el("td", "status", schools.length ? "No schools match." : "No schools yet. Add one above."); td.colSpan = 7; tr.append(td); body.append(tr); return;
    }
    shown.forEach(s => {
      const tr = el("tr");
      const coach = el("td"); coach.append(el("div", "", s.coachName || "–")); if (s.coachEmail) coach.append(el("div", "sub mono", s.coachEmail));
      const pickTd = el("td");
      pickTd.append(el("span", "pill " + (s.pick === "send" ? "yes" : s.pick === "skip" ? "skip" : "no"), s.pick === "send" ? "Send" : s.pick === "skip" ? "Skip" : "Not decided"));
      const act = el("td");
      const del = el("button", "linkbtn", "Remove"); del.type = "button";
      let armed = false;
      del.onclick = async () => {
        if (!armed) { armed = true; del.textContent = "Click again"; setTimeout(() => { armed = false; del.textContent = "Remove"; }, 3000); return; }
        try { await api("POST", { action: "deleteSchool", id: s.id }); await load(); } catch (e) {}
      };
      act.append(del);
      const name = el("td"); name.append(el("strong", "", s.name)); if (s.reason) name.append(el("div", "sub", s.reason));
      tr.append(el("td", "num", s.rank ? "#" + s.rank : "–"), name, el("td", "", s.division || "–"), el("td", "", s.state || "–"), coach, pickTd, act);
      body.append(tr);
    });
  }

  async function add(list, statusEl) {
    statusEl.textContent = "Adding…";
    try {
      const r = await api("POST", { action: "addSchools", schools: list });
      statusEl.textContent = "Added " + r.added + (r.updated ? ", updated " + r.updated : "") + (r.skipped ? ", skipped " + r.skipped + " already on the list" : "") + ".";
      await load(); return true;
    } catch (e) { statusEl.textContent = "Couldn't add. Try again."; return false; }
  }

  document.getElementById("add-one").addEventListener("submit", async e => {
    e.preventDefault();
    const v = id => document.getElementById(id).value;
    if (await add([{ name: v("s-name"), division: v("s-div"), conference: v("s-conf"), state: v("s-state"), coachName: v("s-coach"), coachEmail: v("s-email") }], document.getElementById("one-status"))) e.target.reset();
  });

  document.getElementById("bulk-add").addEventListener("click", async () => {
    const lines = document.getElementById("bulk").value.split("\n").map(l => l.trim()).filter(Boolean);
    const list = lines.map(l => { const [name, division, conference, state, coachName, coachEmail] = l.split(/\t|,/).map(x => x.trim()); return { name, division, conference, state, coachName, coachEmail }; });
    if (!list.length) return;
    if (await add(list, document.getElementById("bulk-status"))) document.getElementById("bulk").value = "";
  });

  document.getElementById("starter-add").addEventListener("click", async () => {
    const st = document.getElementById("starter-status");
    try {
      const r = await fetch("/data/starter-schools.json");
      const d = await r.json();
      await add(d.schools, st);
    } catch (e) { st.textContent = "Couldn't load the starter list."; }
  });

  async function copy(text, label) {
    const st = document.getElementById("copy-status");
    try { await navigator.clipboard.writeText(text); st.textContent = label; }
    catch (e) { st.textContent = "Couldn't copy. Your browser blocked the clipboard."; }
  }
  document.getElementById("copy-emails").onclick = () => {
    const sendList = schools.filter(s => s.pick === "send");
    const emails = sendList.map(s => s.coachEmail).filter(Boolean);
    copy(emails.join(", "), "Copied " + emails.length + " emails" + (emails.length < sendList.length ? " (" + (sendList.length - emails.length) + " Send schools have no email yet)" : "") + ".");
  };
  document.getElementById("copy-csv").onclick = () => {
    const q = x => '"' + String(x || "").replace(/"/g, '""') + '"';
    const rows = [["Rank", "School", "Division", "State", "Coach", "Email", "Reason"], ...schools.filter(s => s.pick === "send").map(s => [s.rank || "", s.name, s.division, s.state, s.coachName, s.coachEmail, s.reason])];
    copy(rows.map(r => r.map(q).join(",")).join("\n"), "Copied " + (rows.length - 1) + " schools as CSV. Paste into a spreadsheet.");
  };

  document.getElementById("search").addEventListener("input", e => { query = e.target.value.trim().toLowerCase(); render(); });
  gate.addEventListener("submit", async e => {
    e.preventDefault(); pwErr.hidden = true;
    password = document.getElementById("pw").value;
    if (await load()) { try { sessionStorage.setItem("bw-admin", password); } catch (x) {} }
  });
  if (password) load();
})();
