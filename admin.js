// Admin page at /admin: create coach codes and see who has viewed the profile.
// The password is checked by the server (ADMIN_PASSWORD, or FAMILY_PASSWORD if unset).
(function () {
  let password = "";
  try { password = sessionStorage.getItem("bw-admin") || ""; } catch (e) {}

  const gateForm = document.getElementById("gate");
  const pwErr = document.getElementById("pw-err");
  const panel = document.getElementById("panel");
  const st = document.getElementById("code-status");
  let codes = [], visits = [];

  const fmtTime = t => new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const linkFor = code => location.origin + "/?c=" + code;

  const messages = {
    password_not_configured: "No admin password is set on the server yet. Add ADMIN_PASSWORD (or FAMILY_PASSWORD) in Vercel.",
    storage_not_configured: "Storage isn't connected yet. In Vercel, connect an Upstash Redis database to this project, then redeploy.",
  };

  async function api(method, body) {
    const r = await fetch("/api/admin", {
      method,
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try { data = await r.json(); } catch (e) {}
    if (!r.ok) { const e = new Error(data.error || "server_error"); e.status = r.status; throw e; }
    return data;
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  async function load() {
    try {
      const data = await api("GET");
      gateForm.hidden = true; panel.hidden = false;
      codes = data.codes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      visits = data.visits;
      render();
      if (!window.__staggered && window.motionStagger) { window.__staggered = true; window.motionStagger(document.getElementById("codes-body")); }
      return true;
    } catch (e) {
      if (e.status === 401) {
        password = "";
        try { sessionStorage.removeItem("bw-admin"); } catch (x) {}
        gateForm.hidden = false; panel.hidden = true; pwErr.hidden = false;
      } else {
        gateForm.hidden = false; panel.hidden = true;
        pwErr.textContent = messages[e.message] || "Couldn't load the admin page. Try again in a minute.";
        pwErr.hidden = false;
      }
      return false;
    }
  }

  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); btn.textContent = "Copied"; }
    catch (e) { btn.textContent = "Copy failed"; }
    setTimeout(() => (btn.textContent = btn.dataset.label || "Copy link"), 1500);
  }

  function render() {
    const viewed = codes.filter(c => visits.some(v => v.code === c.code)).length;
    const summary = document.getElementById("summary");
    summary.textContent = "";
    [[codes.length, "codes sent"], [viewed, "coaches viewed"], [codes.length - viewed, "not yet"]].forEach(([n, label]) => {
      const s = el("span"); s.append(el("b", "", String(n)), document.createTextNode(label)); summary.append(s);
    });

    const body = document.getElementById("codes-body");
    body.textContent = "";
    if (!codes.length) {
      const tr = el("tr"); const td = el("td", "status", "No codes yet. Create one above."); td.colSpan = 7; tr.append(td); body.append(tr);
    }
    codes.forEach(c => {
      const v = visits.filter(x => x.code === c.code);
      const last = v.reduce((a, x) => Math.max(a, x.at || 0), 0);
      const tr = el("tr");
      const codeTd = el("td", "", c.code); codeTd.style.fontFamily = "var(--mono)";
      const pillTd = el("td"); pillTd.append(el("span", "pill " + (v.length ? "yes" : "no"), v.length ? "Viewed" : "Not yet"));
      const act = el("td"); act.style.whiteSpace = "nowrap";
      const cp = el("button", "linkbtn", "Copy link"); cp.type = "button"; cp.dataset.label = "Copy link";
      cp.onclick = () => copy(linkFor(c.code), cp);
      const del = el("button", "linkbtn", "Remove"); del.type = "button"; del.style.marginLeft = "12px";
      let armed = false;
      del.onclick = async () => {
        if (!armed) { armed = true; del.textContent = "Click again"; setTimeout(() => { armed = false; del.textContent = "Remove"; }, 3000); return; }
        try { await api("POST", { action: "deleteCode", code: c.code }); await load(); } catch (e) { st.textContent = "Couldn't remove that code."; }
      };
      act.append(cp, del);
      tr.append(codeTd, el("td", "", c.coach), el("td", "", c.school || ""), pillTd, el("td", "num", String(v.length)), el("td", "", last ? fmtTime(last) : "–"), act);
      body.append(tr);
    });
    const anon = visits.filter(x => x.code === "none").length;
    document.getElementById("anon-visits").textContent = anon ? anon + " visit" + (anon === 1 ? "" : "s") + " without a code." : "";
  }

  gateForm.addEventListener("submit", async e => {
    e.preventDefault();
    pwErr.hidden = true;
    pwErr.textContent = "That password isn't right.";
    password = document.getElementById("pw").value;
    if (await load()) { try { sessionStorage.setItem("bw-admin", password); } catch (x) {} }
  });

  document.getElementById("code-add").addEventListener("submit", async e => {
    e.preventDefault();
    const code = document.getElementById("nc-code").value.trim();
    if (code && !/^\d{4}$/.test(code)) { st.textContent = "Codes are exactly 4 digits, or leave it blank."; return; }
    const coach = document.getElementById("nc-coach").value.trim();
    const school = document.getElementById("nc-school").value.trim();
    st.textContent = "Creating…";
    try {
      const r = await api("POST", { action: "addCode", code, coach, school });
      e.target.reset(); st.textContent = "";
      document.getElementById("created-code").textContent = r.code;
      document.getElementById("created-for").textContent = coach + (school ? ", " + school : "");
      document.getElementById("created-link").textContent = linkFor(r.code);
      document.getElementById("created").hidden = false;
      await load();
    } catch (err) {
      st.textContent = err.message === "code_taken" ? "Code " + code + " is already assigned." : "Couldn't create the code.";
    }
  });

  const copyBtn = document.getElementById("copy-link");
  copyBtn.onclick = () => copy(document.getElementById("created-link").textContent, copyBtn);

  if (password) load();
})();
