import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function GET() {
  const years = await prisma.academicYear.findMany({
    orderBy: { year: "desc" },
    include: { _count: { select: { students: true } } },
  });
  return NextResponse.json(years);
}

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const { year, startDate, endDate } = await request.json();
  if (!year?.trim() || !startDate || !endDate) {
    return NextResponse.json({ error: "Year, start date and end date are required" }, { status: 400 });
  }

  try {
    const academicYear = await prisma.academicYear.create({
      data: {
        year: year.trim(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: false,
      },
    });
    return NextResponse.json(academicYear, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Academic year already exists" }, { status: 409 });
  }
}
