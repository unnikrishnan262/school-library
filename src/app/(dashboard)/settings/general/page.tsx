import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function GeneralSettingsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/");

  return (
    <>
      <Header title="General Settings" />
      <div className="p-6 max-w-4xl">
        <SettingsForm />
      </div>
    </>
  );
}
