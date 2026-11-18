# Recuperación de API — revisión del 18 de noviembre de 2026

## Avance
- `api/generate-rpg.js`, `api/generate-item.js`: **implementaciones nuevas en rama de desarrollo**, basadas en el contrato observado en el JS de producción, NO copias fieles del servidor anterior.
- `api/lib/generator-core.js`: autenticación mediante Supabase Auth; reserva obligatoria de cuota; llamadas al AI Gateway de Vercel (Qwen 3 32B), respuesta JSON de objeto o habilidad compatible con el cliente.
- `sql/ai_generation_quota.sql`: migración propuesta, **NO aplicada** en la base de datos. El límite de 5 intentos por tipo/mes/usuario es un valor provisional y se debe revisar.
- La función está **deshabilitada por defecto** (`AI_GENERATION_ENABLED` no establecido). Sin migración ni credenciales de gateway, responde 503 sin gastar créditos.
- Restricción provisional: roles DM y `adminInformatico`. Antes de publicar, confirmar que los jugadores no necesiten generar directamente.
- Se añade prueba sin red para autenticación, cuota, tipos, errores y contrato de respuesta.

## Rutas y configuración
- `/api/generate-rpg` recibe `POST {kind:'item'|'skill',prompt:string}` con token Bearer de Supabase.
- `/api/generate-item` queda como compatibilidad con clientes antiguos.
- `/api/database-health` funciona como monitor con cron diario 09:00 UTC.
- `vercel.json` excluye API y assets de la regla SPA.

## Condiciones que impiden despliegue todavía
1. **Autorización y créditos originales:** no se recuperó su lógica completa, solo la interfaz. Requiere validación de reglas con el usuario y presupuesto de AI Gateway.
2. **SQL de cuotas pendiente:** no se ha desplegado ni validado en una base de prueba.
3. **IA real:** ninguna solicitud al modelo se ha ejecutado. Son únicamente pruebas con respuestas simuladas.
4. **Frontend:** el respaldo React v1.3.4 carece de la interfaz de generación con IA añadida posteriormente, que aún debe reimplementarse/reconciliarse.
5. **Pruebas funcionales:** pendientes en vista previa de Vercel antes de cualquier publicación.

**No publicar sobre producción ni conectar Vercel automáticamente hasta resolver estos puntos.**

## Barrera de despliegue

La configuración `vercel.json` ejecuta `npm run build:production`, que exige `RPG_RELEASE_APPROVED=true` y todos los módulos de servidor. Sin esa autorización explícita el despliegue falla antes de publicarse, incluso si se vincula GitHub accidentalmente. La CI de desarrollo continúa compilando con `npm run build` para permitir pruebas sin habilitar producción.
