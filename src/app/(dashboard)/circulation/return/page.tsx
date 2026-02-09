import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { ReturnForm } from "@/components/circulation/return-form";

export default async function ReturnPage() {
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "LIBRARIAN"].includes(session?.user?.role || "")) redirect("/");

  return (
    <>
      <Header title="Return Book" />
      <div className="p-6 max-w-3xl space-y-6">
        <ReturnForm />
      </div>
    </>
  );
}
