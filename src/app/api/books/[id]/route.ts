import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      category: true,
      copies: { orderBy: { accessionNumber: "asc" } },
    },
  });
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(book);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const {
    title, author, isbn, publisher, edition, year,
    categoryId, language, type, description,
  } = body;

  if (!title?.trim() || !author?.trim() || !categoryId) {
    return NextResponse.json(
      { error: "Title, author, and category are required" },
      { status: 400 }
    );
  }

  try {
    const book = await prisma.book.update({
      where: { id },
      data: {
        title: title.trim(),
        author: author.trim(),
        isbn: isbn?.trim() || null,
        publisher: publisher?.trim() || null,
        edition: edition?.trim() || null,
        year: year ? parseInt(year) : null,
        categoryId,
        language: language || "English",
        type: type || "BOOK",
        description: description?.trim() || null,
      },
      include: { category: true, copies: true },
    });
    return NextResponse.json(book);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  const issued = await prisma.transaction.count({
    where: { bookCopy: { bookId: id }, status: "ISSUED" },
  });
  if (issued > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${issued} copy/copies currently issued` },
      { status: 409 }
    );
  }

  await prisma.book.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
