import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddCopiesDialog } from "@/components/books/add-copies-dialog";
import { CopiesTable } from "@/components/books/copies-table";

const TYPE_LABELS: Record<string, string> = {
  BOOK: "Book", TEXTBOOK: "Textbook", REFERENCE: "Reference",
  MAGAZINE: "Magazine", DIGITAL: "Digital",
};


export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const canManage = ["ADMIN", "LIBRARIAN"].includes(session?.user?.role || "");

  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      category: true,
      copies: { orderBy: { accessionNumber: "asc" } },
    },
  });

  if (!book) notFound();

  return (
    <>
      <Header title={book.title} />
      <div className="p-6 space-y-6 max-w-5xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{book.title}</h2>
            <p className="text-muted-foreground">{book.author}</p>
          </div>
          {canManage && (
            <Button asChild>
              <Link href={`/books/${book.id}/edit`}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </Link>
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Category" value={book.category.name} />
              <Row label="Type" value={TYPE_LABELS[book.type] || book.type} />
              <Row label="ISBN" value={book.isbn || "—"} />
              <Row label="Publisher" value={book.publisher || "—"} />
              <Row label="Edition" value={book.edition || "—"} />
              <Row label="Year" value={book.year?.toString() || "—"} />
              <Row label="Language" value={book.language} />
              {book.description && (
                <div>
                  <span className="font-medium text-muted-foreground">Description</span>
                  <p className="mt-1">{book.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Copies</span>
                <span className="font-bold text-2xl">{book.totalCopies}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Available</span>
                <Badge
                  variant={book.availableCopies === 0 ? "destructive" : "success"}
                  className="text-lg px-3 py-1"
                >
                  {book.availableCopies}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Issued</span>
                <span className="font-medium">
                  {book.totalCopies - book.availableCopies}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Copies ({book.copies.length})</CardTitle>
            {canManage && <AddCopiesDialog bookId={book.id} />}
          </CardHeader>
          <CardContent>
            <CopiesTable bookId={book.id} copies={book.copies} canManage={canManage} />
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
