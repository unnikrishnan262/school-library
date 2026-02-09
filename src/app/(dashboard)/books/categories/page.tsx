import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { CategoriesManager } from "@/components/books/categories-manager";

export default async function CategoriesPage() {
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "LIBRARIAN"].includes(session?.user?.role || "")) {
    redirect("/books");
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { books: true } } },
  });

  return (
    <>
      <Header title="Categories" />
      <div className="p-6 max-w-3xl">
        <CategoriesManager initialCategories={categories} />
      </div>
    </>
  );
}
