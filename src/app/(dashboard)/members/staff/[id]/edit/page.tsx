import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { StaffForm } from "@/components/members/staff-form";

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "LIBRARIAN"].includes(session?.user?.role || "")) redirect("/members");

  const { id } = await params;
  const staff = await prisma.staff.findUnique({ where: { id }, include: { user: true } });
  if (!staff) notFound();

  return (
    <>
      <Header title={`Edit: ${staff.user.name}`} />
      <div className="p-6 max-w-3xl">
        <StaffForm
          mode="edit"
          initialData={{
            id: staff.id,
            name: staff.user.name,
            email: staff.user.email,
            staffId: staff.staffId,
            department: staff.department ?? undefined,
            role: staff.user.role,
            isActive: staff.user.isActive,
          }}
        />
      </div>
    </>
  );
}
