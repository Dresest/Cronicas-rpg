import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

process.env.VITE_SUPABASE_URL = "https://test-project.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY = "public-test-key";
const { default: handler } = await import("../api/database-health.js");

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function response() {
  return {
    headers: {},
    code: 200,
    body: null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("manual GET checks Supabase once without revealing the key", async () => {
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.match(url, /service_ping\?select=id,service_name&id=eq.1$/);
    assert.equal(options.method, "GET");
    assert.equal(options.headers.apikey, "public-test-key");
    return { ok: true, json: async () => [{ id: 1, service_name: "Crónicas RPG" }] };
  };

  const res = response();
  await handler({ method: "GET", headers: {} }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.checks, 1);
  assert.equal(res.body.kind, "manual");
  assert.equal(calls, 1);
  assert.ok(!JSON.stringify(res.body).includes("public-test-key"));
});

test("cron GET uses five independent, read-only checks", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return { ok: true, json: async () => [{ id: 1 }] };
  };

  const res = response();
  await handler({ method: "GET", headers: { "user-agent": "vercel-cron/1.0" } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.kind, "scheduled");
  assert.equal(res.body.checks, 5);
  assert.equal(calls, 5);
});

test("rejects methods other than GET", async () => {
  globalThis.fetch = () => { throw new Error("Should not fetch"); };
  const res = response();
  await handler({ method: "POST", headers: {} }, res);
  assert.equal(res.code, 405);
  assert.equal(res.body.ok, false);
});

test("reports a failed service check without leaking internal details", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    globalThis.fetch = async () => ({ ok: false, status: 503 });
    const res = response();
    await handler({ method: "GET", headers: {} }, res);
    assert.equal(res.code, 503);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.error, "Database health check failed");
    assert.ok(!JSON.stringify(res.body).includes("public-test-key"));
  } finally {
    console.error = originalError;
  }
});

test("rejects malformed Supabase payloads", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    globalThis.fetch = async () => ({ ok: true, json: async () => [] });
    const res = response();
    await handler({ method: "GET", headers: {} }, res);
    assert.equal(res.code, 503);
  } finally {
    console.error = originalError;
  }
});
