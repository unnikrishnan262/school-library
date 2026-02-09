import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { FileText, AlertTriangle, TrendingUp, Package } from "lucide-react";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "LIBRARIAN"].includes(session?.user?.role || "")) redirect("/");

  const [overdueCount, pendingFines, totalBooks, totalIssued] = await Promise.all([
    prisma.transaction.count({ where: { status: "ISSUED", dueDate: { lt: new Date() } } }),
    prisma.fine.aggregate({ where: { isPaid: false }, _sum: { amount: true } }),
    prisma.book.count(),
    prisma.transaction.count({ where: { status: "ISSUED" } }),
  ]);

  return (
    <>
      <Header title="Reports" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReportCard
            href="/reports/summary"
            icon={<FileText className="h-8 w-8 text-primary" />}
            title="Issue / Return Summary"
            description="Daily, monthly & yearly circulation statistics"
          />
          <ReportCard
            href="/reports/overdue"
            icon={<AlertTriangle className="h-8 w-8 text-destructive" />}
            title="Overdue & Fines"
            description={`${overdueCount} overdue • ₹${Number(pendingFines._sum.amount || 0).toFixed(2)} pending`}
            urgent={overdueCount > 0}
          />
          <ReportCard
            href="/reports/popular"
            icon={<TrendingUp className="h-8 w-8 text-primary" />}
            title="Most Issued Books"
            description="Reading trends and popular titles"
          />
          <ReportCard
            href="/reports/stock"
            icon={<Package className="h-8 w-8 text-primary" />}
            title="Stock Verification"
            description={`${totalBooks} titles • ${totalIssued} copies out`}
          />
        </div>
      </div>
    </>
  );
}

function ReportCard({
  href, icon, title, description, urgent,
}: {
  href: string; icon: React.ReactNode; title: string; description: string; urgent?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className={`hover:border-primary transition-colors cursor-pointer h-full ${urgent ? "border-destructive/50" : ""}`}>
        <CardContent className="flex flex-col items-center text-center p-6 gap-3">
          {icon}
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
