import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, List, BookMarked } from "lucide-react";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function CirculationPage() {
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "LIBRARIAN"].includes(session?.user?.role || "")) redirect("/");

  const [activeIssues, overdueCount, todayIssues, todayReturns] = await Promise.all([
    prisma.transaction.count({ where: { status: "ISSUED" } }),
    prisma.transaction.count({ where: { status: "ISSUED", dueDate: { lt: new Date() } } }),
    prisma.transaction.count({
      where: {
        issueDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.transaction.count({
      where: {
        returnDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        status: "RETURNED",
      },
    }),
  ]);

  const recentTransactions = await prisma.transaction.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      bookCopy: { include: { book: { select: { title: true } } } },
      student: { include: { user: { select: { name: true } } } },
      staff: { include: { user: { select: { name: true } } } },
    },
  });

  return (
    <>
      <Header title="Circulation" />
      <div className="p-6 space-y-6">
        {/* Quick actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard
            href="/circulation/issue"
            icon={<ArrowDownToLine className="h-8 w-8 text-primary" />}
            title="Issue Book"
            description="Scan and issue a book to a member"
          />
          <ActionCard
            href="/circulation/return"
            icon={<ArrowUpFromLine className="h-8 w-8 text-primary" />}
            title="Return Book"
            description="Process book return and calculate fines"
          />
          <ActionCard
            href="/circulation/transactions"
            icon={<List className="h-8 w-8 text-primary" />}
            title="Transactions"
            description="View all issue/return history"
          />
          <ActionCard
            href="/circulation/reservations"
            icon={<BookMarked className="h-8 w-8 text-primary" />}
            title="Reservations"
            description="Manage book reservations"
          />
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Active Issues" value={activeIssues} />
          <StatCard label="Overdue" value={overdueCount} danger />
          <StatCard label="Issued Today" value={todayIssues} />
          <StatCard label="Returned Today" value={todayReturns} />
        </div>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((tx) => {
                  const member = tx.student?.user.name || tx.staff?.user.name || "Unknown";
                  return (
                    <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                      <div className="flex items-center gap-3">
                        <Badge variant={tx.status === "RETURNED" ? "success" : tx.status === "ISSUED" ? "warning" : "destructive"}>
                          {tx.status}
                        </Badge>
                        <span className="font-medium">{tx.bookCopy.book.title}</span>
                        <span className="text-muted-foreground">— {member}</span>
                      </div>
                      <span className="text-muted-foreground">{formatDate(tx.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ActionCard({ href, icon, title, description }: {
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

function StatCard({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className={`text-3xl font-bold ${danger && value > 0 ? "text-destructive" : ""}`}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
