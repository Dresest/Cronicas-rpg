-- PROPUESTA, NO APLICADA A PRODUCCIÓN.
-- Requiere revisión de las reglas de créditos existentes antes de ejecutar.
-- Rechaza a anónimos y no acepta límites manipulables desde el cliente.
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.ai_generation_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('item','skill')),
  month_start date NOT NULL,
  used_count integer NOT NULL DEFAULT 0 CHECK(used_count >= 0),
  PRIMARY KEY (user_id, kind, month_start)
);
ALTER TABLE private.ai_generation_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.ai_generation_usage FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_ai_generation(p_kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $function$
DECLARE
  uid uuid := auth.uid();
  month_bucket date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  new_used integer;
  maximum integer := 5; -- Cuota inicial propuesta: revisar antes de activar producción.
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'FORBIDDEN');
  END IF;
  IF p_kind NOT IN ('item','skill') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'FORBIDDEN');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid AND p.role IN ('dungeonMaster','adminInformatico')
  ) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'FORBIDDEN');
  END IF;
  INSERT INTO private.ai_generation_usage(user_id,kind,month_start,used_count)
  VALUES (uid,p_kind,month_bucket,1)
  ON CONFLICT (user_id,kind,month_start)
  DO UPDATE SET used_count = private.ai_generation_usage.used_count + 1
  WHERE private.ai_generation_usage.used_count < maximum
  RETURNING used_count INTO new_used;
  IF new_used IS NULL THEN
    RETURN jsonb_build_object('allowed',false,'reason','CREDITS_EXHAUSTED');
  END IF;
  RETURN jsonb_build_object('allowed',true,'remaining',maximum-new_used);
END
$function$;
REVOKE EXECUTE ON FUNCTION public.reserve_ai_generation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_ai_generation(text) TO authenticated;
