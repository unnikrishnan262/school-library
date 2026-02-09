import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { BookForm } from "@/components/books/book-form";

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "LIBRARIAN"].includes(session?.user?.role || "")) {
    redirect("/books");
  }

  const { id } = await params;
  const [book, categories] = await Promise.all([
    prisma.book.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!book) notFound();

  return (
    <>
      <Header title={`Edit: ${book.title}`} />
      <div className="p-6 max-w-4xl">
        <BookForm
          categories={categories}
          mode="edit"
          initialData={{
            id: book.id,
            title: book.title,
            author: book.author,
            isbn: book.isbn ?? undefined,
            publisher: book.publisher ?? undefined,
            edition: book.edition ?? undefined,
            year: book.year,
            categoryId: book.categoryId,
            language: book.language,
            type: book.type,
            description: book.description ?? undefined,
          }}
        />
      </div>
    </>
  );
}
