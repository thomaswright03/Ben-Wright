// Coach codes and visit log, behind ADMIN_PASSWORD (falls back to FAMILY_PASSWORD),
// sent in the x-admin-password header.
// GET  /api/admin                  -> { codes, visits }
// POST /api/admin { action, ... }   -> addCode (code optional: picks a free one) | deleteCode
const crypto = require("crypto");
const { redis, parseHash, checkPassword, expectedPassword } = require("./_lib/store");

module.exports = async (req, res) => {
  if (!expectedPassword("admin")) return res.status(500).json({ error: "password_not_configured" });
  if (!checkPassword(req.headers["x-admin-password"], "admin")) return res.status(401).json({ error: "wrong_password" });

  try {
    if (req.method === "GET") {
      const [c, v] = await Promise.all([redis("HGETALL", "codes"), redis("LRANGE", "visits", 0, -1)]);
      const visits = (v || []).map(x => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean);
      return res.status(200).json({ codes: parseHash(c), visits });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
    const b = req.body || {};
    const text = (s, max) => String(s || "").trim().slice(0, max);

    switch (b.action) {
      case "addCode": {
        const coach = text(b.coach, 120);
        if (!coach) return res.status(400).json({ error: "missing_coach" });
        const record = code => JSON.stringify({ code, coach, school: text(b.school, 120), createdAt: Date.now() });
        let code = String(b.code || "").trim();
        if (code) {
          if (!/^\d{4}$/.test(code)) return res.status(400).json({ error: "bad_code" });
          if (!(await redis("HSETNX", "codes", code, record(code)))) return res.status(409).json({ error: "code_taken" });
          return res.status(200).json({ ok: true, code });
        }
        for (let i = 0; i < 50; i++) {
          code = String(crypto.randomInt(1000, 10000));
          if (await redis("HSETNX", "codes", code, record(code))) return res.status(200).json({ ok: true, code });
        }
        return res.status(409).json({ error: "no_free_code" });
      }
      case "deleteCode":
        await redis("HDEL", "codes", String(b.code));
        return res.status(200).json({ ok: true });
      default:
        return res.status(400).json({ error: "unknown_action" });
    }
  } catch (e) {
    if (e.message === "storage_not_configured") return res.status(500).json({ error: "storage_not_configured" });
    return res.status(500).json({ error: "server_error" });
  }
};
