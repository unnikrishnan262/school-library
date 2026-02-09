import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { AcademicYearsManager } from "@/components/members/academic-years-manager";

export default async function AcademicYearsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/");

  const [years, students] = await Promise.all([
    prisma.academicYear.findMany({
      orderBy: { year: "desc" },
      include: { _count: { select: { students: true } } },
    }),
    prisma.student.findMany({
      include: { user: { select: { name: true } }, academicYear: { select: { year: true } } },
      orderBy: [{ class: "asc" }, { section: "asc" }, { user: { name: "asc" } }],
    }),
  ]);

  return (
    <>
      <Header title="Academic Years" />
      <div className="p-6 max-w-5xl">
        <AcademicYearsManager years={years} students={students} />
      </div>
    </>
  );
}
