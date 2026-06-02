import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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

  try {
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

    const [total, available] = await Promise.all([
      prisma.bookCopy.count({ where: { bookId } }),
      prisma.bookCopy.count({ where: { bookId, status: "AVAILABLE" } }),
    ]);
    await prisma.book.update({
      where: { id: bookId },
      data: { totalCopies: total, availableCopies: available },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "One or more accession numbers or barcodes are already in use" },
        { status: 409 }
      );
    }
    throw e;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { id: bookId } = await params;
  const { searchParams } = new URL(request.url);
  const copyId = searchParams.get("copyId");

  if (!copyId) {
    return NextResponse.json({ error: "copyId is required" }, { status: 400 });
  }

  const copy = await prisma.bookCopy.findUnique({ where: { id: copyId, bookId } });
  if (!copy) {
    return NextResponse.json({ error: "Copy not found" }, { status: 404 });
  }
  if (copy.status === "ISSUED" || copy.status === "RESERVED") {
    return NextResponse.json(
      { error: `Cannot delete a copy that is currently ${copy.status.toLowerCase()}` },
      { status: 400 }
    );
  }

  // Delete historical transactions (and their fines) before the copy — no cascade in schema.
  const txIds = await prisma.transaction
    .findMany({ where: { bookCopyId: copyId }, select: { id: true } })
    .then((rows) => rows.map((r) => r.id));

  await prisma.$transaction([
    prisma.fine.deleteMany({ where: { transactionId: { in: txIds } } }),
    prisma.transaction.deleteMany({ where: { bookCopyId: copyId } }),
    prisma.bookCopy.delete({ where: { id: copyId } }),
  ]);

  const [total, available] = await Promise.all([
    prisma.bookCopy.count({ where: { bookId } }),
    prisma.bookCopy.count({ where: { bookId, status: "AVAILABLE" } }),
  ]);
  await prisma.book.update({
    where: { id: bookId },
    data: { totalCopies: total, availableCopies: available },
  });

  return new NextResponse(null, { status: 204 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { id: bookId } = await params;
  const { copyId, accessionNumber, barcode, condition } = await request.json();

  try {
    const copy = await prisma.bookCopy.update({
      where: { id: copyId, bookId },
      data: {
        accessionNumber,
        barcode: barcode || null,
        condition: condition || "GOOD",
      },
    });
    return NextResponse.json(copy);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "Accession number or barcode already in use" },
        { status: 409 }
      );
    }
    throw e;
  }
}
