import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const classFilter = searchParams.get("class") || "";

  const overdueTransactions = await prisma.transaction.findMany({
    where: {
      status: "ISSUED",
      dueDate: { lt: new Date() },
      ...(classFilter ? { student: { class: classFilter } } : {}),
    },
    include: {
      bookCopy: { include: { book: { select: { title: true, author: true } } } },
      student: {
        include: { user: { select: { name: true } }, academicYear: { select: { year: true } } },
      },
      staff: { include: { user: { select: { name: true } } } },
      fine: true,
    },
    orderBy: { dueDate: "asc" },
  });

  const finePerDay = parseFloat(
    (await prisma.settings.findUnique({ where: { key: "fine_per_day" } }))?.value || "1"
  );

  const rows = overdueTransactions.map((tx) => {
    const daysOverdue = Math.floor((Date.now() - new Date(tx.dueDate).getTime()) / 86400000);
    const estimatedFine = daysOverdue * finePerDay;
    return {
      id: tx.id,
      bookTitle: tx.bookCopy.book.title,
      bookAuthor: tx.bookCopy.book.author,
      accessionNumber: tx.bookCopy.accessionNumber,
      memberName: tx.student?.user.name || tx.staff?.user.name || "Unknown",
      memberType: tx.student ? "student" : "staff",
      class: tx.student ? `${tx.student.class}-${tx.student.section}` : "—",
      year: tx.student?.academicYear.year || "—",
      issueDate: tx.issueDate,
      dueDate: tx.dueDate,
      daysOverdue,
      estimatedFine,
      existingFine: tx.fine ? Number(tx.fine.amount) : null,
      finePaid: tx.fine?.isPaid || false,
    };
  });

  const totalPendingFines = rows.reduce((sum, r) => sum + (r.finePaid ? 0 : r.estimatedFine), 0);

  return NextResponse.json({ rows, totalPendingFines });
}
