-- Saving a token again under a label (#186) ----------------------------------

-- save-secret creates the token's Vault secret, then upserts the row that
-- points at it. When the upsert fails, nothing points at the new secret, so
-- save-secret deletes it with this. Only the service role may call it.
create or replace function public.delete_vault_secret(p_id uuid)
  returns void
  language sql
  security definer
  set search_path = ''
as $$
  delete from vault.secrets where id = p_id;
$$;

revoke execute on function public.delete_vault_secret(uuid)
  from public, anon, authenticated;
grant execute on function public.delete_vault_secret(uuid) to service_role;
