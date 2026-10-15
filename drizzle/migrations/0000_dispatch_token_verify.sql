CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE TABLE IF NOT EXISTS public.dispatch_tokens (token text PRIMARY KEY DEFAULT encode(gen_random_bytes(32),'hex'), created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.dispatch_tokens TO service_role;
ALTER TABLE public.dispatch_tokens ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.verify_dispatch_token(_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.dispatch_tokens WHERE token = _token);
$$;
REVOKE ALL ON FUNCTION public.verify_dispatch_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_dispatch_token(text) TO service_role;