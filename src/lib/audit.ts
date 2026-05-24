import { supabase } from './supabase';

// Non-blocking finance audit logger. Failures must never break the user action.
export async function logAudit(
  action: string,
  entity: string,
  entityId: string | null,
  detail: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    await supabase.from('cswo_audit_log').insert({
      actor_id: data.user?.id ?? null,
      action,
      entity,
      entity_id: entityId,
      detail,
    });
  } catch {
    /* ignore — audit logging is best-effort */
  }
}
