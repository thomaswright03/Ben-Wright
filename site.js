// Front-page coach code gate. A coach enters their 4-digit code (or opens a
// personal link like /?c=1234) and the visit is recorded for the family area.
(function () {
  const gate = document.getElementById("code-gate");
  const digits = ["d1", "d2", "d3", "d4"].map(id => document.getElementById(id));
  const err = document.getElementById("code-err");
  const submit = document.querySelector("#code-form button[type=submit]");

  let passed = false;
  try { passed = sessionStorage.getItem("bw-code") !== null; } catch (e) {}

  function open(code) {
    try { sessionStorage.setItem("bw-code", code); } catch (e) {}
    gate.hidden = true;
    document.body.style.overflow = "";
  }

  async function record(code) {
    const r = await fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    return r.status;
  }

  async function tryCode(code) {
    submit.disabled = true;
    err.hidden = true;
    try {
      const status = await record(code);
      if (status === 404) {
        err.textContent = "That code isn't recognized. Check the email you received, or view the profile without one.";
        err.hidden = false;
        digits.forEach(d => (d.value = ""));
        digits[0].focus();
        return;
      }
    } catch (e) { /* network trouble: let the coach in anyway */ }
    finally { submit.disabled = false; }
    open(code);
  }

  digits.forEach((inp, i) => {
    inp.addEventListener("input", () => {
      inp.value = inp.value.replace(/\D/g, "").slice(0, 1);
      if (inp.value && digits[i + 1]) digits[i + 1].focus();
      if (digits.every(d => d.value)) document.getElementById("code-form").requestSubmit();
    });
    inp.addEventListener("keydown", e => {
      if (e.key === "Backspace" && !inp.value && digits[i - 1]) digits[i - 1].focus();
    });
    inp.addEventListener("paste", e => {
      const t = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 4);
      if (!t) return;
      e.preventDefault();
      t.split("").forEach((c, j) => (digits[j].value = c));
      digits[Math.min(t.length, 3)].focus();
      if (t.length === 4) document.getElementById("code-form").requestSubmit();
    });
  });

  document.getElementById("code-form").addEventListener("submit", e => {
    e.preventDefault();
    const code = digits.map(d => d.value).join("");
    if (!/^\d{4}$/.test(code)) { err.textContent = "Enter all 4 digits."; err.hidden = false; return; }
    tryCode(code);
  });

  document.getElementById("skip-code").addEventListener("click", e => {
    e.preventDefault();
    record("none").catch(() => {});
    open("none");
  });

  // Personal link: /?c=1234
  const linkCode = new URLSearchParams(location.search).get("c");
  if (linkCode && /^\d{4}$/.test(linkCode)) {
    history.replaceState(null, "", location.pathname + location.hash);
    if (!passed) { linkCode.split("").forEach((c, j) => (digits[j].value = c)); tryCode(linkCode); return; }
  }

  if (passed) gate.hidden = true;
  else { document.body.style.overflow = "hidden"; digits[0].focus(); }
})();
