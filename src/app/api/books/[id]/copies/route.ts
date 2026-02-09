import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { id: bookId } = await params;
  const { copies } = await request.json();

  if (!copies?.length) {
    return NextResponse.json({ error: "No copies provided" }, { status: 400 });
  }

  const created = await prisma.$transaction(
    copies.map((c: { accessionNumber: string; barcode?: string; condition?: string }) =>
      prisma.bookCopy.create({
        data: {
          bookId,
          accessionNumber: c.accessionNumber,
          barcode: c.barcode || null,
          condition: (c.condition as "NEW" | "GOOD" | "FAIR" | "POOR" | "DAMAGED") || "GOOD",
          status: "AVAILABLE",
        },
      })
    )
  );

  // Update book copy counts
  const [total, available] = await Promise.all([
    prisma.bookCopy.count({ where: { bookId } }),
    prisma.bookCopy.count({ where: { bookId, status: "AVAILABLE" } }),
  ]);
  await prisma.book.update({
    where: { id: bookId },
    data: { totalCopies: total, availableCopies: available },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { id: bookId } = await params;
  const { copyId, accessionNumber, barcode, condition } = await request.json();

  const copy = await prisma.bookCopy.update({
    where: { id: copyId, bookId },
    data: {
      accessionNumber,
      barcode: barcode || null,
      condition: condition || "GOOD",
    },
  });
  return NextResponse.json(copy);
}
