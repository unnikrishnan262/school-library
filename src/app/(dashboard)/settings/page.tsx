import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings2, FileText, Database } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/");

  return (
    <>
      <Header title="Settings & Administration" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SettingCard
            href="/settings/general"
            icon={<Settings2 className="h-8 w-8 text-primary" />}
            title="General Settings"
            description="Configure fines, borrowing rules, and school information"
          />
          <SettingCard
            href="/settings/audit-logs"
            icon={<FileText className="h-8 w-8 text-primary" />}
            title="Audit Logs"
            description="View system activity and change history"
          />
          <SettingCard
            href="/settings/backup"
            icon={<Database className="h-8 w-8 text-primary" />}
            title="Backup & Restore"
            description="Create and restore database backups"
          />
        </div>
      </div>
    </>
  );
}

function SettingCard({
  href, icon, title, description,
}: {
  href: string; icon: React.ReactNode; title: string; description: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary transition-colors cursor-pointer h-full">
        <CardContent className="flex flex-col items-center text-center p-6 gap-3">
          {icon}
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
