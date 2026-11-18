# Pruebas automatizadas de interfaz (18 de noviembre de 2026)

Se incluyó `tests/ui-smoke.mjs` y un trabajo `ui-smoke` en GitHub Actions, utilizando Chrome en Ubuntu 24.04.

## Resultados comprobados

- **Jugador:** carga la interfaz móvil, muestra las opciones de personaje y partida, no muestra gestión DM ni generador de IA y no solicita auditoría privada.
- **Dungeon Master:** carga el panel de administración, abre el catálogo de objetos, encuentra «Crear con IA» y abre/cierra el diálogo sin registrar un objeto; no solicita `read_private_audit`.
- **`adminInformatico`:** carga el panel informático, abre el catálogo y el diálogo de generación, y realiza la consulta privada `read_private_audit`.
- **Diseño móvil:** viewport de 390 × 844 px, sin desbordamiento horizontal del documento en los tres roles.
- **Cliente:** sin errores de JavaScript no capturados en los recorridos examinados.

El conjunto de pruebas de navegador **pasó en GitHub Actions** en el commit `748b015c728ab3be44a2bb1a9d944bb32f748c8d` (trabajo 134961946003). Los otros trabajos de esa ejecución (TypeScript/Vite, pruebas del servidor, presupuesto JavaScript y SQL de cuotas) también aprobaron.

## Aislamiento de seguridad

Los tres perfiles, los personajes, las respuestas REST y las llamadas RPC son **ficticios**. La aplicación se construye con `https://rpg-e2e.supabase.co`, una URL de prueba, y Playwright intercepta las solicitudes a ese origen. La interfaz de IA se habilita solo en el navegador de prueba; el servicio de generación permanece deshabilitado. No hay sesiones reales, claves privadas, escrituras en Supabase ni gastos de IA.

## Cobertura pendiente

Estas pruebas **no demuestran** que todos los formularios se guarden correctamente en Supabase real, que los permisos RLS funcionen en todas las rutas, ni que AI Gateway genere contenido. Antes de desplegar hace falta una vista previa funcional con base de pruebas, revisión final de cuotas (intentos versus generación exitosa) y aprobación del presupuesto de IA.
