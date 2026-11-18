// Family-only API behind the FAMILY_PASSWORD env var (sent in the x-family-password header).
// GET  /api/family                -> { questions, codes, visits }
// POST /api/family { action, ... } -> addQuestion | answer | deleteQuestion | addCode | deleteCode
const crypto = require("crypto");
const { redis, parseHash, checkPassword } = require("./_lib/store");

module.exports = async (req, res) => {
  if (!process.env.FAMILY_PASSWORD) return res.status(500).json({ error: "password_not_configured" });
  if (!checkPassword(req.headers["x-family-password"])) return res.status(401).json({ error: "wrong_password" });

  try {
    if (req.method === "GET") {
      const [q, c, v] = await Promise.all([
        redis("HGETALL", "questions"),
        redis("HGETALL", "codes"),
        redis("LRANGE", "visits", 0, -1),
      ]);
      const visits = (v || []).map(x => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean);
      return res.status(200).json({ questions: parseHash(q), codes: parseHash(c), visits });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
    const b = req.body || {};
    const text = (s, max) => String(s || "").trim().slice(0, max);

    switch (b.action) {
      case "addQuestion": {
        const t = text(b.text, 1000);
        if (!t) return res.status(400).json({ error: "empty_question" });
        const id = crypto.randomUUID();
        await redis("HSET", "questions", id, JSON.stringify({ id, text: t, askedAt: Date.now(), answer: "", answeredAt: null }));
        return res.status(200).json({ ok: true, id });
      }
      case "answer": {
        const raw = await redis("HGET", "questions", String(b.id));
        if (!raw) return res.status(404).json({ error: "not_found" });
        const q = JSON.parse(raw);
        q.answer = text(b.answer, 5000);
        q.answeredAt = q.answer ? Date.now() : null;
        await redis("HSET", "questions", q.id, JSON.stringify(q));
        return res.status(200).json({ ok: true });
      }
      case "deleteQuestion":
        await redis("HDEL", "questions", String(b.id));
        return res.status(200).json({ ok: true });
      case "addCode": {
        const code = String(b.code || "");
        if (!/^\d{4}$/.test(code)) return res.status(400).json({ error: "bad_code" });
        const coach = text(b.coach, 120);
        if (!coach) return res.status(400).json({ error: "missing_coach" });
        const added = await redis("HSETNX", "codes", code, JSON.stringify({ code, coach, school: text(b.school, 120), createdAt: Date.now() }));
        if (!added) return res.status(409).json({ error: "code_taken" });
        return res.status(200).json({ ok: true });
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
