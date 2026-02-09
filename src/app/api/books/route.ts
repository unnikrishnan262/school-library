import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";
import type { BookType } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const type = searchParams.get("type") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where = {
    AND: [
      search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { author: { contains: search, mode: "insensitive" as const } },
              { isbn: { contains: search, mode: "insensitive" as const } },
              {
                copies: {
                  some: { accessionNumber: { contains: search, mode: "insensitive" as const } },
                },
              },
            ],
          }
        : {},
      categoryId ? { categoryId } : {},
      type ? { type: type as BookType } : {},
    ],
  };

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { copies: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.book.count({ where }),
  ]);

  return NextResponse.json({ books, total, page, limit });
}

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const body = await request.json();
  const {
    title, author, isbn, publisher, edition, year,
    categoryId, language, type, description, copies,
  } = body;

  if (!title?.trim() || !author?.trim() || !categoryId) {
    return NextResponse.json(
      { error: "Title, author, and category are required" },
      { status: 400 }
    );
  }

  try {
    const book = await prisma.book.create({
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
        totalCopies: 0,
        availableCopies: 0,
        copies: copies?.length
          ? {
              create: copies.map((c: { accessionNumber: string; barcode?: string; condition?: string }) => ({
                accessionNumber: c.accessionNumber,
                barcode: c.barcode || null,
                condition: c.condition || "GOOD",
                status: "AVAILABLE",
              })),
            }
          : undefined,
      },
      include: { copies: true, category: true },
    });

    // Update copy counts
    await prisma.book.update({
      where: { id: book.id },
      data: {
        totalCopies: book.copies.length,
        availableCopies: book.copies.filter((c) => c.status === "AVAILABLE").length,
      },
    });

    return NextResponse.json(book, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "ISBN already exists" }, { status: 409 });
    }
    throw e;
  }
}
