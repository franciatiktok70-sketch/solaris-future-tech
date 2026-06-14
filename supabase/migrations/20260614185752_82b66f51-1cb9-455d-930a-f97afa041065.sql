
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  email text NOT NULL,
  invitation_code text NOT NULL UNIQUE,
  referred_by uuid REFERENCES public.profiles(id),
  balance numeric(14,2) NOT NULL DEFAULT 0,
  total_recharged numeric(14,2) NOT NULL DEFAULT 0,
  total_withdrawn numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "read referrals" ON public.profiles FOR SELECT TO authenticated USING (referred_by = auth.uid());
CREATE POLICY "admin read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Handle new user: create profile, assign default role, link referral
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv_code text;
  v_ref_id uuid;
  v_username text;
BEGIN
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1));
  -- Generate unique invitation code
  LOOP
    v_inv_code := upper(substr(md5(random()::text || NEW.id::text),1,8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE invitation_code = v_inv_code);
  END LOOP;
  -- Look up referrer by code if provided
  IF NEW.raw_user_meta_data ? 'invitation_code' AND NEW.raw_user_meta_data->>'invitation_code' <> '' THEN
    SELECT id INTO v_ref_id FROM public.profiles WHERE invitation_code = upper(NEW.raw_user_meta_data->>'invitation_code');
  END IF;
  INSERT INTO public.profiles (id, username, email, invitation_code, referred_by)
  VALUES (NEW.id, v_username, NEW.email, v_inv_code, v_ref_id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ PLANS ============
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(14,2) NOT NULL,
  daily_profit_pct numeric(5,2) NOT NULL DEFAULT 10,
  cycle_days int NOT NULL DEFAULT 50,
  image_url text,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.plans TO authenticated, anon;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans public read" ON public.plans FOR SELECT USING (true);

INSERT INTO public.plans (name, price, sort_order, image_url) VALUES
('iPhone 2G', 5000, 1, 'https://images.unsplash.com/photo-1592286927505-1def25115558?w=400'),
('iPhone 3G', 10000, 2, 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400'),
('iPhone 3GS', 15000, 3, 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400'),
('iPhone 4', 20000, 4, 'https://images.unsplash.com/photo-1574755393849-623942496936?w=400'),
('iPhone 4S', 25000, 5, 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=400'),
('iPhone 5', 30000, 6, 'https://images.unsplash.com/photo-1521651201144-634f700b36ef?w=400'),
('iPhone 5S', 35000, 7, 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=400'),
('iPhone 6', 40000, 8, 'https://images.unsplash.com/photo-1512054502232-10a0a035d672?w=400'),
('iPhone 6S', 45000, 9, 'https://images.unsplash.com/photo-1529778873920-4da4926a72c2?w=400'),
('iPhone 7', 50000, 10, 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=400'),
('iPhone 8', 55000, 11, 'https://images.unsplash.com/photo-1556782521-c8d3edfbb9e7?w=400'),
('iPhone X', 60000, 12, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400'),
('iPhone 11', 65000, 13, 'https://images.unsplash.com/photo-1592890288564-76628a30a657?w=400'),
('iPhone 12', 70000, 14, 'https://images.unsplash.com/photo-1603891128711-11b4b03bb138?w=400'),
('iPhone 13', 75000, 15, 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=400'),
('iPhone 14', 80000, 16, 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400'),
('iPhone 15', 85000, 17, 'https://images.unsplash.com/photo-1696446702183-be9605d12353?w=400'),
('iPhone 16', 90000, 18, 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400'),
('iPhone 17', 95000, 19, 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=400');

-- ============ INVESTMENTS ============
CREATE TABLE public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  last_payout_at timestamptz NOT NULL DEFAULT now(),
  payouts_made int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT, INSERT ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own investments read" ON public.investments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin investments read" ON public.investments FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ TRANSACTIONS ============
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL, -- recharge, withdraw, daily_profit, commission, purchase
  amount numeric(14,2) NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx read" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin tx read" ON public.transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ RECHARGE REQUESTS ============
CREATE TABLE public.recharge_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  receipt_url text,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
GRANT SELECT, INSERT ON public.recharge_requests TO authenticated;
GRANT ALL ON public.recharge_requests TO service_role;
ALTER TABLE public.recharge_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recharges read" ON public.recharge_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own recharges insert" ON public.recharge_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin recharges read" ON public.recharge_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin recharges update" ON public.recharge_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ BANK ACCOUNTS ============
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank text NOT NULL,
  holder_name text NOT NULL,
  cedula text NOT NULL,
  account_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bank" ON public.bank_accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ WITHDRAWAL REQUESTS ============
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
GRANT SELECT, INSERT ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own withdrawals" ON public.withdrawal_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own withdrawals insert" ON public.withdrawal_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin withdrawals" ON public.withdrawal_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ WITHDRAWAL PINS ============
CREATE TABLE public.withdrawal_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pin text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.withdrawal_pins TO authenticated;
GRANT ALL ON public.withdrawal_pins TO service_role;
ALTER TABLE public.withdrawal_pins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pins" ON public.withdrawal_pins FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ COMMUNITY FUND ============
CREATE TABLE public.community_fund (
  id int PRIMARY KEY DEFAULT 1,
  total numeric(18,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
GRANT SELECT ON public.community_fund TO authenticated, anon;
GRANT ALL ON public.community_fund TO service_role;
ALTER TABLE public.community_fund ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read fund" ON public.community_fund FOR SELECT USING (true);
INSERT INTO public.community_fund (id, total) VALUES (1, 1500000) ON CONFLICT DO NOTHING;

-- ============ STORAGE POLICIES (receipts) ============
CREATE POLICY "users upload own receipts" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users read own receipts" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'receipts' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));

-- ============ DAILY PAYOUT FUNCTION (idempotent per 24h) ============
CREATE OR REPLACE FUNCTION public.process_due_payouts(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  v_due int;
  v_profit numeric;
BEGIN
  FOR r IN
    SELECT i.id, i.plan_id, i.last_payout_at, i.payouts_made, p.price, p.daily_profit_pct, p.cycle_days
    FROM public.investments i JOIN public.plans p ON p.id = i.plan_id
    WHERE i.user_id = _user_id AND i.active = true
  LOOP
    v_due := LEAST(
      FLOOR(EXTRACT(EPOCH FROM (now() - r.last_payout_at)) / 86400)::int,
      r.cycle_days - r.payouts_made
    );
    IF v_due > 0 THEN
      v_profit := r.price * (r.daily_profit_pct / 100.0) * v_due;
      UPDATE public.profiles SET balance = balance + v_profit WHERE id = _user_id;
      INSERT INTO public.transactions (user_id, kind, amount, description)
      VALUES (_user_id, 'daily_profit', v_profit, 'Ganancia diaria ('||v_due||' día(s))');
      UPDATE public.investments
        SET last_payout_at = last_payout_at + (v_due || ' days')::interval,
            payouts_made = payouts_made + v_due,
            active = CASE WHEN payouts_made + v_due >= r.cycle_days THEN false ELSE true END
        WHERE id = r.id;
    END IF;
  END LOOP;
END; $$;
GRANT EXECUTE ON FUNCTION public.process_due_payouts(uuid) TO authenticated;

-- ============ PURCHASE PLAN (atomic) ============
CREATE OR REPLACE FUNCTION public.purchase_plan(_plan_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_price numeric;
  v_balance numeric;
  v_inv_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT price INTO v_price FROM public.plans WHERE id = _plan_id;
  IF v_price IS NULL THEN RAISE EXCEPTION 'Plan no encontrado'; END IF;
  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance < v_price THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
  UPDATE public.profiles SET balance = balance - v_price WHERE id = v_uid;
  INSERT INTO public.investments (user_id, plan_id) VALUES (v_uid, _plan_id) RETURNING id INTO v_inv_id;
  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (v_uid, 'purchase', -v_price, 'Arrendamiento de plan');
  RETURN json_build_object('investment_id', v_inv_id);
END; $$;
GRANT EXECUTE ON FUNCTION public.purchase_plan(uuid) TO authenticated;

-- ============ ADMIN: APPROVE RECHARGE + COMMISSION CHAIN ============
CREATE OR REPLACE FUNCTION public.admin_approve_recharge(_req_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_req record;
  v_current uuid;
  v_pcts numeric[] := ARRAY[15,8,6,4,2];
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

  -- 5-level commissions
  SELECT referred_by INTO v_parent FROM public.profiles WHERE id = v_req.user_id;
  v_current := v_parent;
  WHILE v_current IS NOT NULL AND v_lvl <= 5 LOOP
    v_comm := v_req.amount * v_pcts[v_lvl] / 100.0;
    UPDATE public.profiles SET balance = balance + v_comm WHERE id = v_current;
    INSERT INTO public.transactions (user_id, kind, amount, description)
    VALUES (v_current, 'commission', v_comm, 'Comisión nivel '||v_lvl);
    SELECT referred_by INTO v_parent FROM public.profiles WHERE id = v_current;
    v_current := v_parent;
    v_lvl := v_lvl + 1;
  END LOOP;
  UPDATE public.community_fund SET total = total + v_req.amount, updated_at=now() WHERE id=1;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_approve_recharge(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reject_recharge(_req_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE public.recharge_requests SET status='rejected', processed_at=now() WHERE id = _req_id AND status='pending';
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_reject_recharge(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(_req_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req record;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id=_req_id FOR UPDATE;
  IF v_req IS NULL OR v_req.status <> 'pending' THEN RAISE EXCEPTION 'Solicitud inválida'; END IF;
  UPDATE public.withdrawal_requests SET status='approved', processed_at=now() WHERE id=_req_id;
  UPDATE public.profiles SET total_withdrawn = total_withdrawn + v_req.amount WHERE id = v_req.user_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(_req_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req record;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id=_req_id FOR UPDATE;
  IF v_req IS NULL OR v_req.status <> 'pending' THEN RAISE EXCEPTION 'Solicitud inválida'; END IF;
  UPDATE public.withdrawal_requests SET status='rejected', processed_at=now() WHERE id=_req_id;
  -- Refund the held amount (we deducted on creation)
  UPDATE public.profiles SET balance = balance + v_req.amount WHERE id = v_req.user_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid) TO authenticated;

-- ============ CREATE WITHDRAWAL (deducts balance, requires PIN) ============
CREATE OR REPLACE FUNCTION public.create_withdrawal(_amount numeric, _bank_account_id uuid, _pin text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_bal numeric;
  v_pin_row record;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Monto inválido'; END IF;
  SELECT * INTO v_pin_row FROM public.withdrawal_pins
    WHERE user_id = v_uid AND pin = _pin AND used = false AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1;
  IF v_pin_row IS NULL THEN RAISE EXCEPTION 'PIN inválido o vencido'; END IF;
  SELECT balance INTO v_bal FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_bal < _amount THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
  UPDATE public.profiles SET balance = balance - _amount WHERE id = v_uid;
  UPDATE public.withdrawal_pins SET used = true WHERE id = v_pin_row.id;
  INSERT INTO public.withdrawal_requests (user_id, amount, bank_account_id)
  VALUES (v_uid, _amount, _bank_account_id) RETURNING id INTO v_id;
  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (v_uid, 'withdraw', -_amount, 'Solicitud de retiro');
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_withdrawal(numeric, uuid, text) TO authenticated;

-- ============ GENERATE WITHDRAWAL PIN ============
CREATE OR REPLACE FUNCTION public.generate_withdrawal_pin()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pin text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  v_pin := lpad((floor(random()*1000000))::int::text, 6, '0');
  INSERT INTO public.withdrawal_pins (user_id, pin, expires_at)
  VALUES (v_uid, v_pin, now() + interval '5 minutes');
  RETURN v_pin;
END; $$;
GRANT EXECUTE ON FUNCTION public.generate_withdrawal_pin() TO authenticated;

-- ============ ADMIN: list users (for admin panel) ============
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (id uuid, username text, email text, invitation_code text, balance numeric, total_recharged numeric, total_withdrawn numeric, referred_by uuid, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT id, username, email, invitation_code, balance, total_recharged, total_withdrawn, referred_by, created_at
  FROM public.profiles
  WHERE public.has_role(auth.uid(),'admin')
  ORDER BY created_at DESC
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
