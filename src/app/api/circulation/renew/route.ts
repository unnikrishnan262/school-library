import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { transactionId } = await request.json();
  if (!transactionId) return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });

  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (transaction.status !== "ISSUED") {
    return NextResponse.json({ error: "Only issued books can be renewed" }, { status: 409 });
  }

  const maxRenewals = parseInt(
    (await prisma.settings.findUnique({ where: { key: "max_renewals" } }))?.value || "2"
  );

  if (transaction.renewCount >= maxRenewals) {
    return NextResponse.json(
      { error: `Maximum renewals (${maxRenewals}) reached` },
      { status: 409 }
    );
  }

  // Determine extension days based on member type
  const isStaff = !!transaction.staffId;
  const daysKey = isStaff ? "max_borrow_days_teacher" : "max_borrow_days_student";
  const days = parseInt(
    (await prisma.settings.findUnique({ where: { key: daysKey } }))?.value || "14"
  );

  const newDueDate = new Date(transaction.dueDate);
  newDueDate.setDate(newDueDate.getDate() + days);

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      dueDate: newDueDate,
      renewCount: { increment: 1 },
      renewedAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}
