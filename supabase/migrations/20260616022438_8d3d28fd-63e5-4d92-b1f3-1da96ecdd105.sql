
ALTER TABLE public.recharge_requests
  ADD COLUMN IF NOT EXISTS cedula text,
  ADD COLUMN IF NOT EXISTS holder_name text,
  ADD COLUMN IF NOT EXISTS reference text,
  ALTER COLUMN amount DROP NOT NULL,
  ALTER COLUMN amount SET DEFAULT 0;
