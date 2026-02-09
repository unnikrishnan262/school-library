import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { StaffForm } from "@/components/members/staff-form";

export default async function NewStaffPage() {
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "LIBRARIAN"].includes(session?.user?.role || "")) redirect("/members");

  return (
    <>
      <Header title="Add Staff" />
      <div className="p-6 max-w-3xl">
        <StaffForm mode="create" />
      </div>
    </>
  );
}
