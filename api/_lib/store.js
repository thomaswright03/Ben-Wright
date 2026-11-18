// Storage client. Works with either kind of Redis that Vercel can connect:
//  - Redis (Redis Cloud): a REDIS_URL connection string (redis:// or rediss://)
//  - Upstash for Redis: KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_*)
// Vercel may add a custom prefix to these names, so prefixed variants are accepted too.
const crypto = require("crypto");

function findRest() {
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

function findRedisUrl() {
  const env = process.env;
  if (env.REDIS_URL) return env.REDIS_URL;
  for (const k of Object.keys(env)) {
    if (/_URL$/.test(k) && /^rediss?:\/\//.test(env[k] || "")) return env[k];
  }
  return null;
}

const [REST_URL, REST_TOKEN] = findRest();
const REDIS_URL = findRedisUrl();

// One TCP client reused across warm invocations.
let clientPromise = null;
function tcpClient() {
  if (!clientPromise) {
    const { createClient } = require("redis");
    const client = createClient({ url: REDIS_URL, socket: { connectTimeout: 5000 } });
    client.on("error", () => {});
    clientPromise = client.connect().then(() => client).catch(e => { clientPromise = null; throw e; });
  }
  return clientPromise;
}

async function redis(...command) {
  if (REDIS_URL) {
    const client = await tcpClient();
    return client.sendCommand(command.map(String));
  }
  if (!REST_URL || !REST_TOKEN) throw new Error("storage_not_configured");
  const r = await fetch(REST_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
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
