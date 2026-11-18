// Questions for Ben at /questions. The password is checked by the server against
// the FAMILY_PASSWORD environment variable; nothing secret lives in this file.
(function () {
  let password = "";
  try { password = sessionStorage.getItem("bw-family") || ""; } catch (e) {}

  const gateForm = document.getElementById("gate");
  const pwErr = document.getElementById("pw-err");
  const qa = document.getElementById("qa");
  const status = document.getElementById("db-status");
  const list = document.getElementById("qlist");

  const fmtDate = t => t ? new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

  async function api(method, body) {
    const r = await fetch("/api/family", {
      method,
      headers: { "Content-Type": "application/json", "x-family-password": password },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try { data = await r.json(); } catch (e) {}
    if (!r.ok) { const e = new Error(data.error || "server_error"); e.status = r.status; throw e; }
    return data;
  }

  const messages = {
    wrong_password: "That password isn't right. Check with Thomas.",
    password_not_configured: "The family password hasn't been set up on the server yet (FAMILY_PASSWORD in Vercel).",
    storage_not_configured: "Storage isn't connected yet. Add an Upstash Redis database to the Vercel project.",
  };

  async function load() {
    status.hidden = false;
    status.textContent = "Loading…";
    try {
      const data = await api("GET");
      gateForm.hidden = true;
      qa.hidden = false;
      status.hidden = true;
      renderQuestions(data.questions.sort((a, b) => b.askedAt - a.askedAt));
      return true;
    } catch (e) {
      if (e.status === 401) {
        password = "";
        try { sessionStorage.removeItem("bw-family"); } catch (x) {}
        gateForm.hidden = false; qa.hidden = true;
        pwErr.textContent = messages.wrong_password; pwErr.hidden = false;
      } else {
        gateForm.hidden = true; qa.hidden = false;
        status.textContent = messages[e.message] || "Couldn't load the questions. Try again in a minute.";
      }
      return false;
    }
  }

  gateForm.addEventListener("submit", async e => {
    e.preventDefault();
    pwErr.hidden = true;
    password = document.getElementById("pw").value;
    if (await load()) { try { sessionStorage.setItem("bw-family", password); } catch (x) {} }
  });

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function renderQuestions(qs) {
    list.textContent = "";
    if (!qs.length) { list.appendChild(el("li", "empty", "No questions yet. Post the first one above.")); return; }
    qs.forEach(q => {
      const li = el("li", "q" + (q.answer ? " answered" : ""));
      li.append(el("div", "qtext", q.text));
      li.append(el("div", "meta", "Asked " + fmtDate(q.askedAt) + (q.answer ? " · Answered " + fmtDate(q.answeredAt) : " · Waiting for Ben")));
      if (q.answer) li.append(el("div", "answer", q.answer));

      const box = el("textarea");
      box.id = "ans-" + q.id; box.placeholder = "Ben's answer…"; box.value = q.answer || ""; box.hidden = !!q.answer;
      const save = el("button", "btn primary", "Save answer"); save.type = "button"; save.hidden = !!q.answer;
      const edit = el("button", "linkbtn", "Edit answer"); edit.type = "button"; edit.hidden = !q.answer;
      const del = el("button", "linkbtn", "Delete"); del.type = "button";
      const st = el("span", "status");

      edit.onclick = () => { box.hidden = false; save.hidden = false; edit.hidden = true; box.focus(); };
      save.onclick = async () => {
        save.disabled = true; st.textContent = "Saving…";
        try { await api("POST", { action: "answer", id: q.id, answer: box.value }); await load(); }
        catch (err) { st.textContent = "Couldn't save. Try again."; save.disabled = false; }
      };
      let armed = false;
      del.onclick = async () => {
        if (!armed) { armed = true; del.textContent = "Click again to delete"; setTimeout(() => { armed = false; del.textContent = "Delete"; }, 3000); return; }
        try { await api("POST", { action: "deleteQuestion", id: q.id }); await load(); } catch (err) { st.textContent = "Couldn't delete."; }
      };

      const row = el("div", "actions"); row.append(save, edit, del, st);
      li.append(box, row);
      list.appendChild(li);
    });
  }

  document.getElementById("ask-form").addEventListener("submit", async e => {
    e.preventDefault();
    const ta = document.getElementById("new-q"); const st = document.getElementById("ask-status");
    st.textContent = "Posting…";
    try { await api("POST", { action: "addQuestion", text: ta.value }); ta.value = ""; st.textContent = "Posted"; await load(); }
    catch (err) { st.textContent = "Couldn't post. Try again."; }
  });

  if (password) load(); else { gateForm.hidden = false; qa.hidden = true; status.hidden = true; }
})();
