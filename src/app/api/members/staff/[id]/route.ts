import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { id } = await params;
  const { name, staffId, department, role, isActive } = await request.json();

  const staff = await prisma.staff.findUnique({ where: { id }, include: { user: true } });
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: staff.userId },
      data: {
        name: name?.trim() || staff.user.name,
        role: role || staff.user.role,
        isActive: isActive ?? staff.user.isActive,
      },
    }),
    prisma.staff.update({
      where: { id },
      data: {
        staffId: staffId?.trim() || staff.staffId,
        department: department?.trim() || null,
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
    where: { staffId: id, status: "ISSUED" },
  });
  if (activeIssues > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${activeIssues} book(s) currently issued` },
      { status: 409 }
    );
  }

  const staff = await prisma.staff.findUnique({ where: { id } });
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.user.delete({ where: { id: staff.userId } });
  return new NextResponse(null, { status: 204 });
}
