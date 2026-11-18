# Mejoras de estabilidad — rama de reconciliación v1.3.4

1. Se reemplazó la base histórica v1.3.2 por el código fuente más completo **v1.3.4**.
2. El bloqueo inmediato del manejador de acciones previene dobles pulsaciones antes del render. La idempotencia del servidor debe implementarse aparte en operaciones sensibles si se busca protección frente a reintentos de red.
3. Las lecturas de ficha de personaje se invalidan por secuencia para evitar resultados obsoletos de Supabase.
4. El botón móvil «Más» deja de aparecer activo a la vez que «Panel», «Objetos» y «Solicitudes» del DM.
5. `.github/workflows/frontend.yml` ejecuta `npm run build` para verificar TypeScript y Vite.

**No fusionar ni desplegar a producción todavía.** Verificar cambios posteriores de Vercel y realizar pruebas funcionales con los tres roles.
