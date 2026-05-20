import { Prisma } from '@prisma/client';
import prisma from './prisma';
import logger from './logger';

export async function writeAudit(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entity: string,
  entityId: string,
  actorId: string,
  actorUsername: string,
  detail: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { action, entity, entityId, actorId, actorUsername, detail: detail as Prisma.InputJsonValue },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to write audit log');
  }
}
