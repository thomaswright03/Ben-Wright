// Tiny Upstash Redis REST client. Works with either env var naming that
// Vercel's Upstash integration sets (KV_* or UPSTASH_REDIS_REST_*).
const crypto = require("crypto");

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(...command) {
  if (!URL_ || !TOKEN) throw new Error("storage_not_configured");
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const json = await r.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

function parseHash(arr) {
  // HGETALL returns [field, value, field, value, ...]
  const out = [];
  for (let i = 0; i < (arr || []).length; i += 2) {
    try { out.push(JSON.parse(arr[i + 1])); } catch (e) {}
  }
  return out;
}

// Compares the supplied password with the FAMILY_PASSWORD env var in constant time.
function checkPassword(supplied) {
  const expected = process.env.FAMILY_PASSWORD;
  if (!expected || typeof supplied !== "string") return false;
  const a = crypto.createHash("sha256").update(supplied).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = { redis, parseHash, checkPassword };
