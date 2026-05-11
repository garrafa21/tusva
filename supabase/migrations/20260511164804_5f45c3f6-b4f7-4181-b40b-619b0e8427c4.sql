DELETE FROM public.push_subscriptions a
USING public.push_subscriptions b
WHERE a.user_id = b.user_id
  AND a.user_agent IS NOT NULL
  AND a.user_agent = b.user_agent
  AND a.endpoint <> b.endpoint
  AND a.last_seen_at < b.last_seen_at;