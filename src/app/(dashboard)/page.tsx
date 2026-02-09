import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, ArrowLeftRight, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

async function getDashboardStats() {
  const [
    totalBooks,
    totalMembers,
    activeIssues,
    overdueCount,
    recentTransactions,
  ] = await Promise.all([
    prisma.book.count(),
    prisma.user.count({ where: { role: { in: ["STUDENT", "TEACHER"] } } }),
    prisma.transaction.count({ where: { status: "ISSUED" } }),
    prisma.transaction.count({
      where: { status: "ISSUED", dueDate: { lt: new Date() } },
    }),
    prisma.transaction.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        bookCopy: { include: { book: true } },
        student: { include: { user: true } },
        staff: { include: { user: true } },
      },
    }),
  ]);

  return { totalBooks, totalMembers, activeIssues, overdueCount, recentTransactions };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const stats = await getDashboardStats();

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-medium text-muted-foreground">
            Welcome back, {session?.user?.name}
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Books</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBooks}</div>
              <p className="text-xs text-muted-foreground">In catalog</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">Students & Staff</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Books Issued</CardTitle>
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeIssues}</div>
              <p className="text-xs text-muted-foreground">Currently out</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats.overdueCount}
              </div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {stats.recentTransactions.map((tx) => {
                  const memberName =
                    tx.student?.user?.name ?? tx.staff?.user?.name ?? "Unknown";
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        <span className="font-medium">
                          {tx.bookCopy.book.title}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          — {memberName}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {formatDate(tx.createdAt)}
                      </div>
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
