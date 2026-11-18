// Tiny Upstash Redis REST client. Works with either env var naming that
// Vercel's Upstash integration sets (KV_* or UPSTASH_REDIS_REST_*).
const crypto = require("crypto");

// Vercel can prefix these names (e.g. STORAGE_KV_REST_API_URL), so also accept
// any variable ending in KV_REST_API_URL or REDIS_REST_URL with its matching token.
function findEnv() {
  const env = process.env;
  if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) return [env.KV_REST_API_URL, env.KV_REST_API_TOKEN];
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) return [env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN];
  for (const k of Object.keys(env)) {
    const m = k.match(/^(.*)(KV_REST_API|REDIS_REST)_URL$/);
    if (!m) continue;
    const token = env[m[1] + m[2] + "_TOKEN"];
    if (env[k] && token) return [env[k], token];
  }
  return [null, null];
}
const [URL_, TOKEN] = findEnv();

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

// Compares the supplied password with an env var in constant time.
// ADMIN_PASSWORD guards /admin; if it isn't set, FAMILY_PASSWORD is used for both.
function expectedPassword(kind) {
  return kind === "admin" ? (process.env.ADMIN_PASSWORD || process.env.FAMILY_PASSWORD) : process.env.FAMILY_PASSWORD;
}
function checkPassword(supplied, kind) {
  const expected = expectedPassword(kind);
  if (!expected || typeof supplied !== "string") return false;
  const a = crypto.createHash("sha256").update(supplied).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = { redis, parseHash, checkPassword, expectedPassword };
