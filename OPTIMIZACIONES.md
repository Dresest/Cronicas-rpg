# Mejoras iniciales de estabilidad (rama de desarrollo)

**Base:** respaldo histórico v1.3.2. **No desplegar en producción** sin reconciliar los cambios posteriores de Vercel.

## Cambios
1. Se añade un bloqueo inmediato de acciones RPC en la interfaz para evitar duplicación por doble clic. Complementa, pero no sustituye, protecciones de transacción y de idempotencia del servidor.
2. Se descartan respuestas obsoletas de consultas de ficha cuando se cambia de personaje durante la carga.
3. Se corrige el estado seleccionado de la navegación móvil del DM: el botón «Más» ya no aparece activo a la vez que «Panel», «Objetos» o «Solicitudes».
4. Se añade verificación automatizada de TypeScript/Vite para esta rama y para propuestas contra `main`.

## Comprobaciones
- Transpilación de sintaxis TypeScript: realizada localmente.
- Build completo: pendiente de ejecutar en GitHub Actions; el entorno local no consiguió descargar las dependencias.
- Pruebas con cuentas autenticadas y regresión de funciones: pendientes.

## Próximas pruebas antes de un despliegue
- Repetir dos clics rápidos en gastar recurso y asignar recompensa: comprobar que se ejecuta una sola operación.
- Cambiar rápidamente entre personajes de un DM: confirmar que no se mezclan datos.
- Comprobar que la barra de navegación móvil solo resalta una opción.
- Confirmar roles `jugador`, `dungeonMaster`, `adminInformatico`, misiones, inventario, habilidades, registros privados y recursos.
- Recuperar cambios entre v1.3.2 y la implementación de producción posterior; la fuente publicada de Vercel solo incluye archivos compilados, no el proyecto React original.

## Seguridad
No subir archivos `.env` ni credenciales de servicio. Esta rama no modifica Supabase ni Vercel.
