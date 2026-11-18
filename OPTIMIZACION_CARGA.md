# Optimización de carga inicial

Fecha: 18-11-2026. Rama de desarrollo, **sin cambios en producción**.

Se cambiaron cuatro importaciones estáticas por carga diferida (`React.lazy`), reutilizando el `Suspense` que ya existe en `App.tsx`:

- `PlayView` (modo partida)
- `CharacterSheet` (ficha)
- `MoreView` (más opciones)
- `DMBulkRewards` (recompensas grupales del DM)

Mediciones reproducidas en Vercel Sandbox con Node 22, Vite 7.3.7 y `npm run build`:

| Indicador | Antes | Después | Mejora |
|---|---:|---:|---:|
| JavaScript principal, sin compresión | 504.706 bytes | 469.327 bytes | −35.379 bytes (−7,0 %) |

También se incorporó `scripts/check-bundle-budget.mjs` con un límite de 485.000 bytes para detectar regresiones en GitHub Actions. Los demás módulos continúan disponibles mediante carga diferida.

Esta reducción es del archivo principal, **no representa una medición de velocidad real en celulares**; para confirmar mejoras de carga se requiere una prueba de navegación en condiciones reales.
