# Diferencias pendientes con el despliegue vigente de Vercel

**Inspección y actualización:** 18-11-2026

## Frontend

Fuente React + TypeScript + Vite v1.3.4 (26-10-2026), con las correcciones de estabilidad en la rama de trabajo. Vercel ejecuta un paquete compilado posterior al respaldo y sus diferencias exactas todavía no han sido conciliadas.

## Funciones de servidor reimplementadas en la rama de desarrollo

| Ruta de producción | Estado en esta rama |
|---|---|
| `api/database-health.js` | Reconstrucción funcional probada con datos simulados |
| `api/generate-rpg.js` | Implementación nueva con Supabase Auth, cuotas obligatorias y generación JSON |
| `api/generate-item.js` | Alias de compatibilidad con el generador de objetos |

Los endpoints **no son copias exactas** del código de Vercel, ya que la herramienta de inspección entrega su fuente original truncada. Las cuotas originales y otras reglas de créditos no están completamente verificadas.

## Interfaz React con IA

La rama recupera botones «Crear con IA» en catálogo de objetos y habilidades del DM. Los resultados abren el editor habitual como borrador y el guardado requiere confirmación manual. La aplicación publicada usa el mismo contrato `POST /api/generate-rpg`, pero no se han realizado pruebas integradas de esta reconstrucción.

## Requisitos de publicación no cumplidos todavía

1. Validar el límite propuesto de 5 solicitudes por tipo y mes, y los roles autorizados.
2. Probar `sql/ai_generation_quota.sql` en una base aislada antes de aplicarlo a Supabase.
3. Configurar presupuesto de AI Gateway y probar una solicitud real controlada con el modelo.
4. Probar la interfaz con perfiles jugador, dungeonMaster y adminInformatico.
5. Comparar los flujos actuales de producción que pudieran faltar en el código React recuperado.
6. Publicar una vista previa aislada y probar sin alterar personajes ni recursos reales.

**La configuración de Vercel ejecutará `npm run build:production`**. Ese comando exige la variable `RPG_RELEASE_APPROVED=true`, ausente por defecto, para impedir despliegues inadvertidos desde este código incompleto.

No se ha modificado la instancia de producción de Vercel ni la base de datos Supabase.
