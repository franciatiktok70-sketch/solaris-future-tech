-- 1. Plans metadata
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT '☀️';

-- 2. Profiles: split balances + own investment tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bonus_balance numeric NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS own_invested numeric NOT NULL DEFAULT 0;

-- 3. Global app settings (exchange rate)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id integer PRIMARY KEY DEFAULT 1,
  usd_to_bs numeric NOT NULL DEFAULT 1000,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = 1)
);
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read settings" ON public.app_settings;
CREATE POLICY "public read settings" ON public.app_settings FOR SELECT USING (true);
INSERT INTO public.app_settings (id, usd_to_bs) VALUES (1, 1000) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_set_rate(_rate numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF _rate <= 0 THEN RAISE EXCEPTION 'Tasa inválida'; END IF;
  UPDATE public.app_settings SET usd_to_bs = _rate, updated_at = now() WHERE id = 1;
END; $$;

-- 4. Business hours helper (8:00 - 20:00 America/Caracas)
CREATE OR REPLACE FUNCTION public.is_business_hours()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXTRACT(HOUR FROM (now() AT TIME ZONE 'America/Caracas'))::int >= 8
     AND EXTRACT(HOUR FROM (now() AT TIME ZONE 'America/Caracas'))::int < 20;
$$;

-- 5. New user: $5 bonus into bonus_balance, NO auto Debut plan
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  IF NEW.raw_user_meta_data ? 'invitation_code'
     AND NEW.raw_user_meta_data->>'invitation_code' <> '' THEN
    SELECT id INTO v_ref_id FROM public.profiles
     WHERE invitation_code = upper(NEW.raw_user_meta_data->>'invitation_code');
  END IF;

  INSERT INTO public.profiles (id, username, email, invitation_code, referred_by, balance, bonus_balance, own_invested, bonus_locked)
  VALUES (NEW.id, v_username, NEW.email, v_inv_code, v_ref_id, 5.00, 5.00, 0, true);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (NEW.id, 'bonus', 5.00, 'Bono de bienvenida Solaris Future Tech ($5.00 USD)');

  RETURN NEW;
END; $$;

-- 6. Purchase plan: bonus funds first, track own investment, block hidden plans
CREATE OR REPLACE FUNCTION public.purchase_plan(_plan_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_price numeric;
  v_hidden boolean;
  v_balance numeric;
  v_bonus numeric;
  v_from_bonus numeric;
  v_from_own numeric;
  v_inv_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT price, hidden INTO v_price, v_hidden FROM public.plans WHERE id = _plan_id;
  IF v_price IS NULL THEN RAISE EXCEPTION 'Plan no encontrado'; END IF;
  IF v_hidden THEN RAISE EXCEPTION 'Este plan ya no está disponible'; END IF;

  SELECT balance, bonus_balance INTO v_balance, v_bonus FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance < v_price THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;

  v_from_bonus := LEAST(v_bonus, v_price);
  v_from_own := v_price - v_from_bonus;

  UPDATE public.profiles
     SET balance = balance - v_price,
         bonus_balance = bonus_balance - v_from_bonus,
         own_invested = own_invested + v_from_own
   WHERE id = v_uid;

  INSERT INTO public.investments (user_id, plan_id) VALUES (v_uid, _plan_id) RETURNING id INTO v_inv_id;
  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (v_uid, 'purchase', -v_price, 'Activación de plan de inversión');
  RETURN json_build_object('investment_id', v_inv_id, 'own_invested', v_from_own);
END; $$;

-- 7. Withdrawals with currency rules, business hours, own-investment gate
CREATE OR REPLACE FUNCTION public.create_withdrawal(_amount numeric, _bank_account_id uuid, _pin text, _currency text DEFAULT 'usdt')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_bal numeric;
  v_bonus numeric;
  v_own numeric;
  v_pin_row record;
  v_id uuid;
  v_net numeric;
  v_fee numeric;
  v_rate numeric;
  v_min_usd numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT public.is_business_hours() THEN
    RAISE EXCEPTION 'Los retiros solo se procesan de 8:00 AM a 8:00 PM (hora de Venezuela)';
  END IF;

  SELECT usd_to_bs INTO v_rate FROM public.app_settings WHERE id = 1;
  v_rate := COALESCE(v_rate, 1000);

  IF lower(_currency) = 'bs' THEN
    v_min_usd := 2000.0 / v_rate;
    IF _amount < v_min_usd THEN
      RAISE EXCEPTION 'El monto mínimo de retiro en bolívares es de 2.000,00 Bs';
    END IF;
    v_fee := ROUND(_amount * 0.05, 2);
  ELSE
    IF _amount < 5 THEN RAISE EXCEPTION 'El monto mínimo de retiro es de $5.00 USD'; END IF;
    v_fee := 1.0;
  END IF;

  SELECT balance, bonus_balance, own_invested INTO v_bal, v_bonus, v_own
    FROM public.profiles WHERE id = v_uid FOR UPDATE;

  IF COALESCE(v_own,0) <= 10 THEN
    RAISE EXCEPTION 'Para habilitar los retiros, es necesario haber activado previamente un plan de inversión con fondos propios de al menos $10 USD. El bono de bienvenida no califica para esta validación';
  END IF;

  SELECT * INTO v_pin_row FROM public.withdrawal_pins
    WHERE user_id = v_uid AND pin = _pin AND used = false AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1;
  IF v_pin_row IS NULL THEN RAISE EXCEPTION 'PIN inválido o vencido'; END IF;

  IF (v_bal - COALESCE(v_bonus,0)) < _amount THEN
    RAISE EXCEPTION 'Saldo retirable insuficiente. El saldo de bono no es retirable';
  END IF;

  v_net := ROUND(_amount - v_fee, 2);
  UPDATE public.profiles SET balance = balance - _amount WHERE id = v_uid;
  UPDATE public.withdrawal_pins SET used = true WHERE id = v_pin_row.id;
  INSERT INTO public.withdrawal_requests (user_id, amount, net_amount, bank_account_id)
  VALUES (v_uid, _amount, v_net, _bank_account_id) RETURNING id INTO v_id;
  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (v_uid, 'withdraw', -_amount, 'Solicitud de retiro (neto $'||v_net||' USD, comisión $'||v_fee||')');
  RETURN v_id;
END; $$;

-- 8. Recharge business-hours guard
CREATE OR REPLACE FUNCTION public.recharge_hours_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_business_hours() THEN
    RAISE EXCEPTION 'Las recargas solo se procesan de 8:00 AM a 8:00 PM (hora de Venezuela)';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_recharge_hours ON public.recharge_requests;
CREATE TRIGGER trg_recharge_hours BEFORE INSERT ON public.recharge_requests
FOR EACH ROW EXECUTE FUNCTION public.recharge_hours_guard();

-- 9. Admin plan management
CREATE OR REPLACE FUNCTION public.admin_create_plan(
  _name text, _price numeric, _daily_profit_pct numeric,
  _cycle_days integer, _description text DEFAULT NULL, _icon text DEFAULT '☀️'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_order int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF COALESCE(trim(_name),'') = '' THEN RAISE EXCEPTION 'Nombre requerido'; END IF;
  IF _price <= 0 THEN RAISE EXCEPTION 'Costo inválido'; END IF;
  IF _daily_profit_pct <= 0 THEN RAISE EXCEPTION 'Porcentaje inválido'; END IF;
  IF _cycle_days <= 0 THEN RAISE EXCEPTION 'Duración inválida'; END IF;
  SELECT COALESCE(MAX(sort_order),0) + 1 INTO v_order FROM public.plans;
  INSERT INTO public.plans (name, price, daily_profit_pct, cycle_days, description, icon, sort_order, hidden)
  VALUES (trim(_name), _price, _daily_profit_pct, _cycle_days, NULLIF(trim(COALESCE(_description,'')),''), COALESCE(NULLIF(trim(_icon),''),'☀️'), v_order, false)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_plan_hidden(_plan_id uuid, _hidden boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE public.plans SET hidden = _hidden WHERE id = _plan_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_plan(_plan_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF EXISTS (SELECT 1 FROM public.investments WHERE plan_id = _plan_id) THEN
    UPDATE public.plans SET hidden = true WHERE id = _plan_id;
  ELSE
    DELETE FROM public.plans WHERE id = _plan_id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_plans()
RETURNS SETOF public.plans LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.plans WHERE public.has_role(auth.uid(),'admin') ORDER BY sort_order;
$$;

-- 10. Admin users list including new balance fields
DROP FUNCTION IF EXISTS public.admin_list_users();
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(id uuid, username text, email text, invitation_code text, balance numeric,
  bonus_balance numeric, own_invested numeric, total_recharged numeric, total_withdrawn numeric,
  referred_by uuid, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, username, email, invitation_code, balance, bonus_balance, own_invested,
         total_recharged, total_withdrawn, referred_by, created_at
  FROM public.profiles
  WHERE public.has_role(auth.uid(),'admin')
  ORDER BY created_at DESC
$$;