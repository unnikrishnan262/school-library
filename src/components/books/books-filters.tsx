"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
}

interface BooksFiltersProps {
  categories: Category[];
}

export function BooksFilters({ categories }: BooksFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateSearch = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/books?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title, author, ISBN, accession number..."
          className="pl-9"
          defaultValue={searchParams.get("search") || ""}
          onChange={(e) => {
            const value = e.target.value;
            const timer = setTimeout(() => updateSearch("search", value), 400);
            return () => clearTimeout(timer);
          }}
        />
      </div>
      <Select
        defaultValue={searchParams.get("categoryId") || "all"}
        onValueChange={(v) => updateSearch("categoryId", v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        defaultValue={searchParams.get("type") || "all"}
        onValueChange={(v) => updateSearch("type", v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="BOOK">Book</SelectItem>
          <SelectItem value="TEXTBOOK">Textbook</SelectItem>
          <SelectItem value="REFERENCE">Reference</SelectItem>
          <SelectItem value="MAGAZINE">Magazine</SelectItem>
          <SelectItem value="DIGITAL">Digital</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
