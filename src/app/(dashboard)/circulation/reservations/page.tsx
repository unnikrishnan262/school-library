import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export default async function ReservationsPage() {
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "LIBRARIAN"].includes(session?.user?.role || "")) redirect("/");

  const reservations = await prisma.reservation.findMany({
    where: { status: { in: ["PENDING", "FULFILLED"] } },
    include: {
      book: { select: { title: true, author: true, availableCopies: true } },
      student: { include: { user: { select: { name: true } } } },
      staff: { include: { user: { select: { name: true } } } },
    },
    orderBy: { reservedAt: "asc" },
  });

  return (
    <>
      <Header title="Reservations" />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Reservations ({reservations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {reservations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No active reservations</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Reserved On</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((r) => {
                    const member = r.student?.user.name || r.staff?.user.name || "—";
                    const isExpired = new Date(r.expiresAt) < new Date();
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium">{r.book.title}</p>
                          <p className="text-xs text-muted-foreground">{r.book.author}</p>
                        </TableCell>
                        <TableCell>{member}</TableCell>
                        <TableCell className="text-sm">{formatDate(r.reservedAt)}</TableCell>
                        <TableCell className={`text-sm ${isExpired ? "text-destructive" : ""}`}>
                          {formatDate(r.expiresAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.book.availableCopies > 0 ? "success" : "destructive"}>
                            {r.book.availableCopies} copy/copies
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            r.status === "FULFILLED" ? "success" :
                            isExpired ? "destructive" : "warning"
                          }>
                            {isExpired && r.status === "PENDING" ? "EXPIRED" : r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
