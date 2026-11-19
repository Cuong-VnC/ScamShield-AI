-- ScamShield-AI: stored-data totals for the existing GET /stats backend.
-- Run once as the Supabase SQL Editor database owner after reviewing.
-- Keeps scamshield_public_stats() and scamshield_public_stats_v2() unchanged.
-- No INSERT/UPDATE/DELETE; no changes to the existing tables or RLS policies.
BEGIN;

-- Keep the privileged aggregate in a non-exposed schema.
CREATE SCHEMA IF NOT EXISTS scamshield_stats_internal;
REVOKE ALL ON SCHEMA scamshield_stats_internal FROM PUBLIC;
GRANT USAGE ON SCHEMA scamshield_stats_internal TO anon;

CREATE FUNCTION scamshield_stats_internal.stored_counts()
RETURNS TABLE (
    phishing_urls bigint,
    legitimate_urls bigint,
    total_urls bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
    WITH counts AS (
        SELECT
            (SELECT pg_catalog.count(*) FROM public.phishing_urls) AS phishing,
            (SELECT pg_catalog.count(*) FROM public.safe_urls) AS legitimate
    )
    SELECT phishing, legitimate, phishing + legitimate FROM counts;
$$;

REVOKE ALL ON FUNCTION scamshield_stats_internal.stored_counts()
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION scamshield_stats_internal.stored_counts() TO anon;

-- The only RPC in the exposed public schema is SECURITY INVOKER.
CREATE FUNCTION public.scamshield_stored_stats()
RETURNS TABLE (
    phishing_urls bigint,
    legitimate_urls bigint,
    total_urls bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT c.phishing_urls, c.legitimate_urls, c.total_urls
    FROM scamshield_stats_internal.stored_counts() AS c;
$$;

REVOKE ALL ON FUNCTION public.scamshield_stored_stats()
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.scamshield_stored_stats() TO anon;

NOTIFY pgrst, 'reload schema';
COMMIT;

-- Read-only verification in the Supabase SQL Editor after running the above:
-- BEGIN;
-- SET LOCAL ROLE anon;
-- SELECT * FROM public.scamshield_stored_stats();
-- ROLLBACK;
-- Expected as of the user's latest SQL screenshot:
-- phishing_urls=1040984, legitimate_urls=650000, total_urls=1690984
-- Separately verify HTTP GET /rest/v1/rpc/scamshield_stored_stats using
-- the existing publishable key, then test backend GET /stats and its caching.
