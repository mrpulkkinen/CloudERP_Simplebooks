import { prisma } from './prisma.js';

export interface AuditLogInput {
  orgId: string;
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  context?: Record<string, unknown>;
}

export async function recordAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        orgId: input.orgId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        userId: input.userId,
        context: input.context
      }
    });
  } catch (error) {
    console.error('Failed to record audit log entry', error);
  }
}

