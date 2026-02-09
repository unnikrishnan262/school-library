"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Toast, useToast } from "@/components/ui/toast";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  type: string;
  availableCopies: number;
  totalCopies: number;
  category: { name: string };
  _count: { copies: number };
}

interface BooksTableProps {
  books: Book[];
  canManage: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  BOOK: "Book",
  TEXTBOOK: "Textbook",
  REFERENCE: "Reference",
  MAGAZINE: "Magazine",
  DIGITAL: "Digital",
};

export function BooksTable({ books, canManage }: BooksTableProps) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) {
      showToast("Book deleted", "success");
      router.refresh();
    } else {
      const data = await res.json();
      showToast(data.error || "Delete failed", "error");
    }
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No books found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your search or add a new book.
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>ISBN</TableHead>
            <TableHead className="text-center">Copies</TableHead>
            <TableHead className="text-center">Available</TableHead>
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {books.map((book) => (
            <TableRow key={book.id}>
              <TableCell className="font-medium max-w-[200px] truncate">
                <Link href={`/books/${book.id}`} className="hover:underline">
                  {book.title}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{book.author}</TableCell>
              <TableCell>{book.category.name}</TableCell>
              <TableCell>
                <Badge variant="outline">{TYPE_LABELS[book.type] || book.type}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {book.isbn || "—"}
              </TableCell>
              <TableCell className="text-center">{book.totalCopies}</TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={
                    book.availableCopies === 0
                      ? "destructive"
                      : book.availableCopies < 3
                      ? "warning"
                      : "success"
                  }
                >
                  {book.availableCopies}
                </Badge>
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/books/${book.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/books/${book.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(book.id, book.title)}
                      disabled={deleting === book.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
