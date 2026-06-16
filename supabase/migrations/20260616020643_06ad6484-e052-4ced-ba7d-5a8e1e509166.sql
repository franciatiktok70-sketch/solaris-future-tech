
-- 1) Update financial parameters on plans
UPDATE public.plans SET daily_profit_pct = 7, cycle_days = 30;
ALTER TABLE public.plans ALTER COLUMN daily_profit_pct SET DEFAULT 7;
ALTER TABLE public.plans ALTER COLUMN cycle_days SET DEFAULT 30;

-- 2) Lower minimum withdrawal to 600
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
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF _amount < 600 THEN RAISE EXCEPTION 'El monto mínimo de retiro es de 600 Bs.'; END IF;
  SELECT * INTO v_pin_row FROM public.withdrawal_pins
    WHERE user_id = v_uid AND pin = _pin AND used = false AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1;
  IF v_pin_row IS NULL THEN RAISE EXCEPTION 'PIN inválido o vencido'; END IF;
  SELECT balance INTO v_bal FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_bal < _amount THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
  v_net := round(_amount * 0.85, 2);
  UPDATE public.profiles SET balance = balance - _amount WHERE id = v_uid;
  UPDATE public.withdrawal_pins SET used = true WHERE id = v_pin_row.id;
  INSERT INTO public.withdrawal_requests (user_id, amount, net_amount, bank_account_id)
  VALUES (v_uid, _amount, v_net, _bank_account_id) RETURNING id INTO v_id;
  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (v_uid, 'withdraw', -_amount, 'Solicitud de retiro (neto '||v_net||' Bs, comisión 15%)');
  RETURN v_id;
END; $function$;

-- 3) Admin: list investments with plan and user info
CREATE OR REPLACE FUNCTION public.admin_list_investments()
 RETURNS TABLE(
   id uuid, user_id uuid, username text, email text,
   plan_id uuid, plan_name text, plan_price numeric,
   purchased_at timestamptz, cycle_days int, payouts_made int,
   days_remaining int, active boolean
 )
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT i.id, i.user_id, p.username, p.email,
         i.plan_id, pl.name, pl.price,
         i.purchased_at, pl.cycle_days, i.payouts_made,
         GREATEST(0, pl.cycle_days - FLOOR(EXTRACT(EPOCH FROM (now() - i.purchased_at))/86400)::int) AS days_remaining,
         i.active
  FROM public.investments i
  JOIN public.plans pl ON pl.id = i.plan_id
  JOIN public.profiles p ON p.id = i.user_id
  WHERE public.has_role(auth.uid(),'admin')
  ORDER BY i.purchased_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_force_expire_investment(_inv_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE public.investments SET active = false WHERE id = _inv_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_activate_investment(_inv_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE public.investments
    SET active = true,
        purchased_at = now(),
        last_payout_at = now(),
        payouts_made = 0
    WHERE id = _inv_id;
END; $$;

-- 4) Gift codes
CREATE TABLE public.gift_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  amount numeric(14,2) NOT NULL,
  claim_limit int NOT NULL,
  claims_count int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gift_codes TO authenticated;
GRANT ALL ON public.gift_codes TO service_role;
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage gift_codes" ON public.gift_codes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "auth read gift_codes" ON public.gift_codes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.gift_code_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.gift_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);
GRANT SELECT ON public.gift_code_claims TO authenticated;
GRANT ALL ON public.gift_code_claims TO service_role;
ALTER TABLE public.gift_code_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own claims read" ON public.gift_code_claims
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Admin: create gift code
CREATE OR REPLACE FUNCTION public.admin_create_gift_code(_code text, _amount numeric, _claim_limit int)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_id uuid; v_code text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Monto inválido'; END IF;
  IF _claim_limit <= 0 THEN RAISE EXCEPTION 'Límite inválido'; END IF;
  v_code := COALESCE(NULLIF(trim(_code),''), upper(substr(md5(random()::text || clock_timestamp()::text),1,10)));
  INSERT INTO public.gift_codes (code, amount, claim_limit, created_by)
  VALUES (upper(v_code), _amount, _claim_limit, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_update_gift_code_limit(_code_id uuid, _new_limit int)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF _new_limit <= 0 THEN RAISE EXCEPTION 'Límite inválido'; END IF;
  UPDATE public.gift_codes
    SET claim_limit = _new_limit,
        active = CASE WHEN claims_count >= _new_limit THEN false ELSE true END
    WHERE id = _code_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_toggle_gift_code(_code_id uuid, _active boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE public.gift_codes SET active = _active WHERE id = _code_id;
END; $$;

-- User: claim a gift code
CREATE OR REPLACE FUNCTION public.claim_gift_code(_code text)
 RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid(); v_row record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO v_row FROM public.gift_codes WHERE code = upper(trim(_code)) FOR UPDATE;
  IF v_row IS NULL THEN RAISE EXCEPTION 'Código inválido'; END IF;
  IF NOT v_row.active THEN RAISE EXCEPTION 'Código desactivado'; END IF;
  IF v_row.claims_count >= v_row.claim_limit THEN
    UPDATE public.gift_codes SET active = false WHERE id = v_row.id;
    RAISE EXCEPTION 'Este código ha alcanzado el límite máximo de usos';
  END IF;
  IF EXISTS (SELECT 1 FROM public.gift_code_claims WHERE code_id = v_row.id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'Ya canjeaste este código';
  END IF;
  INSERT INTO public.gift_code_claims (code_id, user_id, amount) VALUES (v_row.id, v_uid, v_row.amount);
  UPDATE public.gift_codes
    SET claims_count = claims_count + 1,
        active = CASE WHEN claims_count + 1 >= claim_limit THEN false ELSE true END
    WHERE id = v_row.id;
  UPDATE public.profiles SET balance = balance + v_row.amount WHERE id = v_uid;
  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (v_uid, 'gift_code', v_row.amount, 'Código de canje: '||v_row.code);
  RETURN v_row.amount;
END; $$;
