# Crónicas RPG — versión de código recuperada 1.3.4

Aplicación web responsiva para partidas RPG construida con React, TypeScript, Vite y Supabase.

**Estado:** esta rama recupera el código fuente histórico **v1.3.4 (26 de octubre de 2026)** y añade mejoras de estabilidad. El despliegue vigente de Vercel es posterior (octubre/noviembre), y su fuente React no está disponible en Vercel; todavía es necesario contrastar las diferencias que pudiera tener.

## Abrir en Visual Studio Code

1. Instalar Node.js 22 y ejecutar `npm install`.
2. Copiar `.env.example` a `.env` y completar la URL y la clave **publicable** de Supabase.
3. Ejecutar `npm run dev` para desarrollo.
4. Ejecutar `npm run build` antes de publicar.

## Seguridad

No subir `.env`, claves `service_role`, tokens, secretos ni datos personales. GitHub contiene únicamente código fuente, no un respaldo de la base de datos.

## Despliegue

**No conectar esta rama ni `main` al despliegue automático de producción** hasta conciliar el código histórico con la web actual y efectuar las pruebas de regresión de login, roles, recursos, habilidades, inventario, fichas de personajes, misiones, bitácora y DM.

Las correcciones de seguridad y RLS de Supabase fueron aplicadas por separado y no requieren desplegar este frontend.
