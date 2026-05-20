import prisma from './prisma';
import logger from './logger';

type AuditDetail = Record<string, unknown>;

export async function writeAudit(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entity: string,
  entityId: string,
  actorId: string,
  actorUsername: string,
  detail: AuditDetail,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { action, entity, entityId, actorId, actorUsername, detail },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to write audit log');
  }
}
