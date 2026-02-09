import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";
import { calculateFine } from "@/lib/fine-calculator";
import { logAudit } from "@/lib/audit-logger";

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { transactionId, returnDate, notes } = await request.json();

  if (!transactionId) {
    return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { bookCopy: { include: { book: true } } },
  });

  if (!transaction) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  if (transaction.status !== "ISSUED") {
    return NextResponse.json({ error: "Book is not currently issued" }, { status: 409 });
  }

  const returnAt = new Date(returnDate || new Date());
  const fine = await calculateFine(transaction.dueDate, returnAt);

  const updated = await prisma.$transaction(async (tx) => {
    // Update transaction
    const result = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        returnDate: returnAt,
        status: returnAt > transaction.dueDate ? "RETURNED" : "RETURNED",
        notes: notes || transaction.notes,
      },
    });

    // Create fine if applicable
    if (fine > 0) {
      await tx.fine.create({
        data: { transactionId, amount: fine, isPaid: false },
      });
    }

    // Mark copy as AVAILABLE
    await tx.bookCopy.update({
      where: { id: transaction.bookCopyId },
      data: { status: "AVAILABLE" },
    });

    // Update available copies count
    await tx.book.update({
      where: { id: transaction.bookCopy.bookId },
      data: { availableCopies: { increment: 1 } },
    });

    return result;
  });

  await logAudit({
    userId: auth.session!.user.id,
    action: "RETURN",
    entity: "Transaction",
    entityId: transactionId,
    details: {
      bookTitle: transaction.bookCopy.book.title,
      fine: fine > 0 ? fine : null,
    },
  });

  return NextResponse.json({ ...updated, fineAmount: fine });
}
