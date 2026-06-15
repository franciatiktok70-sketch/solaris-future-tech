
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS net_amount numeric(14,2);
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'Ahorros';

CREATE OR REPLACE FUNCTION public.create_withdrawal(_amount numeric, _bank_account_id uuid, _pin text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_bal numeric;
  v_pin_row record;
  v_id uuid;
  v_net numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF _amount < 1000 THEN RAISE EXCEPTION 'El monto mínimo de retiro es de 1000 Bs.'; END IF;
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
END; $$;

CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_user_id uuid, _delta numeric, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE public.profiles SET balance = balance + _delta WHERE id = _user_id;
  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (_user_id, 'admin_adjust', _delta, COALESCE(NULLIF(_note,''), 'Ajuste manual del administrador'));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_user_transactions(_user_id uuid)
RETURNS SETOF public.transactions LANGUAGE sql STABLE SECURITY DEFINER SET search_path='public' AS $$
  SELECT * FROM public.transactions
   WHERE user_id = _user_id AND public.has_role(auth.uid(),'admin')
   ORDER BY created_at DESC
   LIMIT 200;
$$;
