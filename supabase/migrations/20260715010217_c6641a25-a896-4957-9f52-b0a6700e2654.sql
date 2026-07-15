ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bonus_locked boolean NOT NULL DEFAULT true;

INSERT INTO public.plans (name, price, daily_profit_pct, cycle_days, sort_order, hidden)
SELECT 'Plan Debut', 5.00, 5.00, 30, 0, false
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Plan Debut');

CREATE TABLE IF NOT EXISTS public.signup_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip inet NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS signup_ips_ip_idx ON public.signup_ips (ip);

GRANT ALL ON public.signup_ips TO service_role;
ALTER TABLE public.signup_ips ENABLE ROW LEVEL SECURITY;

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
  v_debut_id uuid;
BEGIN
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1));

  LOOP
    v_inv_code := upper(substr(md5(random()::text || NEW.id::text),1,8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE invitation_code = v_inv_code);
  END LOOP;

  IF NEW.raw_user_meta_data ? 'invitation_code'
     AND NEW.raw_user_meta_data->>'invitation_code' <> '' THEN
    SELECT id INTO v_ref_id
      FROM public.profiles
     WHERE invitation_code = upper(NEW.raw_user_meta_data->>'invitation_code');
  END IF;

  INSERT INTO public.profiles (id, username, email, invitation_code, referred_by, balance, bonus_locked)
  VALUES (NEW.id, v_username, NEW.email, v_inv_code, v_ref_id, 5.00, true);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (NEW.id, 'bonus', 5.00, 'Bono de bienvenida Solaris Future Tech ($5.00 USD)');

  SELECT id INTO v_debut_id FROM public.plans WHERE name = 'Plan Debut' LIMIT 1;
  IF v_debut_id IS NOT NULL THEN
    INSERT INTO public.investments (user_id, plan_id, active, purchased_at, last_payout_at, payouts_made)
    VALUES (NEW.id, v_debut_id, true, now(), now(), 0);
  END IF;

  RETURN NEW;
END;
$function$;