import Link from "next/link";
import { getServerSession } from "next-auth";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { BooksTable } from "@/components/books/books-table";
import { BooksFilters } from "@/components/books/books-filters";

interface SearchParams {
  search?: string;
  categoryId?: string;
  type?: string;
  page?: string;
}

async function getBooks(params: SearchParams) {
  const search = params.search || "";
  const categoryId = params.categoryId || "";
  const type = params.type || "";
  const page = parseInt(params.page || "1");
  const limit = 20;

  const where = {
    AND: [
      search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { author: { contains: search, mode: "insensitive" as const } },
              { isbn: { contains: search, mode: "insensitive" as const } },
              {
                copies: {
                  some: {
                    accessionNumber: { contains: search, mode: "insensitive" as const },
                  },
                },
              },
            ],
          }
        : {},
      categoryId ? { categoryId } : {},
      type ? { type: type as "BOOK" | "TEXTBOOK" | "REFERENCE" | "MAGAZINE" | "DIGITAL" } : {},
    ],
  };

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { copies: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.book.count({ where }),
  ]);

  return { books, total, page, limit };
}

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  const canManage = ["ADMIN", "LIBRARIAN"].includes(session?.user?.role || "");
  const params = await searchParams;
  const { books, total, page, limit } = await getBooks(params);
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Header title="Books" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} book{total !== 1 ? "s" : ""} in catalog
          </p>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/books/categories">Categories</Link>
              </Button>
              <Button asChild>
                <Link href="/books/new">
                  <Plus className="h-4 w-4 mr-2" /> Add Book
                </Link>
              </Button>
            </div>
          )}
        </div>

        <Suspense>
          <BooksFilters categories={categories} />
        </Suspense>

        <div className="rounded-lg border bg-card">
          <BooksTable books={books} canManage={canManage} />
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/books?page=${page - 1}`}>Previous</Link>
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/books?page=${page + 1}`}>Next</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
