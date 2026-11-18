// Comprobación de disponibilidad de Supabase sin escrituras ni claves privadas.
// Reconstruida a partir del comportamiento observable del despliegue de producción.
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const PUBLIC_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";

async function readServicePing() {
  if (!SUPABASE_URL || !PUBLIC_KEY) {
    throw new Error("Supabase environment variables missing");
  }

  const url = `${SUPABASE_URL}/rest/v1/service_ping?select=id,service_name&id=eq.1`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: PUBLIC_KEY,
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) throw new Error("Supabase status " + response.status);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0].id !== 1) {
    throw new Error("Service ping row unavailable");
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // El cron de Vercel realiza cinco lecturas; la consulta manual, una.
  // Todas son consultas de solo lectura a una tabla pública y específica.
  const cron = String(req.headers?.["user-agent"] || "").startsWith("vercel-cron/")
    || req.headers?.["x-vercel-cron"] === "1";
  const checks = cron ? 5 : 1;

  try {
    for (let i = 0; i < checks; i++) await readServicePing();
    return res.status(200).json({
      ok: true,
      checkedAt: new Date().toISOString(),
      kind: cron ? "scheduled" : "manual",
      checks,
    });
  } catch (error) {
    console.error("Database health check failed:", error instanceof Error ? error.message : "unknown error");
    return res.status(503).json({
      ok: false,
      checkedAt: new Date().toISOString(),
      error: "Database health check failed",
    });
  }
}
