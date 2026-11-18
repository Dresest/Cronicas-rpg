-- Simulación aislada para PostgreSQL 16. Nunca ejecuta sobre la base Supabase real.
CREATE SCHEMA auth;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,role text NOT NULL);
INSERT INTO auth.users(id) VALUES
('11111111-1111-1111-1111-111111111111'),
('22222222-2222-2222-2222-222222222222'),
('33333333-3333-3333-3333-333333333333');
INSERT INTO public.profiles(id,role) VALUES
('11111111-1111-1111-1111-111111111111','dungeonMaster'),
('22222222-2222-2222-2222-222222222222','jugador'),
('33333333-3333-3333-3333-333333333333','adminInformatico');

\i sql/ai_generation_quota.sql

DO $test$
BEGIN
  IF has_function_privilege('anon','public.reserve_ai_generation(text)','EXECUTE') THEN
    RAISE EXCEPTION 'Anon no debe poder reservar créditos';
  END IF;
  IF NOT has_function_privilege('authenticated','public.reserve_ai_generation(text)','EXECUTE') THEN
    RAISE EXCEPTION 'El usuario autenticado debe poder invocar la función';
  END IF;
  IF has_table_privilege('authenticated','private.ai_generation_usage','SELECT') THEN
    RAISE EXCEPTION 'La tabla de cuotas no debe ser de lectura directa para usuarios';
  END IF;
END
$test$;

SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

DO $test$
DECLARE i integer; result jsonb;
BEGIN
 FOR i IN 1..5 LOOP
   SELECT public.reserve_ai_generation('item') INTO result;
   IF result->>'allowed' <> 'true' THEN
     RAISE EXCEPTION 'Solicitud válida % rechazada: %', i, result;
   END IF;
 END LOOP;
 SELECT public.reserve_ai_generation('item') INTO result;
 IF result->>'reason' <> 'CREDITS_EXHAUSTED' THEN
   RAISE EXCEPTION 'No se aplicó el límite de 5 intentos: %',result;
 END IF;
 SELECT public.reserve_ai_generation('skill') INTO result;
 IF result->>'allowed' <> 'true' THEN
   RAISE EXCEPTION 'No existe un saldo independiente para habilidades: %',result;
 END IF;
 SELECT public.reserve_ai_generation('anything') INTO result;
 IF result->>'allowed' <> 'false' THEN
   RAISE EXCEPTION 'Se permitió un tipo desconocido: %',result;
 END IF;
END
$test$;

SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
DO $test$
DECLARE result jsonb;
BEGIN
 SELECT public.reserve_ai_generation('item') INTO result;
 IF result->>'reason' <> 'FORBIDDEN' THEN
   RAISE EXCEPTION 'Jugador no autorizado recibió cuota: %',result;
 END IF;
END
$test$;

SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
DO $admin_test$
DECLARE result jsonb;
BEGIN
 SELECT public.reserve_ai_generation('skill') INTO result;
 IF result->>'allowed' <> 'true' THEN
   RAISE EXCEPTION 'Admin informático debería poder generar: %',result;
 END IF;
END
$admin_test$;

RESET ROLE;
DO $test$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM private.ai_generation_usage;
 IF n<>3 THEN
   RAISE EXCEPTION 'Se esperaban 3 registros de uso y hay %',n;
 END IF;
END
$test$;
SELECT 'IA quota migration verified in temporary PostgreSQL' AS result;
