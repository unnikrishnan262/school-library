import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const { id: targetYearId } = await params;
  const { promotions } = await request.json();
  // promotions: [{ studentId, newClass, newSection }]

  if (!promotions?.length) {
    return NextResponse.json({ error: "No promotions provided" }, { status: 400 });
  }

  const targetYear = await prisma.academicYear.findUnique({ where: { id: targetYearId } });
  if (!targetYear) return NextResponse.json({ error: "Academic year not found" }, { status: 404 });

  const results = await prisma.$transaction(
    promotions.map((p: { studentId: string; newClass: string; newSection: string }) =>
      prisma.student.update({
        where: { id: p.studentId },
        data: {
          academicYearId: targetYearId,
          class: p.newClass,
          section: p.newSection.toUpperCase(),
        },
      })
    )
  );

  return NextResponse.json({ promoted: results.length });
}
