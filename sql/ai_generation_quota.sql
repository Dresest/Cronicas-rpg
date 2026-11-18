-- PROPUESTA PARA ENTORNO AISLADO. NO APLICAR AUTOMÁTICAMENTE A PRODUCCIÓN.
-- Las reservas descuentan capacidad temporal; solo se confirma al entregar contenido válido.
-- Reserva y liquidación son RPCs EXCLUSIVAS del servidor (service_role).
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.ai_generation_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('item','skill')),
  month_start date NOT NULL,
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  PRIMARY KEY (user_id,kind,month_start)
);

CREATE TABLE IF NOT EXISTS private.ai_generation_reservations (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('item','skill')),
  month_start date NOT NULL,
  status text NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved','completed','released')),
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);
CREATE INDEX IF NOT EXISTS ai_generation_reservations_pending_idx
  ON private.ai_generation_reservations(user_id,kind,month_start,created_at)
  WHERE status='reserved';

ALTER TABLE private.ai_generation_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.ai_generation_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.ai_generation_usage FROM PUBLIC, anon, authenticated;
REVOKE ALL ON private.ai_generation_reservations FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_ai_generation(p_user_id uuid,p_kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  month_bucket date := date_trunc('month',now() AT TIME ZONE 'UTC')::date;
  new_used integer;
  maximum integer := 5; -- Propuesta: pendiente de confirmar reglas finales.
  stale_count integer;
  new_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_kind IS NULL OR p_kind NOT IN ('item','skill') THEN
    RETURN jsonb_build_object('allowed',false,'reason','FORBIDDEN');
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.profiles AS p
    WHERE p.id=p_user_id AND p.role IN ('dungeonMaster','adminInformatico')
  ) THEN
    RETURN jsonb_build_object('allowed',false,'reason','FORBIDDEN');
  END IF;

  -- Si la función Vercel terminó abruptamente, recuperar reservas anteriores
  -- a 5 minutos. Las solicitudes de proveedor tienen timeout de 20 segundos.
  WITH stale AS (
    UPDATE private.ai_generation_reservations AS r
       SET status='released',settled_at=now()
     WHERE r.user_id=p_user_id AND r.kind=p_kind AND r.month_start=month_bucket
       AND r.status='reserved' AND r.created_at < now()-interval '5 minutes'
     RETURNING r.id
  )
  SELECT count(*)::integer INTO stale_count FROM stale;
  IF stale_count>0 THEN
    UPDATE private.ai_generation_usage
       SET used_count=greatest(used_count-stale_count,0)
     WHERE user_id=p_user_id AND kind=p_kind AND month_start=month_bucket;
  END IF;

  INSERT INTO private.ai_generation_usage(user_id,kind,month_start,used_count)
  VALUES(p_user_id,p_kind,month_bucket,1)
  ON CONFLICT(user_id,kind,month_start)
  DO UPDATE SET used_count=private.ai_generation_usage.used_count+1
    WHERE private.ai_generation_usage.used_count<maximum
  RETURNING used_count INTO new_used;

  IF new_used IS NULL THEN
    RETURN jsonb_build_object('allowed',false,'reason','CREDITS_EXHAUSTED');
  END IF;

  INSERT INTO private.ai_generation_reservations(user_id,kind,month_start)
  VALUES(p_user_id,p_kind,month_bucket)
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('allowed',true,'reservation_id',new_id,
                            'remaining',maximum-new_used);
END
$function$;

CREATE OR REPLACE FUNCTION public.settle_ai_generation(p_reservation_id uuid,p_success boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_reservation private.ai_generation_reservations%ROWTYPE;
  final_status text;
BEGIN
  IF p_reservation_id IS NULL OR p_success IS NULL THEN
    RETURN jsonb_build_object('ok',false,'reason','INVALID_ARGUMENTS');
  END IF;

  -- Bloqueo de la reserva: impide liquidar dos veces la misma solicitud.
  SELECT * INTO current_reservation
    FROM private.ai_generation_reservations
   WHERE id=p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'reason','NOT_FOUND');
  END IF;

  IF current_reservation.status<>'reserved' THEN
    RETURN jsonb_build_object('ok',true,'status',current_reservation.status,
                              'already_settled',true);
  END IF;

  final_status:=CASE WHEN p_success THEN 'completed' ELSE 'released' END;
  UPDATE private.ai_generation_reservations
     SET status=final_status,settled_at=now()
   WHERE id=p_reservation_id;

  IF NOT p_success THEN
    UPDATE private.ai_generation_usage
       SET used_count=greatest(used_count-1,0)
     WHERE user_id=current_reservation.user_id AND kind=current_reservation.kind
       AND month_start=current_reservation.month_start;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Missing usage counter for reservation';
    END IF;
  END IF;

  RETURN jsonb_build_object('ok',true,'status',final_status,'already_settled',false);
END
$function$;

-- El navegador NO puede reservar ni devolver créditos. Ni siquiera un DM.
REVOKE EXECUTE ON FUNCTION public.reserve_ai_generation(uuid,text)
  FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.settle_ai_generation(uuid,boolean)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_generation(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_ai_generation(uuid,boolean) TO service_role;
