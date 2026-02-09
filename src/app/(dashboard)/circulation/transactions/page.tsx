import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { TransactionFilters } from "@/components/circulation/transaction-filters";

interface SearchParams { status?: string; search?: string; page?: string }

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "LIBRARIAN"].includes(session?.user?.role || "")) redirect("/");

  const { status = "", search = "", page: pageStr = "1" } = await searchParams;
  const page = parseInt(pageStr);
  const limit = 25;

  const where = {
    AND: [
      status ? { status: status as "ISSUED" | "RETURNED" | "OVERDUE" | "LOST" } : {},
      search
        ? {
            OR: [
              { bookCopy: { book: { title: { contains: search, mode: "insensitive" as const } } } },
              { student: { user: { name: { contains: search, mode: "insensitive" as const } } } },
              { staff: { user: { name: { contains: search, mode: "insensitive" as const } } } },
              { bookCopy: { accessionNumber: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {},
    ],
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        bookCopy: { include: { book: { select: { title: true } } } },
        student: { include: { user: { select: { name: true } } } },
        staff: { include: { user: { select: { name: true } } } },
        fine: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Header title="Transactions" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} transaction{total !== 1 ? "s" : ""}</p>
        </div>

        <TransactionFilters />

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Returned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fine</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const member = tx.student?.user.name || tx.staff?.user.name || "—";
                const isOverdue = tx.status === "ISSUED" && new Date(tx.dueDate) < new Date();
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium max-w-[180px] truncate">
                      {tx.bookCopy.book.title}
                    </TableCell>
                    <TableCell>{member}</TableCell>
                    <TableCell className="text-sm">{formatDate(tx.issueDate)}</TableCell>
                    <TableCell className={`text-sm ${isOverdue ? "text-destructive font-medium" : ""}`}>
                      {formatDate(tx.dueDate)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.returnDate ? formatDate(tx.returnDate) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        isOverdue ? "destructive" :
                        tx.status === "RETURNED" ? "success" :
                        tx.status === "ISSUED" ? "warning" : "secondary"
                      }>
                        {isOverdue ? "OVERDUE" : tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tx.fine ? (
                        <span className={tx.fine.isPaid ? "text-muted-foreground text-sm" : "text-destructive text-sm font-medium"}>
                          ₹{Number(tx.fine.amount).toFixed(2)}{tx.fine.isPaid ? " ✓" : ""}
                        </span>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/circulation/transactions?page=${page - 1}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}>
                  Previous
                </Link>
              </Button>
            )}
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/circulation/transactions?page=${page + 1}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}>
                  Next
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
