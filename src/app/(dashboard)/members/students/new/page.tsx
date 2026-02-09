import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { StudentForm } from "@/components/members/student-form";

export default async function NewStudentPage() {
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "LIBRARIAN"].includes(session?.user?.role || "")) redirect("/members");

  const academicYears = await prisma.academicYear.findMany({ orderBy: { year: "desc" } });

  return (
    <>
      <Header title="Add Student" />
      <div className="p-6 max-w-3xl">
        <StudentForm academicYears={academicYears} mode="create" />
      </div>
    </>
  );
}
