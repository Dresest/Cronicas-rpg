# Generación con IA: créditos protegidos contra fallos

**Estado:** implementación de prueba (18-11-2026). No aplicada a Supabase ni Vercel de producción.

## Protocolo de crédito
1. El usuario inicia sesión y solicita una generación.
2. Vercel verifica el JWT de Supabase; solo después usa su credencial **privada de servicio** para reservar un crédito en `public.reserve_ai_generation(p_user_id,p_kind)`.
3. La función SQL verifica que el perfil sea DM o `adminInformatico`, limita a 5 reservas por tipo y mes (cuota aún provisional), y devuelve un identificador único de reserva.
4. Se llama a AI Gateway. Si retorna un objeto o habilidad válido, Vercel invoca `settle_ai_generation(reservation_id,true)` y **confirma el crédito** antes de entregar el resultado.
5. Si la IA devuelve error HTTP (402/429/502), JSON inválido o falla la conexión, Vercel invoca `settle_ai_generation(reservation_id,false)`: **libera el crédito**. Las llamadas de liquidación son idempotentes: no se devuelve dos veces el mismo crédito.
6. Si el servidor muere antes de finalizar, las reservas pendientes de más de **5 minutos** se recuperan automáticamente la próxima vez que ese usuario reserve contenido del mismo tipo y período. No se requieren tareas recurrentes.
7. Si falla la operación de devolución, se responde que la regularización está pendiente, **sin afirmar falsamente que el crédito ya fue reembolsado**.

## Autorización y confidencialidad
- El navegador **no tiene** permiso `EXECUTE` para reservar o liquidar créditos.
- Ambas funciones están en `public` solo para recibir solicitudes REST de servidor, con `SECURITY DEFINER`, `search_path=''`, y `EXECUTE` concedido únicamente a `service_role`.
- Las tablas `private.ai_generation_usage` y `private.ai_generation_reservations` tienen RLS habilitada; no se conceden privilegios de lectura/escritura al navegador.
- La variable `SUPABASE_SERVICE_ROLE_KEY` **no** debe existir con prefijo `VITE_` y solo debe configurarse en Vercel como secreto.
- Los costos reales del proveedor pueden existir aunque el crédito de juego se devuelva, porque son contabilidades distintas.

## Pruebas
- Tests Node con fetch simulado: sesión válida/inválida, reserva, generación, confirmación, error de Gateway, devolución y confirmaciones repetidas.
- Tests SQL en PostgreSQL 16 aislado: límite, liberación idempotente, reserva huérfana, separación por tipo, permisos DM/admin, rechazo de jugadores y anonimato.
- Compilación y pruebas de los tres roles mediante Chrome/Playwright, con datos ficticios.

## Límites
**NO DESPLEGAR TODAVÍA.** La cuota de 5 por tipo/mes y los permisos deben confirmarse con las reglas de juego; falta presupuestar Gateway, definir la clave de servidor y verificar una vista previa real contra una base de pruebas. No se efectuaron llamadas reales a IA ni cambios a la base de producción.
