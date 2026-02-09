import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: true,
      academicYear: true,
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { bookCopy: { include: { book: { select: { title: true } } } }, fine: true },
      },
    },
  });
  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(student);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  const { name, admissionNumber, class: cls, section, academicYearId, parentPhone, address, isActive } =
    await request.json();

  const student = await prisma.student.findUnique({ where: { id }, include: { user: true } });
  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: student.userId },
      data: { name: name?.trim() || student.user.name, isActive: isActive ?? student.user.isActive },
    }),
    prisma.student.update({
      where: { id },
      data: {
        admissionNumber: admissionNumber?.trim() || student.admissionNumber,
        class: cls || student.class,
        section: section?.trim().toUpperCase() || student.section,
        academicYearId: academicYearId || student.academicYearId,
        parentPhone: parentPhone?.trim() || null,
        address: address?.trim() || null,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  const activeIssues = await prisma.transaction.count({
    where: { studentId: id, status: "ISSUED" },
  });
  if (activeIssues > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${activeIssues} book(s) currently issued` },
      { status: 409 }
    );
  }

  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.user.delete({ where: { id: student.userId } });
  return new NextResponse(null, { status: 204 });
}
