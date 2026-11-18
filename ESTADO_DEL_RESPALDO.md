# Estado de recuperación (18 de noviembre de 2026)

- **Código fuente recuperado:** v1.3.4 del 26-10-2026, incluye la ficha de personaje, bitácora de aventuras, imágenes y cálculos de daño.
- **Verificación de backend:** se contrastaron 52 nombres de funciones RPC del frontend contra Supabase; los 52 están presentes.
- **Mejoras adicionales:** bloqueo inmediato contra doble activación, descarte de datos desactualizados al cambiar de personaje, selección visual correcta del menú móvil del DM.
- **Diferencia restante:** Vercel sirve un despliegue posterior generado desde archivos JS compilados. Se debe contrastar la interfaz y cualquier ajuste posterior antes de sustituir producción.
- **Pruebas:** compilar frontend y comprobar flujo de jugador, DM y administrador informático con credenciales de prueba.
- **GitHub público:** no hay credenciales privadas incluidas. Se conservan .env.example y .gitignore.
- **Producción:** Vercel y Supabase no reciben cambios de este commit.
