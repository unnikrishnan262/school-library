import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { AuditLogViewer } from "@/components/settings/audit-log-viewer";

export default async function AuditLogsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/");

  return (
    <>
      <Header title="Audit Logs" />
      <div className="p-6 max-w-7xl">
        <AuditLogViewer />
      </div>
    </>
  );
}
