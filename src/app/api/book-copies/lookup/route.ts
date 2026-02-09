import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  if (!query.trim()) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  const copy = await prisma.bookCopy.findFirst({
    where: {
      OR: [
        { barcode: query.trim() },
        { accessionNumber: query.trim() },
      ],
    },
    include: {
      book: { include: { category: true } },
      transactions: {
        where: { status: "ISSUED" },
        include: {
          student: { include: { user: { select: { name: true } } } },
          staff: { include: { user: { select: { name: true } } } },
        },
      },
    },
  });

  if (!copy) {
    return NextResponse.json({ error: "Book copy not found" }, { status: 404 });
  }

  return NextResponse.json(copy);
}
