import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { StudentForm } from "@/components/members/student-form";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "LIBRARIAN"].includes(session?.user?.role || "")) redirect("/members");

  const { id } = await params;
  const [student, academicYears] = await Promise.all([
    prisma.student.findUnique({ where: { id }, include: { user: true } }),
    prisma.academicYear.findMany({ orderBy: { year: "desc" } }),
  ]);

  if (!student) notFound();

  return (
    <>
      <Header title={`Edit: ${student.user.name}`} />
      <div className="p-6 max-w-3xl">
        <StudentForm
          academicYears={academicYears}
          mode="edit"
          initialData={{
            id: student.id,
            name: student.user.name,
            email: student.user.email,
            admissionNumber: student.admissionNumber,
            class: student.class,
            section: student.section,
            academicYearId: student.academicYearId,
            parentPhone: student.parentPhone ?? undefined,
            address: student.address ?? undefined,
            isActive: student.user.isActive,
          }}
        />
      </div>
    </>
  );
}
