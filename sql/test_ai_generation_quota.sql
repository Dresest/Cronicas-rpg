-- Simulación de Supabase aislada. No toca producción.
CREATE SCHEMA auth;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE TABLE public.profiles(id uuid PRIMARY KEY,role text NOT NULL);
INSERT INTO auth.users(id) VALUES
('11111111-1111-1111-1111-111111111111'),
('22222222-2222-2222-2222-222222222222'),
('33333333-3333-3333-3333-333333333333');
INSERT INTO public.profiles(id,role) VALUES
('11111111-1111-1111-1111-111111111111','dungeonMaster'),
('22222222-2222-2222-2222-222222222222','jugador'),
('33333333-3333-3333-3333-333333333333','adminInformatico');

-- Simular una instalación previa para demostrar que se cierra su ruta insegura.
CREATE FUNCTION public.reserve_ai_generation(p_kind text)
RETURNS jsonb LANGUAGE sql AS $ SELECT '{}'::jsonb $;
GRANT EXECUTE ON FUNCTION public.reserve_ai_generation(text) TO authenticated;

\i sql/ai_generation_quota.sql

DO $acl$
BEGIN
 IF to_regprocedure('public.reserve_ai_generation(text)') IS NOT NULL THEN
   RAISE EXCEPTION 'La función antigua no se eliminó'; END IF;
 IF has_function_privilege('anon','public.reserve_ai_generation(uuid,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.reserve_ai_generation(uuid,text)','EXECUTE')
 OR has_function_privilege('anon','public.settle_ai_generation(uuid,boolean)','EXECUTE')
 OR has_function_privilege('authenticated','public.settle_ai_generation(uuid,boolean)','EXECUTE')
 THEN RAISE EXCEPTION 'Anon o authenticated pueden manipular cuotas'; END IF;
 IF NOT has_function_privilege('service_role','public.reserve_ai_generation(uuid,text)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.settle_ai_generation(uuid,boolean)','EXECUTE')
 THEN RAISE EXCEPTION 'Service role sin permiso'; END IF;
 IF has_table_privilege('authenticated','private.ai_generation_usage','SELECT')
 OR has_table_privilege('authenticated','private.ai_generation_reservations','SELECT')
 THEN RAISE EXCEPTION 'Las tablas privadas no deberían ser visibles'; END IF;
END
$acl$;

SET ROLE service_role;
DO $test$
DECLARE
  uid uuid:='11111111-1111-1111-1111-111111111111';
  result jsonb;
  reservation uuid;
  item_reservation uuid;
  i integer;
BEGIN
 -- Reserva y fallo: devolución una sola vez.
 SELECT public.reserve_ai_generation(uid,'item') INTO result;
 IF result->>'allowed'<>'true' OR result->>'remaining'<>'4' THEN
   RAISE EXCEPTION 'Reserva no aprobada: %',result; END IF;
 reservation:=(result->>'reservation_id')::uuid;
 SELECT public.settle_ai_generation(reservation,false) INTO result;
 IF result->>'status'<>'released' THEN RAISE EXCEPTION 'No devuelve: %',result; END IF;
 SELECT public.settle_ai_generation(reservation,false) INTO result;
 IF result->>'already_settled'<>'true' THEN RAISE EXCEPTION 'Doble devolución: %',result; END IF;

 -- Uso válido: confirmación idempotente.
 SELECT public.reserve_ai_generation(uid,'item') INTO result;
 item_reservation:=(result->>'reservation_id')::uuid;
 SELECT public.settle_ai_generation(item_reservation,true) INTO result;
 IF result->>'status'<>'completed' THEN RAISE EXCEPTION 'No confirma: %',result; END IF;
 SELECT public.settle_ai_generation(item_reservation,false) INTO result;
 IF result->>'status'<>'completed' OR result->>'already_settled'<>'true' THEN
   RAISE EXCEPTION 'La confirmación se reembolsó indebidamente: %',result;
 END IF;

 -- 4 reservas adicionales: completa límite mensual de 5.
 FOR i IN 1..4 LOOP
   SELECT public.reserve_ai_generation(uid,'item') INTO result;
   IF result->>'allowed'<>'true' THEN RAISE EXCEPTION 'Reserva % rechazada: %',i,result; END IF;
 END LOOP;
 SELECT public.reserve_ai_generation(uid,'item') INTO result;
 IF result->>'reason'<>'CREDITS_EXHAUSTED' THEN
   RAISE EXCEPTION 'No se aplicó límite: %',result; END IF;
 SELECT public.reserve_ai_generation(uid,'skill') INTO result;
 IF result->>'allowed'<>'true' THEN RAISE EXCEPTION 'Cuota de habilidad independiente: %',result; END IF;
 SELECT public.reserve_ai_generation(uid,'unknown') INTO result;
 IF result->>'reason'<>'FORBIDDEN' THEN RAISE EXCEPTION 'Tipo inválido: %',result; END IF;
 SELECT public.reserve_ai_generation('22222222-2222-2222-2222-222222222222','item') INTO result;
 IF result->>'reason'<>'FORBIDDEN' THEN RAISE EXCEPTION 'Jugador obtuvo cuota: %',result; END IF;
 SELECT public.reserve_ai_generation('33333333-3333-3333-3333-333333333333','skill') INTO result;
 IF result->>'allowed'<>'true' THEN RAISE EXCEPTION 'Admin informático rechazado: %',result; END IF;

 -- El usuario no puede liquidar un identificador inexistente.
 SELECT public.settle_ai_generation('00000000-0000-0000-0000-000000000000',false) INTO result;
 IF result->>'reason'<>'NOT_FOUND' THEN RAISE EXCEPTION 'Liquidación inexistente: %',result; END IF;
END
$test$;
RESET ROLE;

DO $db_assert$
DECLARE n integer;
BEGIN
 SELECT used_count INTO n FROM private.ai_generation_usage
 WHERE user_id='11111111-1111-1111-1111-111111111111'
 AND kind='item';
 IF n<>5 THEN RAISE EXCEPTION 'Contador inesperado: % (esperado 5)',n; END IF;
 IF (SELECT count(*) FROM private.ai_generation_reservations
     WHERE status='released')<>1 THEN
   RAISE EXCEPTION 'Devoluciones duplicadas'; END IF;
END
$db_assert$;

-- Recuperación de reserva huérfana al transcurrir 5 minutos.
UPDATE private.ai_generation_reservations
 SET created_at=now()-interval '6 minutes'
 WHERE user_id='11111111-1111-1111-1111-111111111111'
 AND kind='item' AND status='reserved';
SET ROLE service_role;
DO $recover$
DECLARE result jsonb;
BEGIN
 SELECT public.reserve_ai_generation('11111111-1111-1111-1111-111111111111','item') INTO result;
 IF result->>'allowed'<>'true' THEN RAISE EXCEPTION 'No recuperó reserva vencida: %',result; END IF;
END
$recover$;
RESET ROLE;

DO $final$
DECLARE n integer;
BEGIN
 SELECT used_count INTO n FROM private.ai_generation_usage
 WHERE user_id='11111111-1111-1111-1111-111111111111' AND kind='item';
 IF n<>2 THEN RAISE EXCEPTION 'Contador después de recuperación: % (esperado 2)',n; END IF;
END
$final$;
SELECT 'Quota, refund, idempotency, authorization, and abandoned reservation recovery: PASS' AS result;
