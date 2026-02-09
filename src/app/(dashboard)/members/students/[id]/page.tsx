import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "LIBRARIAN"].includes(session?.user?.role || "")) notFound();

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: true,
      academicYear: true,
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          bookCopy: { include: { book: { select: { title: true, author: true } } } },
          fine: true,
        },
      },
    },
  });

  if (!student) notFound();

  const activeIssues = student.transactions.filter((t) => t.status === "ISSUED").length;
  const totalFines = student.transactions.reduce(
    (sum, t) => sum + (t.fine && !t.fine.isPaid ? Number(t.fine.amount) : 0), 0
  );

  return (
    <>
      <Header title={student.user.name} />
      <div className="p-6 space-y-6 max-w-5xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{student.user.name}</h2>
            <p className="text-muted-foreground">{student.user.email}</p>
          </div>
          <Button asChild>
            <Link href={`/members/students/${id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Admission No." value={student.admissionNumber} />
              <Row label="Class" value={`${student.class}-${student.section}`} />
              <Row label="Academic Year" value={student.academicYear.year} />
              <Row label="Parent Phone" value={student.parentPhone || "—"} />
              <Row label="Address" value={student.address || "—"} />
              <Row label="Status" value={student.user.isActive ? "Active" : "Inactive"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Library Activity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active Issues</span>
                <Badge variant={activeIssues > 0 ? "destructive" : "success"}>{activeIssues}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Transactions</span>
                <span className="font-medium">{student.transactions.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pending Fines</span>
                <span className={`font-medium ${totalFines > 0 ? "text-destructive" : ""}`}>
                  ₹{totalFines.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
          <CardContent>
            {student.transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Return Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fine</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {student.transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{tx.bookCopy.book.title}</TableCell>
                      <TableCell>{formatDate(tx.issueDate)}</TableCell>
                      <TableCell>{formatDate(tx.dueDate)}</TableCell>
                      <TableCell>{tx.returnDate ? formatDate(tx.returnDate) : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={
                          tx.status === "RETURNED" ? "success" :
                          tx.status === "ISSUED" ? "warning" : "destructive"
                        }>{tx.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {tx.fine ? (
                          <span className={tx.fine.isPaid ? "text-muted-foreground" : "text-destructive"}>
                            ₹{Number(tx.fine.amount).toFixed(2)}{tx.fine.isPaid ? " (paid)" : ""}
                          </span>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
