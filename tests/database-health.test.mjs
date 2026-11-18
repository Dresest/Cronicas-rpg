import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.VITE_SUPABASE_URL = 'https://test-supabase.invalid';
process.env.VITE_SUPABASE_ANON_KEY = 'public-test-key';
const { default: handler } = await import('../api/database-health.js');

function mockResponse() {
  const out = { statusCode: 200, body: null, headers: {} };
  out.setHeader = (key, value) => { out.headers[key] = value; };
  out.status = (code) => { out.statusCode = code; return out; };
  out.json = (body) => { out.body = body; return out; };
  return out;
}
async function withFetch(fake, work) {
  const previous = globalThis.fetch;
  globalThis.fetch = fake;
  try { return await work(); } finally { globalThis.fetch = previous; }
}

test('vercel.json preserva los endpoints API y el cron diario', () => {
  const conf = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const rewrite = conf.rewrites[0];
  const matcher = new RegExp('^' + rewrite.source + '$');
  assert.equal(matcher.test('/panel'), true);
  assert.equal(matcher.test('/misiones/actuales'), true);
  assert.equal(matcher.test('/api/database-health'), false);
  assert.equal(matcher.test('/api/generate-rpg'), false);
  assert.equal(matcher.test('/api/generate-item'), false);
  assert.equal(matcher.test('/assets/index.js'), false);
  assert.deepEqual(conf.crons, [{path:'/api/database-health',schedule:'0 9 * * *'}]);
});

test('la comprobación manual realiza una sola consulta de solo lectura', async () => {
  let calls = 0;
  await withFetch(async (url, options) => {
    calls++;
    assert.equal(url, 'https://test-supabase.invalid/rest/v1/service_ping?select=id,service_name&id=eq.1');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.apikey, 'public-test-key');
    return { ok: true, json: async () => [{ id: 1, service_name: 'cronicas' }] };
  }, async () => {
    const res = mockResponse();
    await handler({ method:'GET', headers:{} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.kind, 'manual');
    assert.equal(res.body.checks, 1);
    assert.equal(calls, 1);
    assert.equal(res.headers['Cache-Control'], 'no-store');
  });
});

test('la comprobación de Vercel Cron realiza cinco lecturas', async () => {
  let calls = 0;
  await withFetch(async () => {
    calls++;
    return {ok:true,json:async()=>[{id:1,service_name:'cronicas'}]};
  }, async () => {
    const res = mockResponse();
    await handler({method:'GET',headers:{'user-agent':'vercel-cron/1.0'}},res);
    assert.equal(res.statusCode,200);
    assert.equal(res.body.kind,'automatic');
    assert.equal(res.body.checks,5);
    assert.equal(calls,5);
  });
});

test('rechaza otros métodos y no consulta Supabase', async () => {
  await withFetch(async () => { throw Error('should not be called'); },async()=>{
    const res=mockResponse();
    await handler({method:'POST',headers:{}},res);
    assert.equal(res.statusCode,405);
    assert.equal(res.body.ok,false);
  });
});

test('no confirma salud si la fila de prueba no existe', async () => {
  const originalError=console.error;
  console.error=()=>{};
  try {
    await withFetch(async ()=>({ok:true,json:async()=>[]}),async()=>{
      const res=mockResponse();
      await handler({method:'GET',headers:{}},res);
      assert.equal(res.statusCode,503);
      assert.equal(res.body.ok,false);
    });
  } finally {console.error=originalError;}
});
