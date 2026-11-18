// School picks for the mass recruiting email.
// Ben signs in with FAMILY_PASSWORD (x-family-password) and marks each school "send" or "skip".
// Thomas signs in with ADMIN_PASSWORD, or FAMILY_PASSWORD if unset (x-admin-password), and manages the list.
// GET  /api/picks                         -> { schools, role }
// POST /api/picks { action: "setPick", id, pick: "send"|"skip"|null }   (family or admin)
// POST /api/picks { action: "addSchools", schools: [{name, division, conference, state, coachName, coachEmail}] } (admin)
// POST /api/picks { action: "updateSchool", id, ...fields } (admin)
// POST /api/picks { action: "deleteSchool", id } (admin)
const crypto = require("crypto");
const { redis, parseHash, checkPassword, expectedPassword } = require("./_lib/store");

const DIVISIONS = ["D1", "D2", "D3", "NAIA", "JUCO", "Other"];
const clean = (s, max) => String(s || "").trim().slice(0, max);

function cleanSchool(s) {
  const division = clean(s.division, 10).toUpperCase().replace(/^DIVISION\s*/, "D").replace(/^NJCAA$/, "JUCO");
  return {
    name: clean(s.name, 120),
    division: DIVISIONS.includes(division) ? division : (division ? "Other" : ""),
    conference: clean(s.conference, 80),
    state: clean(s.state, 40),
    coachName: clean(s.coachName, 120),
    coachEmail: clean(s.coachEmail, 160),
    reason: clean(s.reason, 300),
    rank: Number.isInteger(Number(s.rank)) && Number(s.rank) > 0 ? Number(s.rank) : null,
  };
}

module.exports = async (req, res) => {
  if (!process.env.FAMILY_PASSWORD && !expectedPassword("admin")) return res.status(500).json({ error: "password_not_configured" });
  const isAdmin = !!req.headers["x-admin-password"] && checkPassword(req.headers["x-admin-password"], "admin");
  const isFamily = isAdmin || (!!req.headers["x-family-password"] && checkPassword(req.headers["x-family-password"], "family"));
  if (!isFamily) return res.status(401).json({ error: "wrong_password" });

  try {
    if (req.method === "GET") {
      const schools = parseHash(await redis("HGETALL", "schools"))
        .sort((a, b) => (a.rank || 9999) - (b.rank || 9999) || a.name.localeCompare(b.name));
      return res.status(200).json({ schools, role: isAdmin ? "admin" : "family" });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
    const b = req.body || {};

    if (b.action === "setPick") {
      const raw = await redis("HGET", "schools", String(b.id));
      if (!raw) return res.status(404).json({ error: "not_found" });
      const s = JSON.parse(raw);
      s.pick = b.pick === "send" || b.pick === "skip" ? b.pick : null;
      s.pickedAt = s.pick ? Date.now() : null;
      await redis("HSET", "schools", s.id, JSON.stringify(s));
      return res.status(200).json({ ok: true });
    }

    if (!isAdmin) return res.status(403).json({ error: "admin_only" });

    switch (b.action) {
      case "addSchools": {
        // Adds new schools. A school already on the list (same name) keeps Ben's pick
        // but gets any new details filled in (reason, rank, state, etc.).
        const list = Array.isArray(b.schools) ? b.schools.slice(0, 1000) : [];
        const byName = new Map(parseHash(await redis("HGETALL", "schools")).map(s => [s.name.toLowerCase(), s]));
        let added = 0, updated = 0, skipped = 0;
        const args = [];
        for (const item of list) {
          const s = cleanSchool(item);
          if (!s.name) { skipped++; continue; }
          const prev = byName.get(s.name.toLowerCase());
          if (prev) {
            const merged = { ...prev };
            for (const [k, v] of Object.entries(s)) if (v !== "" && v !== null) merged[k] = v;
            if (JSON.stringify(merged) === JSON.stringify(prev)) { skipped++; continue; }
            args.push(prev.id, JSON.stringify(merged)); byName.set(s.name.toLowerCase(), merged); updated++;
            continue;
          }
          const id = crypto.randomUUID();
          const rec = { id, ...s, pick: null, pickedAt: null, addedAt: Date.now() };
          args.push(id, JSON.stringify(rec)); byName.set(s.name.toLowerCase(), rec); added++;
        }
        if (args.length) await redis("HSET", "schools", ...args);
        return res.status(200).json({ ok: true, added, updated, skipped });
      }
      case "updateSchool": {
        const raw = await redis("HGET", "schools", String(b.id));
        if (!raw) return res.status(404).json({ error: "not_found" });
        const s = { ...JSON.parse(raw), ...cleanSchool({ ...JSON.parse(raw), ...b }) };
        if (!s.name) return res.status(400).json({ error: "missing_name" });
        await redis("HSET", "schools", s.id, JSON.stringify(s));
        return res.status(200).json({ ok: true });
      }
      case "deleteSchool":
        await redis("HDEL", "schools", String(b.id));
        return res.status(200).json({ ok: true });
      default:
        return res.status(400).json({ error: "unknown_action" });
    }
  } catch (e) {
    if (e.message === "storage_not_configured") return res.status(500).json({ error: "storage_not_configured" });
    return res.status(500).json({ error: "server_error" });
  }
};
