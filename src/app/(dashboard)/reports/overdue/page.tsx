import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { OverdueReport } from "@/components/reports/overdue-report";

export default async function OverdueReportPage() {
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "LIBRARIAN"].includes(session?.user?.role || "")) redirect("/");

  const schoolName =
    (await prisma.settings.findUnique({ where: { key: "school_name" } }))?.value ||
    "School Library";

  return (
    <>
      <Header title="Overdue Books Report" />
      <div className="p-6 max-w-6xl">
        <OverdueReport schoolName={schoolName} />
      </div>
    </>
  );
}
