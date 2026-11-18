// POST /api/visit  { code: "1234" | "none" }
// Records that a coach opened the profile. Returns 404 for a code that hasn't been assigned.
const { redis } = require("./_lib/store");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const code = String((req.body && req.body.code) || "");
  if (code !== "none" && !/^\d{4}$/.test(code)) return res.status(400).json({ error: "bad_code" });
  try {
    if (code !== "none") {
      const exists = await redis("HEXISTS", "codes", code);
      if (!exists) return res.status(404).json({ error: "unknown_code" });
    }
    await redis("LPUSH", "visits", JSON.stringify({ code, at: Date.now() }));
    await redis("LTRIM", "visits", 0, 4999);
    return res.status(200).json({ ok: true });
  } catch (e) {
    // Never lock a coach out because storage is down: let them through.
    return res.status(200).json({ ok: true, logged: false });
  }
};
