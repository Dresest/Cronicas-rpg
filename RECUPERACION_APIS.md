# Recuperación de rutas de servidor — 18 de noviembre de 2026

## Monitor de Supabase recuperado funcionalmente

- `api/database-health.js` reconstruido a partir de la fuente parcial disponible en Vercel. Todas sus consultas son **GET** a `public.service_ping`; la prueba manual realiza una lectura y la invocación de Vercel Cron, cinco.
- La programación verificada en el despliegue de producción es **`0 9 * * *` (todos los días, 09:00 UTC)**.
- `vercel.json` evita que la regla SPA intercepte `/api/*` o `/assets/*`.
- Hay pruebas automáticas de rutas, petición manual, cron, método no permitido y errores de Supabase; pasan en GitHub Actions.
- Esto es una **reconstrucción funcional, no una copia byte a byte** de la fuente original.

## Contrato de IA verificado en el JavaScript público de producción

La interfaz publicada utiliza el siguiente contrato:

```js
fetch('/api/generate-rpg', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + session.access_token,
  },
  body: JSON.stringify({ kind, prompt }),
});
```

- `kind` toma los valores `item` o `skill`.
- Respuesta correcta: objeto JSON con la clave correspondiente, `{item: ...}` o `{skill: ...}`.
- La interfaz reconoce el código `CREDITS_EXHAUSTED` y el estado HTTP **402** para créditos agotados, y **429** para demasiadas solicitudes.
- El código cliente publicado comprueba que exista una sesión autenticada antes de llamar.
- El despliegue aún incluye `api/generate-item.js`, aunque no encontramos una llamada a esa ruta en los módulos JavaScript inspeccionados.
- La fuente parcial de `api/generate-rpg.js` muestra esquemas distintos para objetos y habilidades. La fuente parcial de `api/generate-item.js` indica el modelo `alibaba/qwen-3-32b`; todavía no puede afirmarse que la implementación vigente de `generate-rpg` utilice ese mismo modelo.

## Pendiente de recuperar sin riesgo de regresión

- **`api/generate-rpg.js` y `api/generate-item.js`:** Vercel solo devuelve fragmentos truncados de sus fuentes, por lo que su implementación completa y la autorización/cuotas internas no están verificadas.
- La fuente React v1.3.4 es anterior al JS compilado actualmente desplegado; la presencia de UI de IA en producción está confirmada, pero falta incorporar esa parte al código fuente editable.
- Realizar pruebas de vista previa (sin escrituras sobre personajes reales) antes de una publicación.

**No sustituir la web actual con este repositorio hasta recuperar e integrar la IA.** Los archivos faltantes constituyen una barrera de publicación.

## Seguridad

No se han enviado tokens de sesión ni claves privadas a GitHub. Las inspecciones del JavaScript público solo registraron campos de contrato y fragmentos con tokens redactados. Git no contiene los datos de los personajes.

El script `scripts/inspect-production.mjs` está disponible para revisiones manuales, pero ya no se ejecuta en cada push: evita consultas innecesarias a la web publicada.
