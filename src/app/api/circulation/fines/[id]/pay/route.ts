import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit-logger";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  const fine = await prisma.fine.findUnique({ where: { id } });
  if (!fine) return NextResponse.json({ error: "Fine not found" }, { status: 404 });
  if (fine.isPaid) return NextResponse.json({ error: "Fine already paid" }, { status: 409 });

  const updated = await prisma.fine.update({
    where: { id },
    data: { isPaid: true, paidAt: new Date() },
  });

  await logAudit({
    userId: auth.session!.user.id,
    action: "FINE_PAID",
    entity: "Fine",
    entityId: id,
    details: { amount: Number(fine.amount) },
  });

  return NextResponse.json(updated);
}
