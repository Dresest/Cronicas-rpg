// Recuperación funcional del endpoint de comprobación diaria.
// Reconstruido a partir de la fuente parcial del despliegue de Vercel de octubre de 2026.
// No es una copia byte a byte del archivo histórico.
const URL = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

async function singleRead() {
  if (!URL || !KEY) throw new Error('Supabase environment variables missing');
  const endpoint = URL + '/rest/v1/service_ping?select=id,service_name&id=eq.1';
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      apikey: KEY,
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Supabase returned status ' + response.status);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0].id !== 1) {
    throw new Error('Service ping row unavailable');
  }
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const scheduled =
    String(req.headers?.['user-agent'] || '').startsWith('vercel-cron/') ||
    req.headers?.['x-vercel-cron'] === '1';
  const checks = scheduled ? 5 : 1;

  try {
    for (let i = 0; i < checks; i++) await singleRead();

    const result = {
      ok: true,
      checkedAt: new Date().toISOString(),
      kind: scheduled ? 'automatic' : 'manual',
      checks,
    };
    if (scheduled) {
      console.info('RPG database daily health: successful reads=' + checks + ' at ' + result.checkedAt);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(
      'RPG database check failed; mode=' + (scheduled ? 'cron' : 'manual') +
      ' error=' + (error instanceof Error ? error.message : 'unknown')
    );
    return res.status(503).json({ ok: false, error: 'Database health check failed' });
  }
}
