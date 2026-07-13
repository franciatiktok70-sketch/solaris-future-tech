
-- =========================================================
-- SOLARIS FUTURE TECH — Iteración 1
-- Moneda base: USD. Tasa fija 1 USD = 750 Bs.
-- =========================================================

-- 1) Convertir saldos Bs → USD (÷750)
UPDATE public.profiles SET
  balance         = ROUND(balance / 750.0, 2),
  total_recharged = ROUND(total_recharged / 750.0, 2),
  total_withdrawn = ROUND(total_withdrawn / 750.0, 2);

UPDATE public.transactions SET amount = ROUND(amount / 750.0, 2);
UPDATE public.community_fund SET total = ROUND(total / 750.0, 2);
UPDATE public.gift_codes SET amount = ROUND(amount / 750.0, 2);
UPDATE public.recharge_requests SET amount = ROUND(amount / 750.0, 2) WHERE amount IS NOT NULL;
UPDATE public.withdrawal_requests SET
  amount     = ROUND(amount / 750.0, 2),
  net_amount = ROUND(net_amount / 750.0, 2);
UPDATE public.gift_code_claims SET amount = ROUND(amount / 750.0, 2);

-- 2) Ocultar planes viejos (no borramos porque investments los referencia)
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS wattage integer;
UPDATE public.plans SET hidden = true;
-- convertir precios legado a USD para consistencia visual si aparecen en historial
UPDATE public.plans SET price = ROUND(price / 750.0, 2);

-- 3) Insertar 10 planes solares (precio en USD, 5% diario, ciclo 30 días)
INSERT INTO public.plans (name, price, daily_profit_pct, cycle_days, sort_order, wattage, hidden, image_url) VALUES
  ('Panel Solar 20W',            10,  5, 30,  1,  20, false, null),
  ('Panel Solar 50W',            20,  5, 30,  2,  50, false, null),
  ('Panel Solar 100W',           30,  5, 30,  3, 100, false, null),
  ('Panel Solar 150W',           40,  5, 30,  4, 150, false, null),
  ('Panel Solar 200W',           50,  5, 30,  5, 200, false, null),
  ('Panel Solar 250W',           60,  5, 30,  6, 250, false, null),
  ('Panel Solar 300W',           70,  5, 30,  7, 300, false, null),
  ('Panel Solar 400W',           80,  5, 30,  8, 400, false, null),
  ('Panel Solar 500W',           90,  5, 30,  9, 500, false, null),
  ('Estación Solar Industrial', 100,  5, 30, 10, 1000, false, null);

-- 4) Retiros: mínimo $5, comisión fija $1 (en lugar del 15%)
CREATE OR REPLACE FUNCTION public.create_withdrawal(_amount numeric, _bank_account_id uuid, _pin text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_bal numeric;
  v_pin_row record;
  v_id uuid;
  v_net numeric;
  v_fee constant numeric := 1.0;
  v_min constant numeric := 5.0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF _amount < v_min THEN RAISE EXCEPTION 'El monto mínimo de retiro es de $5.00 USD'; END IF;
  SELECT * INTO v_pin_row FROM public.withdrawal_pins
    WHERE user_id = v_uid AND pin = _pin AND used = false AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1;
  IF v_pin_row IS NULL THEN RAISE EXCEPTION 'PIN inválido o vencido'; END IF;
  SELECT balance INTO v_bal FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_bal < _amount THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
  v_net := ROUND(_amount - v_fee, 2);
  UPDATE public.profiles SET balance = balance - _amount WHERE id = v_uid;
  UPDATE public.withdrawal_pins SET used = true WHERE id = v_pin_row.id;
  INSERT INTO public.withdrawal_requests (user_id, amount, net_amount, bank_account_id)
  VALUES (v_uid, _amount, v_net, _bank_account_id) RETURNING id INTO v_id;
  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (v_uid, 'withdraw', -_amount, 'Solicitud de retiro (neto $'||v_net||' USD, comisión $1.00)');
  RETURN v_id;
END; $function$;

-- 5) Comisiones referidos: 10 / 5 / 3 / 2 / 1
CREATE OR REPLACE FUNCTION public.admin_approve_recharge(_req_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_req record;
  v_current uuid;
  v_pcts numeric[] := ARRAY[10,5,3,2,1];
  v_lvl int := 1;
  v_comm numeric;
  v_parent uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO v_req FROM public.recharge_requests WHERE id = _req_id FOR UPDATE;
  IF v_req IS NULL OR v_req.status <> 'pending' THEN RAISE EXCEPTION 'Solicitud inválida'; END IF;
  UPDATE public.recharge_requests SET status='approved', processed_at=now() WHERE id = _req_id;
  UPDATE public.profiles
    SET balance = balance + v_req.amount,
        total_recharged = total_recharged + v_req.amount
    WHERE id = v_req.user_id;
  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (v_req.user_id, 'recharge', v_req.amount, 'Recarga aprobada');

  SELECT referred_by INTO v_parent FROM public.profiles WHERE id = v_req.user_id;
  v_current := v_parent;
  WHILE v_current IS NOT NULL AND v_lvl <= 5 LOOP
    v_comm := ROUND(v_req.amount * v_pcts[v_lvl] / 100.0, 2);
    UPDATE public.profiles SET balance = balance + v_comm WHERE id = v_current;
    INSERT INTO public.transactions (user_id, kind, amount, description)
    VALUES (v_current, 'commission', v_comm, 'Comisión nivel '||v_lvl);
    SELECT referred_by INTO v_parent FROM public.profiles WHERE id = v_current;
    v_current := v_parent;
    v_lvl := v_lvl + 1;
  END LOOP;
  UPDATE public.community_fund SET total = total + v_req.amount, updated_at=now() WHERE id=1;
END; $function$;

-- 6) Bono de registro $1 USD
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inv_code text;
  v_ref_id uuid;
  v_username text;
BEGIN
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1));
  LOOP
    v_inv_code := upper(substr(md5(random()::text || NEW.id::text),1,8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE invitation_code = v_inv_code);
  END LOOP;
  IF NEW.raw_user_meta_data ? 'invitation_code' AND NEW.raw_user_meta_data->>'invitation_code' <> '' THEN
    SELECT id INTO v_ref_id FROM public.profiles WHERE invitation_code = upper(NEW.raw_user_meta_data->>'invitation_code');
  END IF;
  INSERT INTO public.profiles (id, username, email, invitation_code, referred_by, balance)
  VALUES (NEW.id, v_username, NEW.email, v_inv_code, v_ref_id, 1.00);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (NEW.id, 'bonus', 1.00, 'Bono de registro Solaris Future Tech ($1.00 USD)');
  RETURN NEW;
END; $function$;

-- 7) Withdrawal PIN: extender vida a 10 minutos (no cambia esquema)
