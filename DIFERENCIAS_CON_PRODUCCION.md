# Diferencias pendientes con el despliegue vigente de Vercel

**Inspección y actualización:** 18-11-2026

## Frontend

Fuente React + TypeScript + Vite v1.3.4 (26-10-2026), con las correcciones de estabilidad en la rama de trabajo. Vercel ejecuta un paquete compilado posterior al respaldo y sus diferencias exactas todavía no han sido conciliadas.

## Funciones de servidor

| Ruta de producción | Estado del código fuente |
|---|---|
| `api/database-health.js` | **Reimplementación equivalente preparada** usando la fuente parcial verificable de Vercel, con pruebas unitarias y sin escrituras |
| `api/generate-item.js` | Pendiente de recuperar/reconstruir el cuerpo íntegro; no se incorpora un reemplazo incompleto |
| `api/generate-rpg.js` | Pendiente de recuperar/reconstruir el cuerpo íntegro; no se incorpora un reemplazo incompleto |

La herramienta de inspección de Vercel devuelve fragmentos truncados del código de los generadores de IA. Su reconstrucción exacta sin las fuentes completas sería especulativa, por lo que se conservan funcionando exclusivamente en el despliegue actual.

## Corrección importante de Vercel

Se identificó que el respaldo antiguo contiene una regla SPA que podría redirigir solicitudes `/api/*` a `index.html`. Se corrigió excluyendo explícitamente `api/` y `assets/` de la reescritura y se restauró la definición del cron diario **`0 9 * * *` (UTC)** presente en la configuración del despliegue real. Se añadieron pruebas para comprobar las rutas.

## Condiciones de publicación

**NO fusionar el PR ni conectar la rama a producción todavía.** Antes hay que recuperar ambos generadores IA, validar la interfaz actual, ejecutar pruebas de los roles jugador/DM/adminInformatico y realizar una vista previa aislada de escrituras. La ejecución automatizada de tests no sustituye una prueba de despliegue en Vercel.

No se modificó la instancia real de Vercel ni la base de datos Supabase con este commit.
