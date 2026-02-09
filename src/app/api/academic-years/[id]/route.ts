import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  const { year, startDate, endDate, isActive } = await request.json();

  // If activating, deactivate all others first
  if (isActive) {
    await prisma.academicYear.updateMany({ data: { isActive: false } });
  }

  const updated = await prisma.academicYear.update({
    where: { id },
    data: {
      year: year?.trim(),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      isActive: isActive ?? undefined,
    },
  });
  return NextResponse.json(updated);
}
