# Crónicas RPG — código fuente histórico (v1.3.2)

Sitio web RPG responsivo desarrollado con **React, TypeScript, Vite y Supabase**.

> **Aviso importante:** este repositorio comienza con un respaldo recuperado de la versión **1.3.2 (25 de octubre de 2026)**. La página actualmente publicada en Vercel es posterior. **No conectar esta rama a producción ni desplegarla encima de la versión vigente** hasta reconciliar los cambios y probar la aplicación.

## Uso local
1. Instalar Node.js 22 o superior.
2. Ejecutar `npm install`.
3. Crear `.env` a partir de `.env.example` y configurar la URL y **clave publicable** de Supabase.
4. Ejecutar `npm run dev`.
5. Antes de publicar: `npm run typecheck` y `npm run build`.

## Seguridad
El repositorio es público. Nunca agregar `.env`, claves `service_role`, tokens, secretos ni datos personales de jugadores.
Git conserva **código fuente**, no constituye respaldo de la base de datos Supabase.

## Próximos pasos
- Comparar el frontend recuperado con la versión posterior publicada en Vercel.
- Verificar las funciones existentes y los permisos de jugador, DM y administrador informático.
- Optimizar navegación móvil, panel del DM y consultas.
- Conectar despliegue automatizado **solo después** de recuperar y verificar el estado de producción.
