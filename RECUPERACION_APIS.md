# Recuperación de rutas de servidor — 18 de noviembre de 2026

## Recuperado de forma funcional (reconstrucción, no copia idéntica)

- `api/database-health.js`: comprueba `public.service_ping` mediante la clave publicable de Supabase, con peticiones de solo lectura, un tiempo de espera y respuesta JSON sin credenciales. La consulta manual realiza una lectura y la invocación de Vercel Cron, cinco.
- `vercel.json`: conserva la tarea programada de producción `0 9 * * *` (todos los días a las 09:00 UTC) y evita que el fallback SPA intercepte las rutas `/api/*` o `/assets/*`.
- `tests/database-health.test.mjs`: ejecuta pruebas de método HTTP, estado correcto, fallo del servicio y cinco lecturas programadas sin contactar Supabase real.

## Pendiente

Las funciones de IA `api/generate-item.js` y `api/generate-rpg.js` siguen sin recuperarse íntegramente. El sistema de Vercel expone sus nombres y una vista limitada de su fuente, pero el contenido se trunca. **No crear sustitutos ficticios ni desplegar esta rama sobre producción**, porque se perderían estas funciones.

La reconstrucción actual no ha sido probada en una vista previa de Vercel, solo en GitHub Actions.

## Seguridad

Esta reconstrucción no incluye claves privadas; la variable `VITE_SUPABASE_ANON_KEY` es una clave pública. Git no conserva datos de personajes.
