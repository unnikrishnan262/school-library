import { Prisma } from "@prisma/client";
import prisma from "./prisma";

export async function logAudit({
  userId,
  action,
  entity,
  entityId,
  details,
}: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      details,
    },
  });
}
