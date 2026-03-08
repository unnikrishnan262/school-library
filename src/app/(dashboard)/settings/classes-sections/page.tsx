import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { ClassesSectionsManager } from "@/components/settings/classes-sections-manager";

export default async function ClassesSectionsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/");

  return (
    <>
      <Header title="Classes & Sections" />
      <div className="p-6 max-w-2xl">
        <p className="text-sm text-muted-foreground mb-6">
          Configure the classes and sections available when adding or editing students.
        </p>
        <ClassesSectionsManager />
      </div>
    </>
  );
}
