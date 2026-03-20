import { db } from '../db/index.js';
import { adminAuditLog } from '../db/schema.js';

export async function logAdminAction(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  await db.insert(adminAuditLog).values({
    actorId,
    action,
    targetType,
    targetId,
    details: details ?? null,
  });
}
