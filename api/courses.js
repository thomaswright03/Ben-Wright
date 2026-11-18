// Course comparison: Ben's scores at a course vs the scoring average of a
// Division I college event played at the same course.
// GET  /api/courses                     -> { courses }   (public; shown on the profile)
// POST /api/courses { action, ... }      -> addCourse | updateCourse | deleteCourse  (admin password)
const crypto = require("crypto");
const { redis, parseHash, checkPassword, expectedPassword } = require("./_lib/store");

const clean = (s, max) => String(s ?? "").trim().slice(0, max);
const num = (v, min, max) => { const n = parseFloat(v); return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 100) / 100 : null; };

function cleanCourse(b) {
  const rounds = String(b.benRounds || "").split(/[^0-9]+/).map(Number).filter(n => n >= 50 && n <= 120).slice(0, 40);
  return {
    course: clean(b.course, 120),
    location: clean(b.location, 80),
    par: num(b.par, 60, 75),
    benRounds: rounds,
    benNote: clean(b.benNote, 160),
    d1Event: clean(b.d1Event, 160),
    d1Year: clean(b.d1Year, 10),
    d1FieldAvg: num(b.d1FieldAvg, 55, 100),
    d1Link: /^https?:\/\//.test(clean(b.d1Link, 400)) ? clean(b.d1Link, 400) : "",
    order: num(b.order, 0, 999) ?? 100,
  };
}

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const courses = parseHash(await redis("HGETALL", "courses")).sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.course.localeCompare(b.course));
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ courses });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
    if (!expectedPassword("admin")) return res.status(500).json({ error: "password_not_configured" });
    if (!checkPassword(req.headers["x-admin-password"], "admin")) return res.status(401).json({ error: "wrong_password" });

    const b = req.body || {};
    switch (b.action) {
      case "addCourse": {
        const c = cleanCourse(b);
        if (!c.course) return res.status(400).json({ error: "missing_course" });
        const id = crypto.randomUUID();
        await redis("HSET", "courses", id, JSON.stringify({ id, ...c }));
        return res.status(200).json({ ok: true, id });
      }
      case "updateCourse": {
        const raw = await redis("HGET", "courses", String(b.id));
        if (!raw) return res.status(404).json({ error: "not_found" });
        const c = { ...JSON.parse(raw), ...cleanCourse(b) };
        if (!c.course) return res.status(400).json({ error: "missing_course" });
        await redis("HSET", "courses", c.id, JSON.stringify(c));
        return res.status(200).json({ ok: true });
      }
      case "deleteCourse":
        await redis("HDEL", "courses", String(b.id));
        return res.status(200).json({ ok: true });
      default:
        return res.status(400).json({ error: "unknown_action" });
    }
  } catch (e) {
    if (e.message === "storage_not_configured") return res.status(500).json({ error: "storage_not_configured" });
    return res.status(500).json({ error: "server_error" });
  }
};
