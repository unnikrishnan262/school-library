import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit-logger";

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { bookCopyId, memberId, memberType, dueDate, notes } = await request.json();

  if (!bookCopyId || !memberId || !memberType || !dueDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check copy is available
  const copy = await prisma.bookCopy.findUnique({
    where: { id: bookCopyId },
    include: { book: true },
  });

  if (!copy) return NextResponse.json({ error: "Book copy not found" }, { status: 404 });
  if (copy.status !== "AVAILABLE") {
    return NextResponse.json({ error: `Copy is ${copy.status.toLowerCase()}, not available` }, { status: 409 });
  }

  // Check member borrowing limits
  const maxBooksSetting = await prisma.settings.findUnique({
    where: { key: memberType === "student" ? "max_books_student" : "max_books_teacher" },
  });
  const maxBooks = parseInt(maxBooksSetting?.value || "3");

  const activeCount = memberType === "student"
    ? await prisma.transaction.count({ where: { studentId: memberId, status: "ISSUED" } })
    : await prisma.transaction.count({ where: { staffId: memberId, status: "ISSUED" } });

  if (activeCount >= maxBooks) {
    return NextResponse.json(
      { error: `Member has reached borrowing limit (${maxBooks} books)` },
      { status: 409 }
    );
  }

  // Create transaction
  const transaction = await prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        bookCopyId,
        studentId: memberType === "student" ? memberId : null,
        staffId: memberType === "staff" ? memberId : null,
        dueDate: new Date(dueDate),
        issuedById: auth.session!.user.id,
        notes: notes || null,
        status: "ISSUED",
      },
      include: {
        bookCopy: { include: { book: true } },
        student: { include: { user: { select: { name: true } } } },
        staff: { include: { user: { select: { name: true } } } },
      },
    });

    // Mark copy as ISSUED
    await tx.bookCopy.update({
      where: { id: bookCopyId },
      data: { status: "ISSUED" },
    });

    // Update available copies count
    await tx.book.update({
      where: { id: copy.bookId },
      data: { availableCopies: { decrement: 1 } },
    });

    return created;
  });

  await logAudit({
    userId: auth.session!.user.id,
    action: "ISSUE",
    entity: "Transaction",
    entityId: transaction.id,
    details: { bookTitle: copy.book.title, accessionNumber: copy.accessionNumber },
  });

  return NextResponse.json(transaction, { status: 201 });
}
