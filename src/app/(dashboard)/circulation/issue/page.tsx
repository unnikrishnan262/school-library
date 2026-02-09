import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { IssueForm } from "@/components/circulation/issue-form";

export default async function IssuePage() {
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "LIBRARIAN"].includes(session?.user?.role || "")) redirect("/");

  const dueDaysSetting = await prisma.settings.findUnique({
    where: { key: "max_borrow_days_student" },
  });
  const defaultDueDays = parseInt(dueDaysSetting?.value || "14");

  return (
    <>
      <Header title="Issue Book" />
      <div className="p-6 max-w-4xl space-y-6">
        <IssueForm defaultDueDays={defaultDueDays} />
      </div>
    </>
  );
}
