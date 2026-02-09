import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId") || "";

  const books = await prisma.book.findMany({
    where: categoryId ? { categoryId } : undefined,
    include: {
      category: { select: { name: true } },
      copies: { select: { status: true, condition: true } },
    },
    orderBy: [{ category: { name: "asc" } }, { title: "asc" }],
  });

  const rows = books.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    category: book.category.name,
    type: book.type,
    totalCopies: book.copies.length,
    available: book.copies.filter((c) => c.status === "AVAILABLE").length,
    issued: book.copies.filter((c) => c.status === "ISSUED").length,
    lost: book.copies.filter((c) => c.status === "LOST").length,
    damaged: book.copies.filter((c) => c.status === "DAMAGED").length,
  }));

  const summary = {
    totalBooks: rows.length,
    totalCopies: rows.reduce((s, r) => s + r.totalCopies, 0),
    available: rows.reduce((s, r) => s + r.available, 0),
    issued: rows.reduce((s, r) => s + r.issued, 0),
    lost: rows.reduce((s, r) => s + r.lost, 0),
    damaged: rows.reduce((s, r) => s + r.damaged, 0),
  };

  return NextResponse.json({ rows, summary });
}
