import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 25;

  const where = {
    AND: [
      status ? { status: status as "ISSUED" | "RETURNED" | "OVERDUE" | "LOST" } : {},
      search
        ? {
            OR: [
              { bookCopy: { book: { title: { contains: search, mode: "insensitive" as const } } } },
              { student: { user: { name: { contains: search, mode: "insensitive" as const } } } },
              { staff: { user: { name: { contains: search, mode: "insensitive" as const } } } },
              { bookCopy: { accessionNumber: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {},
    ],
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        bookCopy: { include: { book: { select: { title: true, author: true } } } },
        student: { include: { user: { select: { name: true } } } },
        staff: { include: { user: { select: { name: true } } } },
        fine: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({ transactions, total, page, limit });
}
