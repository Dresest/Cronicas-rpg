# Diferencias pendientes con el despliegue vigente de Vercel

**Inspección:** 18-11-2026

## Código recuperado

Se recuperó el frontend **React + TypeScript + Vite v1.3.4** del respaldo del 26-10-2026. La rama de trabajo incluye los componentes `CharacterSheet.tsx`, `AdventureJournal.tsx` y `lib/damage.ts` además de los módulos de juego anteriores.

Se comprobó que los nombres de las **52 funciones RPC** utilizados por el código v1.3.4 siguen registrados en la base de datos Supabase. Esto no sustituye las pruebas de funcionamiento ni garantiza la compatibilidad de todas sus firmas y parámetros.

## Funciones existentes en producción no recuperadas

El despliegue de producción de Vercel `dpl_E66r4jYErG7JDWpJzFj5iQTm9dQW` contiene el código fuente de estas funciones de servidor:

| Archivo Vercel | Estado en este repositorio |
|---|---|
| `api/generate-item.js` | Pendiente de recuperar |
| `api/generate-rpg.js` | Pendiente de recuperar |
| `api/database-health.js` | Pendiente de recuperar |

El despliegue también incluye archivos JavaScript/CSS compilados cuyos fuentes React originales no están en la lista de archivos entregados a Vercel. La recuperación del frontend v1.3.4 no demuestra que esos archivos compilados sean idénticos a los generados por este repositorio.

## Regla de seguridad del despliegue

**No enlazar la rama `main` ni la rama de trabajo a despliegues automáticos sobre el proyecto de producción `cronicas-rpg` todavía.**

Antes de habilitarlos:
1. Recuperar el código de las tres funciones de servidor, **sin incluir claves secretas**.
2. Verificar la ruta de las funciones `/api/*` y la configuración del cron de Vercel; revisar que las reglas SPA no las intercepten.
3. Comparar la interfaz con producción y confirmar las funciones posteriores a v1.3.4.
4. Ejecutar pruebas de jugador, Dungeon Master y administrador informático; probar al menos recursos, inventario, habilidades, misiones, ficha, bitácora y generación con IA.
5. Ejecutar pruebas en un despliegue de **vista previa aislada**, sin modificar las URL de producción ni la base de datos real si las pruebas realizan escrituras.

## Cambios ya verificados

- El código v1.3.4 más las correcciones de estabilidad compila en GitHub Actions.
- Los archivos .env y claves privadas están excluidos del repositorio.
- No se hicieron cambios de frontend en Vercel ni modificaciones adicionales en Supabase durante esta etapa.
