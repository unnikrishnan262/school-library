import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = parseInt(searchParams.get("limit") || "20");

  const fromDate = from ? new Date(from) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  const toDate = to ? new Date(to) : new Date();

  const results = await prisma.book.findMany({
    include: {
      category: { select: { name: true } },
      copies: {
        include: {
          _count: {
            select: {
              transactions: {
                where: { issueDate: { gte: fromDate, lte: toDate } },
              },
            },
          },
        },
      },
    },
  });

  const books = results
    .map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      category: book.category.name,
      type: book.type,
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies,
      issueCount: book.copies.reduce((sum, c) => sum + c._count.transactions, 0),
    }))
    .sort((a, b) => b.issueCount - a.issueCount)
    .slice(0, limit);

  return NextResponse.json(books);
}
