import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { BackupManager } from "@/components/settings/backup-manager";

export default async function BackupPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/");

  return (
    <>
      <Header title="Backup & Restore" />
      <div className="p-6 max-w-5xl">
        <BackupManager />
      </div>
    </>
  );
}
