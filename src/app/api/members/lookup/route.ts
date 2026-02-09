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

  // Search students
  const students = await prisma.student.findMany({
    where: {
      OR: [
        { admissionNumber: { contains: query, mode: "insensitive" } },
        { user: { name: { contains: query, mode: "insensitive" } } },
      ],
    },
    take: 5,
    include: {
      user: { select: { id: true, name: true, email: true, isActive: true } },
      academicYear: { select: { year: true } },
      transactions: { where: { status: "ISSUED" }, select: { id: true } },
    },
  });

  // Search staff
  const staff = await prisma.staff.findMany({
    where: {
      OR: [
        { staffId: { contains: query, mode: "insensitive" } },
        { user: { name: { contains: query, mode: "insensitive" } } },
      ],
    },
    take: 5,
    include: {
      user: { select: { id: true, name: true, email: true, isActive: true } },
      transactions: { where: { status: "ISSUED" }, select: { id: true } },
    },
  });

  const results = [
    ...students.map((s) => ({
      type: "student" as const,
      id: s.id,
      name: s.user.name,
      identifier: s.admissionNumber,
      detail: `Class ${s.class}-${s.section} | ${s.academicYear.year}`,
      isActive: s.user.isActive,
      activeIssues: s.transactions.length,
    })),
    ...staff.map((s) => ({
      type: "staff" as const,
      id: s.id,
      name: s.user.name,
      identifier: s.staffId,
      detail: s.department || "Staff",
      isActive: s.user.isActive,
      activeIssues: s.transactions.length,
    })),
  ];

  return NextResponse.json(results);
}
